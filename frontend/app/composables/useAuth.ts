import type {
  AuthUser,
  LoginResponse,
  RegisterPayload,
  SendCodeResponse
} from '~~/shared/auth'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

export const useAuth = () => {
  const config = useRuntimeConfig()
  const token = useCookie<string | null>('auth_token', {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 6
  })
  const user = useState<AuthUser | null>('auth_user', () => null)
  const pendingMe = useState<Promise<AuthUser | null> | null>('auth_me_pending', () => null)
  const isAuthenticated = computed(() => !!token.value)

  const authApi = $fetch.create({
    baseURL: config.public.apiBase as string,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    timeout: 10000,
    retry: 0,
    onRequest({ options }) {
      if (token.value) {
        options.headers = new Headers(options.headers as HeadersInit)
        options.headers.set('authorization', `Bearer ${token.value}`)
      }
    }
  })

  const syncCurrentUser = async () => {
    if (!token.value) {
      user.value = null
      return null
    }
    if (pendingMe.value) {
      return pendingMe.value
    }

    pendingMe.value = authApi<AuthUser>('/me')
      .then((me) => {
        user.value = me
        return me
      })
      .catch(() => {
        token.value = null
        user.value = null
        return null
      })
      .finally(() => {
        pendingMe.value = null
      })

    return pendingMe.value
  }

  if (token.value && !user.value && import.meta.client) {
    void syncCurrentUser()
  }

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi<LoginResponse>('/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password
        }
      })

      token.value = data.token
      user.value = data.user
      await navigateTo('/')
    } catch (error: unknown) {
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
      return await authApi<SendCodeResponse>('/register/send_code', {
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
      await authApi('/register', {
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

  const logout = () => {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return {
    token,
    user,
    isAuthenticated,
    syncCurrentUser,
    login,
    sendVerificationCode,
    register,
    logout
  }
}
