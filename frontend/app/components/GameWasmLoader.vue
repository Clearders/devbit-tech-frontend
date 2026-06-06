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
// Removing the canvas from the DOM (canvas.remove()) causes the
// browser to disconnect the WebGL context's backing store from
// the visible element.  On re-attach, isContextLost() returns
// false but draw calls render to a dead buffer → black screen.
//
// Instead, we HIDE the canvas with display:none on unmount and
// show it on remount.  The canvas never leaves the DOM, so the
// GPU surface stays connected and Bevy renders uninterrupted.
let savedCanvas: HTMLCanvasElement | null = null

// If we already have a live canvas from a previous mount, start
// in 'running' state to avoid a loading flash.
const state = ref<LoadState>(savedCanvas ? 'running' : 'idle')
const errorMessage = ref('')

function styleCanvas(canvas: HTMLCanvasElement): void {
  canvas.style.position = 'fixed'
  // inset: 0 is more reliable than width/height: 100% on mobile,
  // especially iOS Safari where 100% can include hidden browser chrome.
  canvas.style.inset = '0'
  // dvh/dvw (dynamic viewport units) track the actual visible area
  // and adapt when mobile browser chrome shows/hides.
  canvas.style.width = '100dvw'
  canvas.style.height = '100dvh'
  canvas.style.maxWidth = 'none'
  canvas.style.maxHeight = 'none'
  canvas.style.margin = '0'
  canvas.style.display = 'block'
  canvas.style.zIndex = '100'
  // Prevent browser default touch gestures (pinch-zoom, double-tap)
  // from interfering with the game on mobile.
  canvas.style.touchAction = 'none'
}

// ── WebGL context health check ──────────────────────────────────
// Only needed as a safety net for GPU resets / driver crashes.
// The canvas is now kept in the DOM (hidden, not removed), so
// DOM removal is no longer a cause of context loss.
function isWebGLContextLost(canvas: HTMLCanvasElement): boolean {
  try {
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as
      | (WebGL2RenderingContext & { isContextLost?: () => boolean })
      | (WebGLRenderingContext & { isContextLost?: () => boolean })
      | null

    if (!gl) return true
    return gl.isContextLost?.() ?? false
  } catch {
    return true
  }
}

// ── WebGL context event handlers ────────────────────────────────
// These fire when the browser detects GPU resets or driver crashes.
// We prevent the default (which would mark the context as lost
// permanently) to give the browser a chance to restore it.
function onContextLost(event: Event): void {
  event.preventDefault()
  console.warn('[GameWasmLoader] WebGL context lost — awaiting restore')
}

function onContextRestored(_event: Event): void {
  console.log('[GameWasmLoader] WebGL context restored')
  // Bevy should pick up the restored context and resume rendering.
  // If it doesn't, the user can use the "retry" button.
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
          // Listen for GPU-triggered context loss (driver crash, etc.)
          canvas.addEventListener('webglcontextlost', onContextLost)
          canvas.addEventListener('webglcontextrestored', onContextRestored)
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

// ── Viewport resize handler ─────────────────────────────────────
// On mobile, browser chrome (address bar) can appear/disappear
// during scroll, and device orientation can change.  We re-apply
// canvas styles so the game always fills the visible viewport.
function handleViewportChange(): void {
  if (savedCanvas && document.body.contains(savedCanvas)) {
    styleCanvas(savedCanvas)
  }
}

onMounted(() => {
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('orientationchange', handleViewportChange)

  if (savedCanvas) {
    // ── Show the preserved canvas from a previous visit ───────────
    // The canvas was hidden (display:none), not removed, so the
    // WebGL context's backing store is still connected.  We just
    // need to make it visible again — no re-attachment needed.
    //
    // Safety net: if the context was lost for other reasons
    // (GPU reset, driver crash), reload the page for a fresh start.
    if (isWebGLContextLost(savedCanvas)) {
      console.warn('[GameWasmLoader] Saved canvas has lost its WebGL context — reloading page')
      savedCanvas = null
      state.value = 'error'
      errorMessage.value = 'WebGL 上下文已丢失，正在重新加载...'
      setTimeout(() => window.location.reload(), 800)
      return
    }

    // Defensive: re-attach if the canvas was somehow detached
    // (e.g. by a browser extension or hard-refresh edge case).
    if (!document.body.contains(savedCanvas)) {
      document.body.appendChild(savedCanvas)
    }

    savedCanvas.addEventListener('webglcontextlost', onContextLost)
    savedCanvas.addEventListener('webglcontextrestored', onContextRestored)

    savedCanvas.style.display = 'block'
    styleCanvas(savedCanvas)
    state.value = 'running'
    return
  }

  loadWasm()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('orientationchange', handleViewportChange)

  // Hide the Bevy canvas instead of removing it from the DOM.
  // Removing the canvas (canvas.remove()) causes the browser to
  // disconnect the WebGL context's backing store from the visible
  // element.  On re-entry, draw calls render to a dead buffer
  // even though isContextLost() returns false → black screen.
  // By only hiding the canvas (display:none), the GPU surface
  // stays connected and Bevy's render loop continues uninterrupted.
  if (savedCanvas && document.body.contains(savedCanvas)) {
    savedCanvas.removeEventListener('webglcontextlost', onContextLost)
    savedCanvas.removeEventListener('webglcontextrestored', onContextRestored)
    savedCanvas.style.display = 'none'
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
