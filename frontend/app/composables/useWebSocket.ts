/**
 * WebSocket client composable — singleton connection shared across the app.
 *
 * Features:
 *  - Auto-reconnect with exponential backoff (1s → 30s max)
 *  - Heartbeat: responds to server pings, detects stale connections
 *  - Event system: on() / off() pattern for typed server messages
 *  - Auth: sends JWT token from cookie on connect
 *  - Connection state tracking via useState
 */

import type { AuthUser } from '~~/shared/auth'

// ── Server message types ────────────────────────────────────────────────────

export interface WsServerMessage {
  type: 'pong'
    | 'auth_ok'
    | 'auth_error'
    | 'new_message'
    | 'user_online'
    | 'user_offline'
    | 'notification'
  [key: string]: unknown
}

export interface WsNewMessagePayload {
  message_id: number
  sender_id: number
  sender_name: string
  content_preview: string
}

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

type MessageHandler = (payload: Record<string, unknown>) => void

// ── Singleton state ─────────────────────────────────────────────────────────

const useWebSocketState = () => {
  const config = useRuntimeConfig()
  const status = useState<WsConnectionStatus>('ws_status', () => 'disconnected')
  const onlineUsers = useState<Set<number>>('ws_online_users', () => new Set())

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectAttempts = 0
  const maxReconnectDelay = 30000 // 30s max
  const handlers = new Map<string, Set<MessageHandler>>()

  function getWsUrl(): string {
    if (import.meta.server) return ''
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/ws`
  }

  function getReconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay)
    return delay
  }

  function emit(type: string, payload: Record<string, unknown> = {}) {
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
    if (reconnectTimer) return
    status.value = 'reconnecting'
    const delay = getReconnectDelay()
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    if (import.meta.server) return

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

    socket.onopen = () => {
      reconnectAttempts = 0
      status.value = 'connected'
      startHeartbeat()

      // Authenticate: read token from cookie
      const token = getAuthTokenFromCookie()
      if (token) {
        socket!.send(JSON.stringify({ type: 'auth', token }))
      }
    }

    socket.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data)
        const { type, ...payload } = msg

        switch (type) {
          case 'pong':
            // Heartbeat response — connection is healthy
            break
          case 'auth_ok':
            emit('auth_ok', payload)
            break
          case 'auth_error':
            emit('auth_error', payload)
            break
          case 'new_message':
            emit('new_message', payload)
            break
          case 'user_online':
            onlineUsers.value = new Set([...onlineUsers.value, payload.user_id as number])
            emit('user_online', payload)
            break
          case 'user_offline':
            const updated = new Set(onlineUsers.value)
            updated.delete(payload.user_id as number)
            onlineUsers.value = updated
            emit('user_offline', payload)
            break
          case 'notification':
            emit('notification', payload)
            break
          default:
            // Forward unknown message types to their handler
            emit(type, payload)
        }
      } catch {
        // Ignore malformed messages
      }
    }

    socket.onclose = (event) => {
      stopHeartbeat()
      status.value = 'disconnected'

      // Don't reconnect if closed cleanly by client
      if (event.code === 1000) return

      scheduleReconnect()
    }

    socket.onerror = () => {
      // onclose will fire after onerror, handle reconnection there
    }
  }

  function disconnect() {
    stopHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket) {
      socket.close(1000, 'Client disconnect')
      socket = null
    }
    status.value = 'disconnected'
  }

  function send(data: Record<string, unknown>) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data))
    }
  }

  function on(type: string, handler: MessageHandler) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set())
    }
    handlers.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      handlers.get(type)?.delete(handler)
    }
  }

  function off(type: string, handler: MessageHandler) {
    handlers.get(type)?.delete(handler)
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

// ── Helper: read auth_token from document cookies ───────────────────────────

function getAuthTokenFromCookie(): string | null {
  if (!import.meta.client) return null
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
  return match ? match[1] : null
}

// ── Global singleton ────────────────────────────────────────────────────────

let wsInstance: ReturnType<typeof useWebSocketState> | null = null

export const useWebSocket = () => {
  if (!wsInstance) {
    wsInstance = useWebSocketState()
  }
  return wsInstance
}
