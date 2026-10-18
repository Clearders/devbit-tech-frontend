<script setup lang="ts">
import { LogIn } from '@lucide/vue'
import { apiErrorMessage, applyApiFieldErrors, getHttpStatus } from '~/utils/apiError'
definePageMeta({ middleware: 'guest' })
useSeoMeta({ title: '登录 – DevBit Tech', description: '登录 DevBit，继续讨论与创作。' })
const { login } = useAuth()
const route = useRoute()
const { validateEmail, validatePassword } = useValidation()
const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const apiError = ref(''), loading = ref(false)
watch(form, () => {
  if (errors.email) errors.email = validateEmail(form.email)
  if (errors.password) errors.password = validatePassword(form.password)
})
async function handleSubmit() {
  if (loading.value) return
  apiError.value = ''; errors.email = validateEmail(form.email); errors.password = validatePassword(form.password)
  if (errors.email || errors.password) { await nextTick(); document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); return }
  loading.value = true
  try { await login(form.email, form.password) }
  catch (e) { apiError.value = getHttpStatus(e) === 401 ? '邮箱或密码不正确，请重新输入。' : apiErrorMessage(e, '登录未完成，请稍后重试。'); if (applyApiFieldErrors(e, errors)) { await nextTick(); document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus() } }
  finally { loading.value = false }
}
</script>
<template>
  <div class="inner-page auth-page"><div class="container"><div class="auth-card">
    <h1 class="auth-card__title" data-transition-group="title"><LogIn :size="28" aria-hidden="true" />欢迎回来</h1>
    <p class="auth-card__subtitle" data-transition-group="content">登录 DevBit，继续讨论与创作。</p>
    <p v-if="route.query.registered" class="form-success" role="status">注册成功，请登录。</p>
    <form class="auth-form" novalidate data-transition-group="content" @submit.prevent="handleSubmit">
      <div v-if="apiError" class="form-error form-error--global" role="alert">{{ apiError }}</div>
      <div class="form-group"><label class="form-label" for="email">邮箱</label><input id="email" v-model="form.email" type="email" class="form-control" :class="{ 'form-control--error': errors.email }" placeholder="you@example.com" autocomplete="email" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'email-error' : undefined"><span v-if="errors.email" id="email-error" class="form-error">{{ errors.email }}</span></div>
      <PasswordField id="password" v-model="form.password" label="密码" placeholder="输入你的密码" autocomplete="current-password" :error="errors.password" />
      <div class="auth-form__help"><NuxtLink to="/forgot-password">忘记密码？</NuxtLink></div>
      <button type="submit" class="btn btn--primary btn--full" :disabled="loading">{{ loading ? '正在登录…' : '登录' }}</button>
    </form>
    <p class="auth-card__footer" data-transition-group="content">还没有账号？<NuxtLink to="/register">注册账号</NuxtLink></p>
  </div></div></div>
</template>
