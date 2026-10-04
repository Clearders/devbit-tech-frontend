import type { TransitionProps } from 'vue'
import { navigationDirection } from '~/utils/navigation'

export const usePageTransition = () => {
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const transition = shallowRef<TransitionProps | false>(false)
  let reservedMain: HTMLElement | undefined
  let previousMinHeight = ''
  let previousPriority = ''
  let reveals: HTMLElement[] = []
  let direction = 0
  const movingElements = new Set<Element>()
  const frozenReveals = new Map<HTMLElement, { name: string; value: string; priority: string }[]>()

  const freezeReveals = () => {
    // A new navigation can interrupt a group's delay. Preserve that exact
    // frame before removing its animation so it cannot flash fully visible.
    for (const element of reveals) {
      const computed = window.getComputedStyle(element)
      const frame = { opacity: computed.opacity, transform: computed.transform }
      if (!frozenReveals.has(element)) {
        frozenReveals.set(element, ['opacity', 'transform'].map(name => ({
          name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name),
        })))
      }
      element.style.setProperty('opacity', frame.opacity)
      element.style.setProperty('transform', frame.transform)
    }
  }
  const restoreFrozenReveals = (root?: Element) => {
    for (const [element, properties] of frozenReveals) {
      if (root && !root.contains(element)) continue
      for (const { name, value, priority } of properties) {
        if (value) element.style.setProperty(name, value, priority)
        else element.style.removeProperty(name)
      }
      frozenReveals.delete(element)
    }
  }

  const setDirection = (element: Element) => {
    element.setAttribute('data-route-direction', String(direction))
    movingElements.add(element)
  }

  const clearReveals = () => {
    for (const element of reveals) {
      element.removeAttribute('data-route-reveal')
      element.style.removeProperty('--route-reveal-delay')
    }
    reveals = []
  }
  const clearTransitionState = () => {
    clearReveals()
    for (const element of movingElements) element.removeAttribute('data-route-direction')
    movingElements.clear()
    if (reservedMain) {
      if (previousMinHeight) {
        reservedMain.style.setProperty('min-height', previousMinHeight, previousPriority)
      } else {
        reservedMain.style.removeProperty('min-height')
      }
      reservedMain = undefined
    }
  }
  const cleanup = () => {
    clearTransitionState()
    restoreFrozenReveals()
  }
  const options = (reducedMotion: boolean): TransitionProps => ({
    name: 'page',
    mode: 'out-in',
    appear: false,
    // Include the final 100ms stagger plus its 380ms horizontal reveal.
    duration: reducedMotion ? 0 : { enter: 480, leave: 180 },
    onBeforeLeave(element) {
      clearTransitionState()
      if (!reducedMotion) setDirection(element)
      const main = element.closest<HTMLElement>('.site-layout__main')
      if (!main) return
      reservedMain = main
      previousMinHeight = main.style.getPropertyValue('min-height')
      previousPriority = main.style.getPropertyPriority('min-height')
      main.style.setProperty('min-height', `${main.getBoundingClientRect().height}px`)
    },
    onBeforeEnter(element) {
      clearReveals()
      if (reducedMotion) return
      setDirection(element)
      let cardIndex = 0
      const groups = element.querySelectorAll<HTMLElement>('[data-transition-group]')
      for (const group of groups) {
        // A marked parent owns its whole group; nested markers never move twice.
        const parent = group.parentElement?.closest('[data-transition-group]')
        if (parent && element.contains(parent)) continue
        const kind = group.dataset.transitionGroup
        const delay = kind === 'title' ? 0 : kind === 'card'
          ? Math.min(60 + cardIndex++ * 20, 100) : 40
        group.style.setProperty('--route-reveal-delay', `${delay}ms`)
        group.setAttribute('data-route-reveal', kind === 'title' ? 'title' : 'content')
        reveals.push(group)
      }
    },
    onAfterEnter: cleanup,
    onAfterLeave: restoreFrozenReveals,
    onEnterCancelled: clearTransitionState,
    onLeaveCancelled: cleanup,
  })

  if (import.meta.client) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    transition.value = options(motion.matches)
    const removeGuard = router.beforeResolve((to, from) => {
      freezeReveals()
      clearTransitionState()
      direction = navigationDirection(to.path, from.path)
      // Navigation interrupts startup rather than stacking two animations.
      if (document.documentElement.hasAttribute('data-devbit-startup')) {
        window.__devbitStartupLoading?.finish(true)
      }
      transition.value = to.meta.layout === 'game' || from.meta.layout === 'game'
        || to.meta.pageTransition === false ? false : options(motion.matches)
      if (transition.value === false) restoreFrozenReveals()
    })
    const removeAfter = router.afterEach((_to, _from, failure) => {
      if (failure) cleanup()
    })
    const removeError = router.onError(cleanup)
    const removeAppError = nuxtApp.hook('app:error', cleanup)
    const onMotionChange = () => {
      cleanup()
      if (transition.value !== false) transition.value = options(motion.matches)
    }
    motion.addEventListener('change', onMotionChange)
    onBeforeUnmount(() => {
      cleanup()
      removeGuard()
      removeAfter()
      removeError()
      removeAppError()
      motion.removeEventListener('change', onMotionChange)
    })
  }

  return transition
}
