interface User {
  id: number
  name: string
  email: string
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

  const pickErrorMessage = (error: unknown, fallback: string) => {
    const e = error as {
      data?: { message?: string; error?: string }
      statusMessage?: string
      message?: string
    }
    return e?.data?.message ?? e?.data?.error ?? e?.statusMessage ?? e?.message ?? fallback
  }

  const authRequest = <T>(path: string, body: Record<string, string>) =>
    authApi<T>(path, {
      method: 'POST',
      body
    })

  const login = async (email: string, password: string) => {
    const data = await authRequest<{ token: string; user?: User }>('/login', {
      email: email.trim(),
      password
    })
    token.value = data.token
    if (import.meta.client) {
      localStorage.setItem('token', data.token)
    }
    if (data.user) {
      user.value = data.user
    }
    await navigateTo('/')
  }

  const sendEmailCode = async (email: string) => {
    const normalizedEmail = email.trim()

    try {
      await authApi('/register/send_code', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain'
        },
        body: normalizedEmail
      })
      return
    } catch (error: unknown) {
      try {
        await authRequest('/email/code', {
          email: normalizedEmail
        })
      } catch (fallbackError: unknown) {
        throw createError({
          statusCode: 400,
          statusMessage: pickErrorMessage(fallbackError ?? error, 'Failed to send verification code.')
        })
      }
    }
  }

  // useAuth.ts - register 方法修正
  const register = async (
      name: string,
      email: string,
      password: string,
      code: string,
      confirm_password: string) => {
    try {
      await $fetch<{ status_code: number; name: string; email: string; id: number }>('/api/register', {
        baseURL: config.public.apiBaseUrl as string,
        method: 'POST',
        body: { name, email, password, code, confirm_password }
      })
      await navigateTo('/login')
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: pickErrorMessage(error, 'Registration failed.')
      })
    }
  }

  // useAuth.ts 中新增
  const sendVerificationCode = async (email: string) => {
    await $fetch('/api/register/send_code', {
      baseURL: config.public.apiBaseUrl as string,
      method: 'POST',
      body: { email }
    })
  }

  const logout = () => {
    token.value = null
    if (import.meta.client) {
      localStorage.removeItem('token')
    }
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isAuthenticated, login, sendEmailCode, sendVerificationCode, register, logout }
}
