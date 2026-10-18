import { ApiFault } from '~/utils/apiError'
export function useAccountRecovery() {
  const mode = useRuntimeConfig().public.accountRecoveryMode
  const enabled = mode === 'v2' || (mode === 'mock' && import.meta.dev)
  const { apiFetch } = useApiFetch()
  const check = () => { if (!enabled) throw new ApiFault('FEATURE_NOT_READY', '账号恢复尚未适配') }
  return {
    enabled, mock: mode === 'mock' && import.meta.dev,
    async sendCode(email: string): Promise<{ message: string; expiresInSeconds: number; retryAfterSeconds: number; developmentCode?: string }> {
      check()
      if (mode === 'mock') return { message: '演示验证码已生成', expiresInSeconds: 600, retryAfterSeconds: 60, developmentCode: '123456' }
      return apiFetch('/v2/account/password-reset/code', { method: 'POST', body: { email: email.trim() } })
    },
    async confirm(email: string, code: string, password: string): Promise<void> {
      check()
      if (mode === 'mock') { if (code !== '123456') throw new ApiFault('INVALID_CODE', '验证码无效', 400); return }
      await apiFetch('/v2/account/password-reset/confirm', { method: 'POST', body: { email: email.trim(), code: code.trim(), password } })
    },
  }
}
