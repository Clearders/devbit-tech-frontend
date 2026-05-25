import type {
  AuthUser,
  LoginResponse,
  RegisterPayload,
  SendCodeResponse
} from '~~/shared/auth'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export const useAuth = () => {
  const { apiFetch } = useApiFetch()
  const user = useState<AuthUser | null>('auth_user', () => null)
  const status = useState<AuthStatus>('auth_status', () => 'idle')
  const pendingMe = useState<Promise<AuthUser | null> | null>('auth_me_pending', () => null)
  const isAuthenticated = computed(() => status.value === 'authenticated' && !!user.value)
  const isResolving = computed(() => status.value === 'idle' || status.value === 'loading')

  const syncCurrentUser = async (force = false) => {
    if (!force && status.value === 'authenticated' && user.value) {
      return user.value
    }
    if (pendingMe.value) {
      return pendingMe.value
    }

    status.value = 'loading'
    pendingMe.value = apiFetch<AuthUser | null>('/me')
      .then((me) => {
        user.value = me ?? null
        status.value = me ? 'authenticated' : 'anonymous'
        return me
      })
      .catch(() => {
        user.value = null
        status.value = 'anonymous'
        return null
      })
      .finally(() => {
        pendingMe.value = null
      })

    return pendingMe.value
  }

  if (import.meta.client && status.value === 'idle') {
    void syncCurrentUser()
  }

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

  const register = async (payload: RegisterPayload) => {
    const normalizedPayload: RegisterPayload = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
      code: payload.code.trim(),
      confirm_password: payload.confirm_password
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
