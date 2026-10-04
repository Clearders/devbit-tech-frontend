const selector = '[data-scroll-reveal]'

interface RevealState {
  motion: HTMLElement
  visible: boolean
  baseline: boolean
  animation?: Animation
}

/** Owns only scroll animations. Content is visible without this controller. */
export function createScrollReveal(root: HTMLElement) {
  const states = new Map<HTMLElement, RevealState>()
  let observer: IntersectionObserver | undefined

  function cancel(state: RevealState) {
    const animation = state.animation
    state.animation = undefined
    if (animation) {
      animation.onfinish = null
      animation.cancel()
    }
  }

  function reveal(element: HTMLElement, state: RevealState, index: number) {
    cancel(state)
    if (element.contains(document.activeElement)) return
    try {
      const animation = state.motion.animate([
        { opacity: 0, transform: 'translate3d(0, 16px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], {
        duration: 500,
        delay: Math.min(index * 60, 180),
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'backwards',
      })
      state.animation = animation
      animation.onfinish = () => cancel(state)
    } catch {
      // A missing/failed animation must never hide readable content.
      cancel(state)
    }
  }

  function refresh(baseline = false) {
    if (!observer) return
    const elements = new Set(Array.from(root.querySelectorAll<HTMLElement>(selector))
      .filter(element => !element.parentElement?.closest(selector)))
    for (const [element, state] of states) {
      if (!elements.has(element)) {
        observer.unobserve(element)
        cancel(state)
        states.delete(element)
      }
    }
    for (const element of elements) {
      if (states.has(element)) continue
      const motion = element.firstElementChild
      if (!(motion instanceof HTMLElement) || !motion.hasAttribute('data-scroll-reveal-motion')) continue
      states.set(element, { motion, visible: false, baseline })
      observer.observe(element)
    }
  }

  function suspend() {
    observer?.disconnect()
    observer = undefined
    for (const state of states.values()) cancel(state)
    states.clear()
  }

  function resume() {
    if (observer) return
    try {
      const current = new IntersectionObserver(entries => {
        if (observer !== current) return // Ignore deliveries queued before navigation.
        const entering = new Map<HTMLElement, RevealState>()
        for (const entry of entries) {
          const element = entry.target as HTMLElement
          const state = states.get(element)
          if (!state || !root.contains(element)) continue
          const wasVisible = state.visible
          state.visible = entry.isIntersecting
          if (!state.visible) {
            cancel(state)
            entering.delete(element)
          } else if (!wasVisible && !state.baseline) entering.set(element, state)
          state.baseline = false
        }
        // DOM order, independent of observer delivery order, controls the stagger.
        const ordered = [...entering].sort(([a], [b]) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
        ordered.forEach(([element, state], index) => reveal(element, state, index))
      }, { threshold: 0 })
      observer = current
      refresh(true)
    } catch {
      suspend()
    }
  }

  function onFocus(event: FocusEvent) {
    if (!(event.target instanceof Node)) return
    for (const [element, state] of states) {
      if (element.contains(event.target)) cancel(state)
    }
  }
  root.addEventListener('focusin', onFocus)

  return {
    refresh,
    resume,
    suspend,
    destroy() {
      suspend()
      root.removeEventListener('focusin', onFocus)
    },
  }
}
