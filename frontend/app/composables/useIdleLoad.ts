/**
 * Idle-load composable — defers non-critical work until the browser is idle.
 * Uses requestIdleCallback with a fallback to setTimeout for broader support.
 *
 * Usage:
 *   const { onIdle } = useIdleLoad()
 *   onIdle(() => { /* heavy init here */ })
 */

type IdleCallback = () => void

export const useIdleLoad = () => {
  const isClient = import.meta.client

  /**
   * Schedule a callback to run when the browser is idle (after first paint & interaction).
   * Falls back to a 200ms delay if requestIdleCallback is not available.
   */
  const onIdle = (fn: IdleCallback, timeout = 2000) => {
    if (!isClient) {
      // SSR: defer to next microtask so it doesn't block rendering
      Promise.resolve().then(fn)
      return
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout })
    } else {
      setTimeout(fn, 200)
    }
  }

  /**
   * Schedule work after the next paint (suitable for DOM measurements).
   */
  const afterPaint = (fn: IdleCallback) => {
    if (!isClient) {
      Promise.resolve().then(fn)
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(fn)
    })
  }

  /**
   * Load a script dynamically, only when idle.
   */
  const loadScript = (src: string, options?: { async?: boolean; defer?: boolean }) => {
    onIdle(() => {
      const script = document.createElement('script')
      script.src = src
      script.async = options?.async ?? true
      if (options?.defer) script.defer = true
      document.head.appendChild(script)
    })
  }

  return { onIdle, afterPaint, loadScript }
}
