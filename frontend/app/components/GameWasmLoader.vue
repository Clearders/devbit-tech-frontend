<!--
  GameWasmLoader — generic WASM game loader component.

  Dynamically imports a wasm-bindgen generated ES module and calls
  its default init() function. Bevy (or other engines) will then
  create a <canvas> and append it to document.body.

  Props:
    wasmPath  — public path to the .js glue file (e.g. "/games/heartstring_blade/heartstring_blade.js")
    title     — game title for the loading screen
    hint      — brief instruction shown during loading
-->
<script setup lang="ts">
interface Props {
  wasmPath: string
  title?: string
  hint?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Loading Game...',
  hint: '',
})

type LoadState = 'idle' | 'loading' | 'running' | 'error'

const state = ref<LoadState>('idle')
const errorMessage = ref('')

async function loadWasm(): Promise<void> {
  if (state.value === 'running' || state.value === 'loading') return

  state.value = 'loading'
  errorMessage.value = ''

  try {
    // Dynamic import of the wasm-bindgen generated module
    const module = await import(/* @vite-ignore */ props.wasmPath)
    if (typeof module.default === 'function') {
      await module.default()
    } else {
      throw new Error('WASM module does not export a default init function')
    }
    state.value = 'running'
  } catch (err: unknown) {
    console.error('Failed to load WASM game:', err)
    errorMessage.value = err instanceof Error ? err.message : 'Unknown error loading game'
    state.value = 'error'
  }
}

function retry(): void {
  // Reload the page to fully reset WebGL/WASM context
  window.location.reload()
}

onMounted(() => {
  loadWasm()
})
</script>

<template>
  <ClientOnly>
    <!-- Loading screen -->
    <div v-if="state === 'idle' || state === 'loading'" class="wasm-loader">
      <div class="wasm-loader__inner">
        <div class="wasm-loader__spinner" />
        <p class="wasm-loader__title">{{ title }}</p>
        <p v-if="hint" class="wasm-loader__hint">{{ hint }}</p>
        <p class="wasm-loader__status">
          {{ state === 'idle' ? '准备中...' : '加载中...' }}
        </p>
      </div>
    </div>

    <!-- Error screen -->
    <div v-else-if="state === 'error'" class="wasm-loader">
      <div class="wasm-loader__inner">
        <div class="wasm-loader__error-icon">⚠️</div>
        <p class="wasm-loader__title">游戏加载失败</p>
        <p class="wasm-loader__error">{{ errorMessage }}</p>
        <button class="wasm-loader__retry btn btn--primary" @click="retry">
          重试
        </button>
      </div>
    </div>

    <!-- Running: Bevy canvas is appended to body — hide our loader -->
    <template v-else>
      <!-- Game is running — canvas is managed by Bevy -->
    </template>
  </ClientOnly>
</template>

<style scoped>
.wasm-loader {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.wasm-loader__inner {
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  padding: 2rem;
}

.wasm-loader__spinner {
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1.5rem;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  animation: wasm-spin 0.8s linear infinite;
}

@keyframes wasm-spin {
  to { transform: rotate(360deg); }
}

.wasm-loader__title {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: var(--font-display), sans-serif;
  margin-bottom: 0.5rem;
  letter-spacing: -0.01em;
}

.wasm-loader__hint {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.75rem;
}

.wasm-loader__status {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
}

.wasm-loader__error-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.wasm-loader__error {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 1.5rem;
  max-width: 320px;
  word-break: break-word;
}

.wasm-loader__retry {
  padding: 0.55rem 1.5rem;
  font-size: 0.9rem;
}
</style>
