/**
 * Browser-only WebSocket initialization.
 * Keeps the connection aligned with the resolved authentication state.
 */
export default defineNuxtPlugin(() => {
  if (useRuntimeConfig().public.socialMode === 'mock') return
  const { isAuthenticated } = useAuth()
  const { connect, disconnect } = useWebSocket()

  watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
      nextTick(() => connect())
    } else {
      disconnect()
    }
  }, { immediate: true })
})
