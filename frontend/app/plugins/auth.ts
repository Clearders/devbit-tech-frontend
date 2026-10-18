export default defineNuxtPlugin(async () => {
  const { status, user, syncCurrentUser } = useAuth()
  if (import.meta.dev && useRuntimeConfig().public.socialMode === 'mock') {
    const path = useRequestURL().pathname
    const preview = path === '/dev-preview' || path === '/friends' || path === '/messages' || path.startsWith('/messages/')
    user.value = preview ? { id: 1000, name: '开发预览', email: 'preview@example.test', isAdmin: false } : null
    status.value = preview ? 'authenticated' : 'anonymous'
    return
  }
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
