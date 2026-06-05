<!--
  Game Layout — minimal full-viewport for Bevy WASM games.
  Bevy creates its canvas directly on document.body, so we hide
  navbar/footer and let the game take the full screen.
-->
<script setup lang="ts">
const router = useRouter()

// ── Game page visual isolation ──────────────────────────────────
// Add is-game class to <html> so CSS can:
//   • Turn html/body fully black (kill the porcelain-white background)
//   • Hide the DynamicBackground particle canvases
//   • Enforce full-viewport canvas sizing
//
// useHead handles SSR; onMounted/onUnmounted guarantee client-side toggling.
useHead({
  htmlAttrs: {
    class: 'is-game',
  },
})

onMounted(() => {
  document.documentElement.classList.add('is-game')
})

onUnmounted(() => {
  document.documentElement.classList.remove('is-game')
})
</script>

<template>
  <div class="game-layout">
    <!-- Floating back button -->
    <button
      class="game-layout__back"
      type="button"
      aria-label="返回游戏列表"
      @click="router.push('/games')"
    >
      <span class="game-layout__back-icon">←</span>
      <span class="game-layout__back-text">返回游戏列表</span>
    </button>

    <!-- Game slot -->
    <slot />
  </div>
</template>

<style scoped>
.game-layout {
  position: fixed;
  inset: 0;
  z-index: 200;
  /* Let the Bevy canvas (appended to document.body) show through.
     The loading overlay (GameWasmLoader, z-index: 250) still provides
     a black background during load. */
  background: transparent;
  overflow: hidden;
  pointer-events: none;
}

.game-layout__back {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 300;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.625rem;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-body), sans-serif;
  cursor: pointer;
  transition:
    background 0.2s var(--ease-in-out),
    border-color 0.2s var(--ease-in-out),
    color 0.2s var(--ease-in-out);
  letter-spacing: -0.01em;
}

.game-layout__back:hover {
  background: rgba(0, 0, 0, 0.75);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.game-layout__back-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.game-layout__back-text {
  white-space: nowrap;
}

@media (max-width: 640px) {
  .game-layout__back {
    top: 0.75rem;
    left: 0.75rem;
    padding: 0.45rem 0.75rem;
    font-size: 0.8rem;
  }

  .game-layout__back-text {
    /* Hide text on mobile — icon only */
    display: none;
  }
}
</style>
