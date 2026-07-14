export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, syncCurrentUser } = useAuth()
  try {
    await syncCurrentUser()
  } catch (error) {
    // During SSR/prerender the API may be deployed separately. Treat an
    // unavailable session service as anonymous there; surface it on the client.
    if (import.meta.client) throw error
    return navigateTo('/login')
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
