<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const is404 = computed(() => props.error?.statusCode === 404)

useSeoMeta({
  title: () => is404.value ? 'Page Not Found – DevBit Tech' : 'Error – DevBit Tech',
  description: () => is404.value
    ? 'The page you are looking for does not exist.'
    : 'An unexpected error occurred.',
})

const handleClearError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="error-page">
    <div class="container">
      <div class="error-card">
        <div class="error-card__icon">
          {{ is404 ? '🔍' : '⚠️' }}
        </div>
        <h1 class="error-card__code">
          {{ error?.statusCode || 500 }}
        </h1>
        <h2 class="error-card__title">
          {{ is404 ? 'Page Not Found' : 'Something went wrong' }}
        </h2>
        <p class="error-card__message">
          {{ is404
            ? 'The page you are looking for might have been removed, renamed, or is temporarily unavailable.'
            : error?.message || 'An unexpected error occurred. Please try again later.'
          }}
        </p>
        <div class="error-card__actions">
          <button
            class="btn btn--primary"
            @click="handleClearError"
          >
            ← Back to Home
          </button>
          <button
            v-if="!is404"
            class="btn btn--outline"
            @click="handleClearError"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
}

.error-card {
  text-align: center;
  max-width: 520px;
  margin: 0 auto;
  padding: 2rem;
}

.error-card__icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: error-float 3s ease-in-out infinite;
}

.error-card__code {
  font-size: clamp(4rem, 10vw, 8rem);
  font-weight: 900;
  font-family: var(--font-display), sans-serif;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 0.5rem;
  opacity: 0.3;
}

.error-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-display), sans-serif;
  margin-bottom: 0.75rem;
}

.error-card__message {
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.error-card__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

@keyframes error-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (max-width: 480px) {
  .error-card {
    padding: 1rem;
  }

  .error-card__icon {
    font-size: 3rem;
  }

  .error-card__actions {
    flex-direction: column;
  }
}
</style>
