import type {
  AuthUser,
  LoginResponse,
  RegisterPayload,
  SendCodeResponse
} from '~~/shared/auth'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'
type RegisterFormInput = RegisterPayload & { confirmPassword: string }

// A Nuxt app is request-scoped during SSR and singleton-scoped in the browser.
// Keeping the in-flight request here deduplicates callers without attempting to
// serialize a Promise into the Nuxt payload.
const pendingCurrentUserRequests = new WeakMap<object, Promise<AuthUser | null>>()

const getHttpStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  return candidate.response?.status ?? candidate.statusCode ?? candidate.status
}

export const useAuth = () => {
  const nuxtApp = useNuxtApp()
  const { apiFetch } = useApiFetch()
  const user = useState<AuthUser | null>('auth_user', () => null)
  const status = useState<AuthStatus>('auth_status', () => 'idle')
  const isAuthenticated = computed(() => status.value === 'authenticated' && !!user.value)
  const isResolving = computed(() => status.value === 'idle' || status.value === 'loading')

  const syncCurrentUser = async (force = false) => {
    if (!force) {
      if (status.value === 'authenticated' && user.value) {
        return user.value
      }
      if (status.value === 'anonymous') {
        return null
      }
    }
    const pendingRequest = pendingCurrentUserRequests.get(nuxtApp)
    if (pendingRequest) {
      return pendingRequest
    }

    const previousUser = user.value
    const previousStatus = status.value
    status.value = 'loading'
    const request = apiFetch<AuthUser | null>('/me')
      .then((me) => {
        user.value = me ?? null
        status.value = me ? 'authenticated' : 'anonymous'
        return me
      })
      .catch((error: unknown) => {
        if (getHttpStatus(error) === 401) {
          user.value = null
          status.value = 'anonymous'
          return null
        }

        user.value = previousUser
        status.value = previousStatus === 'authenticated' && previousUser
          ? 'authenticated'
          : 'idle'
        throw error
      })

    pendingCurrentUserRequests.set(nuxtApp, request)
    const clearPendingRequest = () => {
      if (pendingCurrentUserRequests.get(nuxtApp) === request) {
        pendingCurrentUserRequests.delete(nuxtApp)
      }
    }
    void request.then(clearPendingRequest, clearPendingRequest)
    return request
  }

  // Note: initial auth check is handled by the auth plugin (plugins/auth.ts)

  const login = async (email: string, password: string) => {
    try {
      const data = await apiFetch<LoginResponse>('/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password
        }
      })

      user.value = data.user
      status.value = 'authenticated'
      await navigateTo('/')
    } catch (error: unknown) {
      user.value = null
      status.value = 'anonymous'
      throw createError({
        statusCode: 401,
        statusMessage: extractApiErrorMessage(
          error,
          'Login failed. Please check your email and password.'
        )
      })
    }
  }

  const sendVerificationCode = async ({ email }: { email: string }) => {
    try {
      return await apiFetch<SendCodeResponse>('/register/send_code', {
        method: 'POST',
        body: {
          email: email.trim()
        }
      })
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: extractApiErrorMessage(
          error,
          'Failed to send verification code. Please try again.'
        )
      })
    }
  }

  const register = async (payload: RegisterFormInput) => {
    if (payload.password !== payload.confirmPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Passwords do not match.'
      })
    }

    const normalizedPayload: RegisterPayload = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
      code: payload.code.trim(),
    }

    try {
      await apiFetch('/register', {
        method: 'POST',
        body: normalizedPayload
      })
      await navigateTo('/login')
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: extractApiErrorMessage(
          error,
          'Registration failed. Please verify your information and try again.'
        )
      })
    }
  }

  const logout = async () => {
    try {
      await apiFetch('/logout', { method: 'POST' })
    } finally {
      user.value = null
      status.value = 'anonymous'
      await navigateTo('/login')
    }
  }

  return {
    user,
    status,
    isAuthenticated,
    isResolving,
    syncCurrentUser,
    login,
    sendVerificationCode,
    register,
    logout
  }
}
