/**
 * WebSocket client composable — singleton connection shared across the app.
 *
 * Features:
 *  - Auto-reconnect with exponential backoff (1s → 30s max)
 *  - Heartbeat: responds to server pings, detects stale connections
 *  - Event system: on() / off() pattern for typed server messages
 *  - Auth: uses the HttpOnly session cookie during the upgrade request
 *  - Connection state tracking via useState
 */

// ── Server message types ────────────────────────────────────────────────────

export interface WsNewMessagePayload {
  message_id: number
  sender_id: number
  sender_name: string
  content_preview: string
}

interface WsPresencePayload {
  user_id: number
}

export interface WsEventMap {
  pong: Record<string, never>
  auth_ok: WsPresencePayload
  auth_error: { reason: string }
  new_message: WsNewMessagePayload
  user_online: WsPresencePayload
  user_offline: WsPresencePayload
  subscribed: { channel: string }
  notification: Record<string, unknown>
}

export type WsEventType = keyof WsEventMap

export type WsServerMessage =
  | { type: 'pong' }
  | ({ type: 'auth_ok' } & WsPresencePayload)
  | { type: 'auth_error'; reason: string }
  | ({ type: 'new_message' } & WsNewMessagePayload)
  | ({ type: 'user_online' } & WsPresencePayload)
  | ({ type: 'user_offline' } & WsPresencePayload)
  | { type: 'subscribed'; channel: string }
  | ({ type: 'notification' } & Record<string, unknown>)

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

type MessageHandler<T extends WsEventType> = (payload: WsEventMap[T]) => void
type AnyMessageHandler = (payload: unknown) => void

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isWsServerMessage(value: unknown): value is WsServerMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false

  switch (value.type) {
    case 'pong':
    case 'notification':
      return true
    case 'auth_ok':
    case 'user_online':
    case 'user_offline':
      return typeof value.user_id === 'number'
    case 'auth_error':
      return typeof value.reason === 'string'
    case 'subscribed':
      return typeof value.channel === 'string'
    case 'new_message':
      return typeof value.message_id === 'number'
        && typeof value.sender_id === 'number'
        && typeof value.sender_name === 'string'
        && typeof value.content_preview === 'string'
    default:
      return false
  }
}

// ── Singleton state ─────────────────────────────────────────────────────────

const useWebSocketState = () => {
  const config = useRuntimeConfig()
  const status = useState<WsConnectionStatus>('ws_status', () => 'disconnected')
  const onlineUsers = useState<Set<number>>('ws_online_users', () => new Set())

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectAttempts = 0
  let shouldConnect = false
  const maxReconnectDelay = 30000 // 30s max
  const handlers = new Map<WsEventType, Set<AnyMessageHandler>>()

  function getWsUrl(): string {
    if (import.meta.server) return ''
    const configuredUrl = config.public.wsUrl as string
    if (configuredUrl) {
      const url = new URL(configuredUrl, window.location.origin)
      const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]'])
      if (import.meta.dev && loopbackHosts.has(url.hostname)) {
        // Cookies are host-scoped (but not port-scoped), so keep the browser's
        // development hostname when Nuxt itself is reached via localhost/LAN.
        url.hostname = window.location.hostname
      }
      return url.toString()
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/api/ws`
  }

  function getReconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay)
    return delay
  }

  function emit<T extends WsEventType>(type: T, payload: WsEventMap[T]) {
    const hs = handlers.get(type)
    if (hs) {
      hs.forEach(handler => handler(payload))
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    // Send ping every 25 seconds (server timeout is 30s)
    heartbeatTimer = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function scheduleReconnect() {
    if (!shouldConnect || reconnectTimer) return
    status.value = 'reconnecting'
    const delay = getReconnectDelay()
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    if (import.meta.server) return
    shouldConnect = true

    // Don't reconnect if already connected or connecting
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
      return
    }

    status.value = reconnectAttempts > 0 ? 'reconnecting' : 'connecting'

    try {
      socket = new WebSocket(getWsUrl())
    } catch {
      scheduleReconnect()
      return
    }

    const currentSocket = socket

    currentSocket.onopen = () => {
      if (socket !== currentSocket || !shouldConnect) return
      startHeartbeat()
    }

    currentSocket.onmessage = (event) => {
      if (socket !== currentSocket || !shouldConnect) return
      try {
        const parsed: unknown = JSON.parse(event.data)
        if (!isWsServerMessage(parsed)) return
        const msg = parsed

        switch (msg.type) {
          case 'pong':
            // Heartbeat response — connection is healthy
            emit('pong', {})
            break
          case 'auth_ok':
            reconnectAttempts = 0
            status.value = 'connected'
            emit('auth_ok', { user_id: msg.user_id })
            break
          case 'auth_error':
            emit('auth_error', { reason: msg.reason })
            break
          case 'new_message':
            emit('new_message', {
              message_id: msg.message_id,
              sender_id: msg.sender_id,
              sender_name: msg.sender_name,
              content_preview: msg.content_preview,
            })
            break
          case 'user_online':
            onlineUsers.value = new Set([...onlineUsers.value, msg.user_id])
            emit('user_online', { user_id: msg.user_id })
            break
          case 'user_offline':
            const updated = new Set(onlineUsers.value)
            updated.delete(msg.user_id)
            onlineUsers.value = updated
            emit('user_offline', { user_id: msg.user_id })
            break
          case 'subscribed':
            emit('subscribed', { channel: msg.channel })
            break
          case 'notification': {
            const { type: _type, ...payload } = msg
            emit('notification', payload)
            break
          }
        }
      } catch {
        // Ignore malformed messages
      }
    }

    currentSocket.onclose = () => {
      if (socket !== currentSocket) return
      socket = null
      stopHeartbeat()
      status.value = 'disconnected'
      onlineUsers.value = new Set()
      scheduleReconnect()
    }

    currentSocket.onerror = () => {
      // onclose will fire after onerror, handle reconnection there
    }
  }

  function disconnect() {
    shouldConnect = false
    stopHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket) {
      const currentSocket = socket
      socket = null
      currentSocket.close(1000, 'Client disconnect')
    }
    status.value = 'disconnected'
    onlineUsers.value = new Set()
  }

  function send(data: Record<string, unknown>) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data))
    }
  }

  function on<T extends WsEventType>(type: T, handler: MessageHandler<T>) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set())
    }
    const registeredHandler = handler as AnyMessageHandler
    handlers.get(type)!.add(registeredHandler)

    // Return unsubscribe function
    return () => {
      handlers.get(type)?.delete(registeredHandler)
    }
  }

  function off<T extends WsEventType>(type: T, handler: MessageHandler<T>) {
    handlers.get(type)?.delete(handler as AnyMessageHandler)
  }

  return {
    status,
    onlineUsers,
    connect,
    disconnect,
    send,
    on,
    off,
  }
}

// ── Global singleton ────────────────────────────────────────────────────────

let wsInstance: ReturnType<typeof useWebSocketState> | null = null

export const useWebSocket = () => {
  if (!wsInstance) {
    wsInstance = useWebSocketState()
  }
  return wsInstance
}
