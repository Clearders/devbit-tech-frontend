export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface LoginResponse {
  user: AuthUser
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  code: string
  confirm_password: string
}

export interface SendCodeResponse {
  message: string
  expiresInSeconds: number
}
