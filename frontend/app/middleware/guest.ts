export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, syncCurrentUser } = useAuth()
  try {
    await syncCurrentUser()
  } catch {
    // Login and registration must remain available during a transient API
    // outage; auth remains `idle` so a later navigation will retry.
    return
  }

  if (isAuthenticated.value) {
    return navigateTo('/')
  }
})
