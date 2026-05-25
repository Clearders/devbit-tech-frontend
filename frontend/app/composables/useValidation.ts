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
    if (!email) return 'Email is required.'
    if (!isValidEmail(email)) return 'Please enter a valid email address.'
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required.'
    if (!isValidPassword(password))
      return 'Password must be at least 8 characters and include letters and numbers.'
    return ''
  }

  const validateCode = (code: string): string => {
    if (!code.trim()) return 'Email verification code is required.'
    if (!isValidCode(code)) return 'Please enter a valid verification code.'
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
