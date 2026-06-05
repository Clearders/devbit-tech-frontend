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

// ── Module-level canvas persistence ─────────────────────────────
// When the user navigates away from a WASM game page in the SPA,
// JavaScript's dynamic import() cache keeps the WASM module alive,
// and __wbg_init() returns early on re-entry because `wasm` is
// already defined.  If we destroy the canvas on unmount, the
// second visit has no rendering surface → black screen.
//
// Instead, we detach the canvas from the DOM on unmount and store
// a reference here (module scope survives component teardown).
// On remount we re-attach it, and the still-running Bevy app
// resumes rendering immediately.
let savedCanvas: HTMLCanvasElement | null = null

// If we already have a live canvas from a previous mount, start
// in 'running' state to avoid a loading flash.
const state = ref<LoadState>(savedCanvas ? 'running' : 'idle')
const errorMessage = ref('')

function styleCanvas(canvas: HTMLCanvasElement): void {
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.maxWidth = 'none'
  canvas.style.maxHeight = 'none'
  canvas.style.margin = '0'
  canvas.style.display = 'block'
  canvas.style.zIndex = '100'
}

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

    // ── Enforce full-viewport canvas ──────────────────────────────
    // Bevy creates its <canvas> inside module.default(). Give it a
    // frame to appear, then override any size constraints so the game
    // always fills the entire viewport.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const canvas = document.querySelector('body > canvas') as HTMLCanvasElement | null
        if (canvas) {
          styleCanvas(canvas)
          savedCanvas = canvas
        }
      })
    })
  } catch (err: unknown) {
    console.error('Failed to load WASM game:', err)
    errorMessage.value = err instanceof Error ? err.message : 'Unknown error loading game'
    state.value = 'error'
  }
}

function retry(): void {
  // Clear saved state and reload the page to fully reset WebGL/WASM context
  savedCanvas = null
  window.location.reload()
}

onMounted(() => {
  if (savedCanvas) {
    // ── Re-attach the preserved canvas from a previous visit ──────
    // The WASM module is still running in the background; we just
    // need to put its canvas back into the DOM.
    document.body.appendChild(savedCanvas)
    styleCanvas(savedCanvas)
    state.value = 'running'
    return
  }

  loadWasm()
})

onUnmounted(() => {
  // Detach the Bevy canvas from body (keep the JS reference alive
  // so the WebGL context is not garbage-collected).
  const canvas = document.querySelector('body > canvas') as HTMLCanvasElement | null
  if (canvas) {
    savedCanvas = canvas
    canvas.remove()
  }
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
