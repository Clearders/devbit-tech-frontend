/**
 * Shared API fetch wrapper — used by useAuth and useForumApi.
 * Avoids duplicating header setup, base URL, and error handling.
 */

type ApiOptions = Parameters<typeof $fetch>[1]

export const useApiFetch = () => {
  const config = useRuntimeConfig()

  const apiFetch = <T>(path: string, options: ApiOptions = {}) => {
    const headers = new Headers(options.headers as HeadersInit | undefined)
    if (!headers.has('accept')) {
      headers.set('accept', 'application/json')
    }
    // Don't set content-type for FormData — browser sets it with boundary
    const isFormData = options.body instanceof FormData
    if (!isFormData && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }

    const requestFetch = import.meta.server ? useRequestFetch() : $fetch
    return requestFetch<T>(path, {
      ...options,
      baseURL: config.public.apiBase as string,
      credentials: 'same-origin',
      headers,
      retry: 0,
      timeout: 10000,
    })
  }

  return { apiFetch }
}
