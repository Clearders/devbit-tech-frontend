<script setup lang="ts">
import { UserRoundPlus } from '@lucide/vue'
import { apiErrorMessage, applyApiFieldErrors } from '~/utils/apiError'
definePageMeta({ middleware: 'guest' })
useSeoMeta({ title: '注册 – DevBit Tech', description: '加入 DevBit 学习与创作社区。' })
const { register, sendVerificationCode } = useAuth()
const { validateEmail, validatePassword, validateCode } = useValidation()
const { remaining: cooldown, start: startCooldown } = useCountdown()
const form = reactive({ name: '', email: '', code: '', password: '', confirmPassword: '' })
const errors = reactive({ name: '', email: '', code: '', password: '', confirmPassword: '' })
const apiError = ref(''), codeMessage = ref(''), loading = ref(false), codeLoading = ref(false)
const confirmError = () => !form.confirmPassword ? '请再次输入密码。' : form.password !== form.confirmPassword ? '两次输入的密码不一致。' : ''
watch(form, () => {
  if (errors.name) errors.name = form.name.trim() ? '' : '请输入昵称。'
  if (errors.email) errors.email = validateEmail(form.email)
  if (errors.code) errors.code = validateCode(form.code)
  if (errors.password) errors.password = validatePassword(form.password)
  if (errors.confirmPassword) errors.confirmPassword = confirmError()
})
watch(() => form.email, () => { codeMessage.value = '' })
async function focusError() { await nextTick(); document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus() }
async function handleSendCode() {
  if (codeLoading.value || cooldown.value > 0) return
  apiError.value = ''; codeMessage.value = ''; errors.email = validateEmail(form.email)
  if (errors.email) { await focusError(); return }
  const email = form.email.trim(); codeLoading.value = true
  try { const result = await sendVerificationCode({ email }); if (form.email.trim() === email) codeMessage.value = result.developmentCode ? `开发验证码：${result.developmentCode}` : '验证码已发送，请查看邮箱。'; startCooldown() }
  catch (e) { apiError.value = apiErrorMessage(e, '验证码发送失败，请稍后重试。'); if (applyApiFieldErrors(e, errors)) await focusError() }
  finally { codeLoading.value = false }
}
async function handleSubmit() {
  if (loading.value) return
  apiError.value = ''; errors.name = form.name.trim() ? '' : '请输入昵称。'; errors.email = validateEmail(form.email); errors.code = validateCode(form.code); errors.password = validatePassword(form.password); errors.confirmPassword = confirmError()
  if (Object.values(errors).some(Boolean)) { await focusError(); return }
  loading.value = true
  try { await register({ name: form.name.trim(), email: form.email.trim(), code: form.code.trim(), password: form.password, confirmPassword: form.confirmPassword }) }
  catch (e) { apiError.value = apiErrorMessage(e, '注册未完成，请检查填写信息和验证码。'); if (applyApiFieldErrors(e, errors)) await focusError() }
  finally { loading.value = false }
}
</script>
<template>
  <div class="inner-page auth-page"><div class="container"><div class="auth-card">
    <h1 class="auth-card__title" data-transition-group="title"><UserRoundPlus :size="28" aria-hidden="true" />加入 DevBit</h1>
    <p class="auth-card__subtitle" data-transition-group="content">从一个问题、一份作品，认识下一位同行者。</p>
    <form class="auth-form" novalidate data-transition-group="content" @submit.prevent="handleSubmit">
      <div v-if="apiError" class="form-error form-error--global" role="alert">{{ apiError }}</div><p v-if="codeMessage" class="form-success" role="status">{{ codeMessage }}</p>
      <div class="form-group"><label for="name" class="form-label">昵称</label><input id="name" v-model="form.name" class="form-control" autocomplete="nickname" placeholder="你希望大家如何称呼你" :aria-invalid="!!errors.name" :aria-describedby="errors.name ? 'name-error name-hint' : 'name-hint'"><p id="name-hint" class="form-hint">大家将通过这个名字认识你。</p><span v-if="errors.name" id="name-error" class="form-error">{{ errors.name }}</span></div>
      <div class="form-group"><label for="email" class="form-label">邮箱</label><input id="email" v-model="form.email" class="form-control" type="email" autocomplete="email" placeholder="you@example.com" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'email-error' : undefined"><span v-if="errors.email" id="email-error" class="form-error">{{ errors.email }}</span></div>
      <div class="form-group"><label for="code" class="form-label">邮箱验证码</label><div class="verification-row"><input id="code" v-model="form.code" class="form-control" inputmode="numeric" autocomplete="one-time-code" placeholder="输入邮件中的验证码" :aria-invalid="!!errors.code" :aria-describedby="errors.code ? 'code-error' : undefined"><button type="button" class="btn btn--outline" :disabled="codeLoading || cooldown > 0" @click="handleSendCode">{{ codeLoading ? '正在发送…' : cooldown > 0 ? `${cooldown} 秒后重新发送` : '发送验证码' }}</button></div><span v-if="errors.code" id="code-error" class="form-error">{{ errors.code }}</span></div>
      <PasswordField id="password" v-model="form.password" label="密码" placeholder="设置密码" hint="至少 8 位，包含字母和数字" :error="errors.password" />
      <PasswordField id="confirmPassword" v-model="form.confirmPassword" label="确认密码" placeholder="再次输入密码" :error="errors.confirmPassword" />
      <button type="submit" class="btn btn--primary btn--full" :disabled="loading">{{ loading ? '正在注册…' : '注册账号' }}</button>
    </form>
    <p class="auth-card__footer">已有账号？<NuxtLink to="/login">立即登录</NuxtLink></p>
  </div></div></div>
</template>
