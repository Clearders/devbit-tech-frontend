/**
 * Shared form validation rules — used by login and register pages.
 * Avoids duplicating regex patterns and validation messages.
 */

export const useValidation = () => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/
  const CODE_REGEX = /^\d{4,8}$/

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email)
  const isValidPassword = (password: string) => PASSWORD_REGEX.test(password)
  const isValidCode = (code: string) => CODE_REGEX.test(code.trim())

  const validateEmail = (email: string): string => {
    if (!email) return '请输入邮箱。'
    if (!isValidEmail(email)) return '请输入有效的邮箱地址。'
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return '请输入密码。'
    if (!isValidPassword(password))
      return '密码至少 8 位，且包含字母和数字。'
    return ''
  }

  const validateCode = (code: string): string => {
    if (!code.trim()) return '请输入邮箱验证码。'
    if (!isValidCode(code)) return '请输入 4–8 位数字验证码。'
    return ''
  }

  return {
    EMAIL_REGEX,
    PASSWORD_REGEX,
    CODE_REGEX,
    isValidEmail,
    isValidPassword,
    isValidCode,
    validateEmail,
    validatePassword,
    validateCode,
  }
}
