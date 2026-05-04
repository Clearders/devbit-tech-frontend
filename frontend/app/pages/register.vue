<template>
  <div class="auth-page">
    <div class="container">
      <div class="auth-card">
        <h1 class="auth-card__title">Create an account</h1>
        <p class="auth-card__subtitle">Join DevBit Tech today</p>

        <form class="auth-form" novalidate @submit.prevent="handleSubmit">
          <div v-if="apiError" class="form-error form-error--global">{{ apiError }}</div>
          <div v-if="codeMessage" class="form-success">{{ codeMessage }}</div>

          <div class="form-group">
            <label class="form-label" for="name">Name</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              class="form-control"
              :class="{ 'form-control--error': errors.name }"
              placeholder="Your full name"
              autocomplete="name"
            />
            <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              class="form-control"
              :class="{ 'form-control--error': errors.email }"
              placeholder="you@example.com"
              autocomplete="email"
            />
            <span v-if="errors.email" class="form-error">{{ errors.email }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="code">Email Verification Code</label>
            <input
              id="code"
              v-model="form.code"
              type="text"
              class="form-control"
              :class="{ 'form-control--error': errors.code }"
              placeholder="Enter the code from your email"
              autocomplete="one-time-code"
            />
            <button
              type="button"
              class="btn btn--outline"
              :disabled="codeLoading || cooldown > 0"
              @click="handleSendCode"
            >
              {{ codeLoading ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Verification Code' }}
            </button>
            <span v-if="errors.code" class="form-error">{{ errors.code }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="form-control"
              :class="{ 'form-control--error': errors.password }"
              placeholder="Min. 8 characters with letters and numbers"
              autocomplete="new-password"
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              class="form-control"
              :class="{ 'form-control--error': errors.confirmPassword }"
              placeholder="Re-enter your password"
              autocomplete="new-password"
            />
            <span v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</span>
          </div>

          <button type="submit" class="btn btn--primary btn--full" :disabled="loading">
            {{ loading ? 'Creating account...' : 'Create Account' }}
          </button>
        </form>

        <p class="auth-card__footer">
          Already have an account? <NuxtLink to="/login">Sign in</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

useSeoMeta({
  title: 'Create Account - DevBit Tech',
  description: 'Create a new DevBit Tech account.'
})

const { register, sendVerificationCode } = useAuth()

const form = reactive({ name: '', email: '', code: '', password: '', confirmPassword: '' })
const errors = reactive({ name: '', email: '', code: '', password: '', confirmPassword: '' })
const apiError = ref('')
const codeMessage = ref('')
const loading = ref(false)
const codeLoading = ref(false)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function stopCooldown() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

function startCooldown(seconds = 60) {
  stopCooldown()
  cooldown.value = seconds
  cooldownTimer = setInterval(() => {
    if (cooldown.value <= 1) {
      cooldown.value = 0
      stopCooldown()
      return
    }
    cooldown.value -= 1
  }, 1000)
}

onBeforeUnmount(() => {
  stopCooldown()
})

function validate() {
  errors.name = ''
  errors.email = ''
  errors.code = ''
  errors.password = ''
  errors.confirmPassword = ''
  let valid = true

  if (!form.name.trim()) {
    errors.name = 'Name is required.'
    valid = false
  }

  if (!form.email) {
    errors.email = 'Email is required.'
    valid = false
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Please enter a valid email address.'
    valid = false
  }

  if (!form.code.trim()) {
    errors.code = 'Email verification code is required.'
    valid = false
  } else if (!/^\d{4,8}$/.test(form.code.trim())) {
    errors.code = 'Please enter a valid verification code.'
    valid = false
  }

  if (!form.password) {
    errors.password = 'Password is required.'
    valid = false
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(form.password)) {
    errors.password = 'Password must be at least 8 characters and include letters and numbers.'
    valid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
    valid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
    valid = false
  }

  return valid
}

async function handleSendCode() {
  apiError.value = ''
  codeMessage.value = ''
  errors.email = ''

  const email = form.email.trim()
  if (!email) {
    errors.email = 'Email is required before sending code.'
    return
  }

  if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.'
    return
  }

  codeLoading.value = true
  try {
    const response = await sendVerificationCode({ email })
    codeMessage.value = response.message
    startCooldown()
  } catch (err: unknown) {
    apiError.value = extractApiErrorMessage(err, 'Failed to send verification code. Please try again.')
  } finally {
    codeLoading.value = false
  }
}

async function handleSubmit() {
  apiError.value = ''
  codeMessage.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      code: form.code.trim(),
      confirm_password: form.confirmPassword
    })
  } catch (err: unknown) {
    apiError.value = extractApiErrorMessage(err, 'Registration failed. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>
