export class ApiFault extends Error {
  constructor(public code: string, message: string, public status?: number) {
    super(message)
    this.name = 'ApiFault'
  }
}

export function getHttpStatus(error: unknown): number | undefined {
  const e = error as { status?: number; statusCode?: number; response?: { status?: number } } | undefined
  return e?.response?.status ?? e?.statusCode ?? e?.status
}

export function applyApiFieldErrors<T extends Record<string, string>>(error: unknown, fields: T): boolean {
  const body = (error as { data?: { error?: { fieldErrors?: Record<string, unknown> } } })?.data?.error?.fieldErrors
  if (!body || typeof body !== 'object') return false
  let applied = false
  for (const key of Object.keys(fields)) {
    if (typeof body[key] === 'string' && body[key]) { fields[key as keyof T] = body[key] as T[keyof T]; applied = true }
  }
  return applied
}

const messages: Record<string, string> = {
  FEATURE_NOT_READY: '此功能暂未开放，请稍后再来。',
  RELATIONSHIP_CHANGED: '好友关系已变化，请刷新后重试。',
  REQUEST_NOT_PENDING: '这条申请已经处理，请刷新列表。',
  RATE_LIMITED: '操作过于频繁，请稍后再试。',
  FORBIDDEN: '当前关系或隐私设置不允许此操作。',
  USER_NOT_FOUND: '该用户已不存在，请刷新列表。',
  BAD_RESPONSE: '服务返回的数据暂时无法使用，请稍后重试。',
  INVALID_CODE: '验证码不正确或已过期，请重新获取。',
}

export function apiErrorMessage(error: unknown, fallback = '操作未完成，请稍后重试。'): string {
  const e = error as { code?: string; data?: { error?: { code?: string; message?: string } | string; code?: string }; name?: string }
  const code = e?.code ?? (typeof e?.data?.error === 'object' ? e.data.error.code : e?.data?.code)
  if (code && messages[code]) return messages[code]
  const status = getHttpStatus(error)
  if (status === 401) return '登录状态已过期，请重新登录。'
  if (status === 403) return messages.FORBIDDEN!
  if (status === 404) return '内容已不存在，请刷新后重试。'
  if (status === 409) return messages.RELATIONSHIP_CHANGED!
  if (status === 429) return messages.RATE_LIMITED!
  if (status && status >= 500) return '服务暂时不可用，请稍后重试。'
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError' || (!status && error instanceof Error)) return '暂时无法连接，请检查网络后重试。'
  return fallback
}

export function resolveSocialMode(value: unknown, development: boolean): 'legacy' | 'v2' | 'mock' {
  if (!['legacy', 'v2', 'mock'].includes(String(value))) throw new ApiFault('BAD_CONFIGURATION', '无效的社交数据模式')
  if (value === 'mock' && !development) throw new ApiFault('FEATURE_NOT_READY', 'Mock 仅用于本地开发')
  return value as 'legacy' | 'v2' | 'mock'
}

export const isEnabled = (value: unknown) => value === true || value === 'true'
