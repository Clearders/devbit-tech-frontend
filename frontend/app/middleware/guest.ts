export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, syncCurrentUser } = useAuth()
  await syncCurrentUser()

  if (isAuthenticated.value) {
    return navigateTo('/')
  }
})
