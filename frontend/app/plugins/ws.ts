/**
 * WebSocket initialization plugin.
 * Connects after authentication resolves and disconnects on logout.
 */
export default defineNuxtPlugin(() => {
  const { isAuthenticated } = useAuth()
  const { connect, disconnect } = useWebSocket()

  // Keep the socket alive only while the resolved session is authenticated.
  // The browser supplies the HttpOnly cookie during the WebSocket upgrade.
  watch(isAuthenticated, (newVal) => {
    if (newVal) {
      nextTick(() => connect())
    } else {
      disconnect()
    }
  }, { immediate: true })
})
