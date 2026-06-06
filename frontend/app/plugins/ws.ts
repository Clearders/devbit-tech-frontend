/**
 * WebSocket initialization plugin.
 * Connects to the WebSocket server on client-side startup
 * and reconnects when the user logs in/out.
 */
export default defineNuxtPlugin(() => {
  const { status: authStatus, isAuthenticated } = useAuth()
  const { connect, disconnect } = useWebSocket()

  // Connect on client startup
  if (import.meta.client) {
    connect()
  }

  // Reconnect when auth state changes (new token after login)
  watch(isAuthenticated, (newVal) => {
    if (newVal) {
      // Reconnect with fresh auth token
      disconnect()
      nextTick(() => connect())
    }
  })
})
