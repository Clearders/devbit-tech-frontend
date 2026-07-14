export default defineNuxtPlugin(async () => {
  const { status, syncCurrentUser } = useAuth()
  // Anonymous state from SSR (especially prerendered pages) cannot prove that
  // the browser has no session cookie, so revalidate it once after hydration.
  const revalidateHydratedAnonymous = import.meta.client && status.value === 'anonymous'
  try {
    await syncCurrentUser(revalidateHydratedAnonymous)
  } catch {
    // Keep public routes usable during a transient API outage. Protected route
    // middleware will retry because the auth state was restored to `idle`.
  }
})
