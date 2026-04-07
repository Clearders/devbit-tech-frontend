import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

interface User {
  id: number
  name: string
  email: string
}

interface RegisterPayload {
  name: string
  email: string
  password: string
  code: string
  confirm_password: string
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const authApi = $fetch.create({
    baseURL: config.public.apiBase as string,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json'
    },
    timeout: 10000,
    retry: 0
  })

  const token = useCookie<string | null>('auth_token', {
    default: () => null,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })
  const user = useState<User | null>('auth_user', () => null)
  const isAuthenticated = computed(() => !!token.value)

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi<{ token: string; user?: User }>('/api/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password
        }
      })

      token.value = data.token
      if (data.user) {
        user.value = data.user
      }

      await navigateTo('/')
    } catch (error: unknown) {
      throw createError({
        statusCode: 401,
        statusMessage: extractApiErrorMessage(error, 'Login failed. Please check your email and password.')
      })
    }
  }

  const sendVerificationCode = async ({ email }: { email: string }) => {
    try {
      await authApi('/api/register/send_code', {
        method: 'POST',
        body: {
          email: email.trim()
        }
      })
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: extractApiErrorMessage(error, 'Failed to send verification code. Please try again.')
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
      await authApi('/api/register', {
        method: 'POST',
        body: normalizedPayload
      })
      await navigateTo('/login')
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: extractApiErrorMessage(error, 'Registration failed. Please verify your information and try again.')
      })
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isAuthenticated, login, sendVerificationCode, register, logout }
}
