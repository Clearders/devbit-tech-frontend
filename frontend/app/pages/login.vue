<template>
  <div class="auth-page">
    <div class="container">
      <div class="auth-card">
        <h1 class="auth-card__title">Welcome back</h1>
        <p class="auth-card__subtitle">Sign in to your DevBit Tech account</p>

        <form class="auth-form" novalidate @submit.prevent="handleSubmit">
          <div v-if="apiError" class="form-error form-error--global">{{ apiError }}</div>

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
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              v-model="form.password"
              type="password"
              class="form-control"
              :class="{ 'form-control--error': errors.password }"
              placeholder="Enter your password"
              autocomplete="current-password"
            />
            <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
          </div>

          <button type="submit" class="btn btn--primary btn--full" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <p class="auth-card__footer">
          Don't have an account? <NuxtLink to="/register">Create one</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

useSeoMeta({
  title: 'Sign In – DevBit Tech',
  description: 'Sign in to your DevBit Tech account.'
})

const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const apiError = ref('')
const loading = ref(false)

function validate() {
  errors.email = ''
  errors.password = ''
  let valid = true

  if (!form.email) {
    errors.email = 'Email is required.'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address.'
    valid = false
  }

  if (!form.password) {
    errors.password = 'Password is required.'
    valid = false
  } else if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(form.password)) {
    errors.password = 'Password must be at least 8 characters and include letters and numbers.'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  apiError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await login(form.email, form.password)
  } catch (err: unknown) {
    apiError.value = extractApiErrorMessage(err, 'Login failed. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>
