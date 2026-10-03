<script setup lang="ts">
// Nuxt serializes this callback into an inline script before its module entry.
// Keep it self-contained: it must work even if the application JS never loads.
onPrehydrate(() => {
  const root = document.documentElement
  if (root.classList.contains('is-game')) return

  const content = document.querySelector<HTMLElement>('.app-shell__content')
  const track = document.querySelector<HTMLElement>('.startup-loader__track')
  const wasInert = content?.inert ?? false
  let progress = 0
  let shown = false
  let finished = false
  let releaseTimer: number | undefined
  const release = () => {
    root.removeAttribute('data-devbit-startup')
    root.removeAttribute('data-devbit-startup-stage')
    root.style.removeProperty('--devbit-startup-progress')
    track?.removeAttribute('aria-valuenow')
    if (shown && content) content.inert = wasInert
  }
  const report = (value: number) => {
    if (value <= progress) return
    progress = value
    root.style.setProperty('--devbit-startup-progress', String(value / 100))
    root.setAttribute('data-devbit-startup-stage', String(value))
    track?.setAttribute('aria-valuenow', String(value))
  }
  const setProgress = (value: 25 | 65) => {
    // Only real initialization events may advance the bar. Readiness alone
    // owns 100%; late or out-of-order events cannot revive a finished loader.
    if (!finished && (value === 25 || value === 65)) report(value)
  }
  const finish = (immediate = false) => {
    if (finished) {
      if (immediate) {
        window.clearTimeout(releaseTimer)
        release()
      }
      return
    }
    if (!immediate) report(100)
    finished = true
    window.clearTimeout(showTimer)
    window.clearTimeout(fallbackTimer)
    window.removeEventListener('error', dismiss)
    window.removeEventListener('unhandledrejection', dismiss)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!shown || immediate || reducedMotion || root.classList.contains('is-game')) {
      release()
      return
    }
    // Only a splash that actually appeared gets a visual handoff. There is no
    // minimum display time; errors and the watchdog always reveal immediately.
    root.setAttribute('data-devbit-startup', 'leaving')
    releaseTimer = window.setTimeout(release, 420)
  }
  const dismiss = () => finish(true)
  const showTimer = window.setTimeout(() => {
    if (finished) return
    shown = true
    if (content) content.inert = true
    root.setAttribute('data-devbit-startup', 'loading')
  }, 200)
  const fallbackTimer = window.setTimeout(dismiss, 10_000)

  window.__devbitStartupLoading = { finish, setProgress }
  window.addEventListener('error', dismiss)
  window.addEventListener('unhandledrejection', dismiss)
})
</script>

<template>
  <div class="startup-loader" role="status" aria-live="polite" aria-atomic="true">
    <div class="startup-loader__content">
      <div class="startup-loader__brand" aria-hidden="true"><span>Dev</span>Bit Tech</div>
      <div class="startup-loader__track" role="progressbar" aria-label="网站启动阶段" aria-valuemin="0" aria-valuemax="100">
        <span class="startup-loader__completion" />
      </div>
      <p class="startup-loader__label">
        <span class="startup-loader__stage startup-loader__stage--initializing">初始化</span>
        <span class="startup-loader__stage startup-loader__stage--session">检查会话</span>
        <span class="startup-loader__stage startup-loader__stage--page">准备页面</span>
      </p>
    </div>
  </div>
</template>

<style>
.nuxt-loading-indicator {
  /* A CSS rule keeps the theme color when Nuxt updates background-size. */
  background-color: var(--color-primary, #5b8def);
  box-shadow: 0 0 10px var(--color-primary-glow, rgba(91, 141, 239, 0.25));
  transition: transform 160ms linear, opacity 180ms ease-out !important;
}

html:not(.is-game) {
  /* Keep the page width fixed when the splash temporarily hides scrolling. */
  scrollbar-gutter: stable;
}

html[data-devbit-startup]:not(.is-game) {
  overflow: hidden;
}

html[data-devbit-startup]:not(.is-game) .app-shell__content {
  transition: opacity 420ms var(--ease-out-quint);
}

html[data-devbit-startup='loading']:not(.is-game) .app-shell__content {
  opacity: 0;
}

html[data-devbit-startup='leaving']:not(.is-game) .site-layout__main {
  animation: devbit-startup-reveal 420ms var(--ease-out-quint) both;
}

.startup-loader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 24px;
  background:
    radial-gradient(ellipse at 50% 44%, var(--color-primary-o08, rgba(91, 141, 239, 0.08)), transparent 48%),
    var(--color-bg, #f7f5f2);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(0);
  transition: none;
}

html[data-devbit-startup='loading']:not(.is-game) .startup-loader {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 240ms ease-out, visibility 0s;
}

html[data-devbit-startup='leaving']:not(.is-game) .startup-loader {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(-100%);
  transition: transform 420ms var(--ease-out-quint);
}

.startup-loader__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.startup-loader__brand {
  color: var(--color-text, #1e1e2e);
  font-family: var(--font-display, 'Segoe UI', sans-serif);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 240ms ease-out, transform 420ms var(--ease-out-quint);
}

html[data-devbit-startup='loading'] .startup-loader__brand {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 40ms;
}

html[data-devbit-startup='leaving'] .startup-loader__brand {
  transform: translateY(-6px);
  transition-duration: 180ms;
}

.startup-loader__brand span {
  color: var(--color-primary, #5b8def);
}

.startup-loader__track {
  position: relative;
  width: 160px;
  height: 2px;
  margin-top: 28px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--color-primary-o12, rgba(91, 141, 239, 0.12));
  opacity: 0;
  transform: scaleX(0.8);
  transition: opacity 180ms ease-out, transform 420ms var(--ease-out-quint);
}

html[data-devbit-startup='loading'] .startup-loader__track {
  opacity: 1;
  transform: scaleX(1);
  transition-delay: 80ms;
}

html[data-devbit-startup='leaving'] .startup-loader__track {
  opacity: 1;
  transform: scaleX(1);
}

.startup-loader__completion {
  position: absolute;
  inset: 0;
  background: var(--color-primary, #5b8def);
  transform: scaleX(var(--devbit-startup-progress, 0));
  transform-origin: left;
  transition: transform 120ms var(--ease-out-quint);
}

.startup-loader__label {
  margin-top: 16px;
  color: var(--color-text-secondary, #4a4a5e);
  font-size: 14px;
  line-height: 1.6;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 180ms ease-out, transform 360ms var(--ease-out-quint);
}

html[data-devbit-startup='loading'] .startup-loader__label {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 120ms;
}

.startup-loader__stage { display: none; }
html:not([data-devbit-startup-stage]) .startup-loader__stage--initializing { display: inline; }
html[data-devbit-startup-stage='25'] .startup-loader__stage--session { display: inline; }
html:is([data-devbit-startup-stage='65'], [data-devbit-startup-stage='100']) .startup-loader__stage--page { display: inline; }

@keyframes devbit-startup-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .startup-loader__brand { font-size: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  .startup-loader,
  .startup-loader__brand,
  .startup-loader__track,
  .startup-loader__label {
    transition: none !important;
    transform: none;
  }
  html[data-devbit-startup]:not(.is-game) .app-shell__content { transition: none !important; }
  html[data-devbit-startup='leaving']:not(.is-game) .site-layout__main { animation: none; }
  .startup-loader__completion { transition: none; }
  .nuxt-loading-indicator { transition: none !important; }
}
</style>
