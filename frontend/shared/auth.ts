export interface AuthUser {
  id: number
  name: string
  email: string
  avatarUrl?: string
  isAdmin: boolean
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  code: string
}

export interface SendCodeResponse {
  message: string
  expiresInSeconds: number
  developmentCode?: string
}
