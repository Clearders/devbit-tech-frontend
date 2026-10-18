<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import { apiErrorMessage, applyApiFieldErrors } from '~/utils/apiError'
useSeoMeta({ title: '找回密码 – DevBit Tech' })
const recovery = useAccountRecovery()
const { validateEmail, validatePassword, validateCode } = useValidation()
const { remaining, start } = useCountdown()
const form = reactive({ email: '', code: '', password: '', confirm: '' })
const errors = reactive({ email: '', code: '', password: '', confirm: '' })
const busy = ref(false), sending = ref(false), success = ref(false), error = ref(''), message = ref('')
const focusError = () => nextTick(() => document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus())
watch(form, () => {
  if (errors.email) errors.email = validateEmail(form.email)
  if (errors.code) errors.code = validateCode(form.code)
  if (errors.password) errors.password = validatePassword(form.password)
  if (errors.confirm) errors.confirm = form.password === form.confirm ? '' : '两次输入的密码不一致。'
})
watch(() => form.email, () => { message.value = '' })
async function send() {
  if (sending.value || remaining.value || !recovery.enabled) return
  errors.email = validateEmail(form.email)
  if (errors.email) { focusError(); return }
  sending.value = true; error.value = ''
  try { const result = await recovery.sendCode(form.email); start(result.retryAfterSeconds); message.value = result.developmentCode ? `本地演示验证码：${result.developmentCode}` : result.message }
  catch (e) { error.value = apiErrorMessage(e, '验证码发送失败，请重试。'); if (applyApiFieldErrors(e, errors)) await focusError() }
  finally { sending.value = false }
}
async function submit() {
  if (busy.value || !recovery.enabled) return
  errors.email = validateEmail(form.email); errors.code = validateCode(form.code); errors.password = validatePassword(form.password); errors.confirm = form.password !== form.confirm ? '两次输入的密码不一致。' : !form.confirm ? '请再次输入密码。' : ''
  if (Object.values(errors).some(Boolean)) { focusError(); return }
  busy.value = true; error.value = ''
  try { await recovery.confirm(form.email, form.code, form.password); success.value = true; form.password = ''; form.confirm = '' }
  catch (e) { error.value = apiErrorMessage(e, '密码重置失败，请检查验证码。'); if (applyApiFieldErrors(e, errors)) await focusError() }
  finally { busy.value = false }
}
</script>
<template>
  <div class="inner-page auth-page"><div class="container"><div class="auth-card">
    <h1 class="auth-card__title"><KeyRound :size="28" aria-hidden="true" />找回密码</h1>
    <p class="auth-card__subtitle">通过邮箱验证码重新设置密码。</p>
    <div v-if="!recovery.enabled" class="feature-notice" role="status">账号恢复暂未开放。开放后，你可以通过邮箱验证码找回账号。</div>
    <div v-else-if="success" role="status"><p>密码已重新设置，请使用新密码登录。</p><NuxtLink to="/login" class="btn btn--primary">返回登录</NuxtLink></div>
    <form v-else class="auth-form" novalidate @submit.prevent="submit">
      <div v-if="error" role="alert" class="form-error form-error--global">{{ error }}</div><p v-if="message" role="status" class="form-success">{{ message }}</p>
      <div class="form-group"><label for="recovery-email" class="form-label">邮箱</label><input id="recovery-email" v-model="form.email" class="form-control" type="email" autocomplete="email" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'recovery-email-error' : undefined" @input="errors.email && (errors.email = validateEmail(form.email))"><span v-if="errors.email" id="recovery-email-error" class="form-error">{{ errors.email }}</span></div>
      <div class="form-group"><label for="recovery-code" class="form-label">邮箱验证码</label><div class="verification-row"><input id="recovery-code" v-model="form.code" class="form-control" inputmode="numeric" autocomplete="one-time-code" :aria-invalid="!!errors.code" :aria-describedby="errors.code ? 'recovery-code-error' : undefined"><button type="button" class="btn btn--outline" :disabled="sending || remaining > 0" @click="send">{{ sending ? '正在发送…' : remaining ? `${remaining} 秒后重新发送` : '发送验证码' }}</button></div><span v-if="errors.code" id="recovery-code-error" class="form-error">{{ errors.code }}</span></div>
      <PasswordField id="recovery-password" v-model="form.password" label="新密码" hint="至少 8 位，包含字母和数字" :error="errors.password" />
      <PasswordField id="recovery-confirm" v-model="form.confirm" label="确认新密码" :error="errors.confirm" />
      <button type="submit" class="btn btn--primary btn--full" :disabled="busy">{{ busy ? '正在重置…' : '重置密码' }}</button>
    </form>
    <p class="auth-card__footer"><NuxtLink to="/login">返回登录</NuxtLink></p>
  </div></div></div>
</template>
