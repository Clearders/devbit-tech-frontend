/** Serialized into the document head. Keep this function entirely self-contained. */
// Parameters also prevent the SSR compiler from replacing browser globals.
export function initializeStartupLoading(window: Window, document: Document, performance: Performance) {
  const root = document.documentElement
  if (root.classList.contains('is-game') || window.__devbitStartupLoading) return

  // The head owns first paint; neither Vue nor a downloaded module is needed.
  root.setAttribute('data-devbit-startup', 'loading')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const minimumSplash = reducedMotion ? 400 : 1200
  const transitionDuration = 1120 // Includes the last homepage reveal in CSS.
  let startedAt: number | undefined
  let content: HTMLElement | null = null
  let wasInert = false
  let progress = 0
  let ready = false
  let released = false
  let handoffTimer: number | undefined
  let releaseTimer: number | undefined

  const start = () => {
    if (released || startedAt !== undefined) return
    // Count the splash from parsed markup, never from an empty document head.
    startedAt = performance.now()
    content = document.querySelector<HTMLElement>('.app-shell__content')
    wasInert = content?.inert ?? false
    if (content) content.inert = true
  }
  const release = () => {
    released = true
    window.clearTimeout(handoffTimer)
    window.clearTimeout(releaseTimer)
    window.clearTimeout(fallbackTimer)
    document.removeEventListener('DOMContentLoaded', start)
    window.removeEventListener('error', dismiss)
    window.removeEventListener('unhandledrejection', dismiss)
    window.removeEventListener('pagehide', dismiss)
    root.removeAttribute('data-devbit-startup')
    root.removeAttribute('data-devbit-startup-stage')
    root.style.removeProperty('--devbit-startup-progress')
    document.querySelector('.startup-loader__track')?.removeAttribute('aria-valuenow')
    if (content) content.inert = wasInert
  }
  const report = (value: number) => {
    if (value <= progress) return
    progress = value
    root.style.setProperty('--devbit-startup-progress', String(value / 100))
    root.setAttribute('data-devbit-startup-stage', String(value))
    document.querySelector('.startup-loader__track')?.setAttribute('aria-valuenow', String(value))
  }
  const setProgress = (value: 25 | 65) => {
    if (released || ready) return
    start()
    // The bar follows real milestones, independent of the animation clock.
    if (value === 25 || value === 65) report(value)
  }
  const finish = (immediate = false) => {
    if (released) return
    if (immediate || root.classList.contains('is-game')) {
      release()
      return
    }
    if (ready) return
    start()
    ready = true
    report(100)
    // Let the completion stroke settle, overlapping the minimum splash time.
    const remaining = Math.max(minimumSplash - (performance.now() - startedAt!), reducedMotion ? 0 : 200)
    handoffTimer = window.setTimeout(() => {
      if (reducedMotion) {
        release()
        return
      }
      root.setAttribute('data-devbit-startup', 'leaving')
      releaseTimer = window.setTimeout(release, transitionDuration)
    }, remaining)
  }
  const dismiss = () => finish(true)
  // Covers missing bundles, initialization errors and interrupted navigation.
  const fallbackTimer = window.setTimeout(dismiss, 10_000)
  window.__devbitStartupLoading = { start, finish, setProgress }
  document.addEventListener('DOMContentLoaded', start, { once: true })
  window.addEventListener('error', dismiss)
  window.addEventListener('unhandledrejection', dismiss)
  window.addEventListener('pagehide', dismiss)
}
