export default defineNuxtPlugin(async () => {
  const { syncCurrentUser } = useAuth()
  await syncCurrentUser()
})
