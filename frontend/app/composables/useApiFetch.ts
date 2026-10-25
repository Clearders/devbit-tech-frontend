import type { AnyServerRouteMethod, TypedFetchOptions } from 'nuxt/app'
import { ApiFault } from '~/utils/apiError'
/**
 * Shared API fetch wrapper — used by useAuth and useForumApi.
 * Avoids duplicating header setup, base URL, and error handling.
 */

// The Rust API accepts dynamic paths and all HTTP methods, outside Nuxt's route schema.
type ApiOptions = TypedFetchOptions<string, AnyServerRouteMethod>

export const useApiFetch = () => {
  const config = useRuntimeConfig()

  const apiFetch = <T>(path: string, options: ApiOptions = {}) => {
    if (config.public.socialMode === 'mock' && !import.meta.dev) throw new ApiFault('FEATURE_NOT_READY', 'Mock 仅用于开发')
    if (config.public.socialMode === 'mock' && options.method && String(options.method).toUpperCase() !== 'GET') throw new ApiFault('FEATURE_NOT_READY', '本地演示不调用真实写接口')
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
    return requestFetch<T, string, AnyServerRouteMethod>(path, {
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
