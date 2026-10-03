import type { TransitionProps } from 'vue'

export const usePageTransition = () => {
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const transition = shallowRef<TransitionProps | false>(false)
  let reservedMain: HTMLElement | undefined
  let previousMinHeight = ''
  let previousPriority = ''
  let reveals: HTMLElement[] = []

  const clearReveals = () => {
    for (const element of reveals) {
      element.removeAttribute('data-route-reveal')
      element.style.removeProperty('--route-reveal-delay')
    }
    reveals = []
  }
  const cleanup = () => {
    clearReveals()
    if (reservedMain) {
      if (previousMinHeight) {
        reservedMain.style.setProperty('min-height', previousMinHeight, previousPriority)
      } else {
        reservedMain.style.removeProperty('min-height')
      }
      reservedMain = undefined
    }
  }
  const options = (reducedMotion: boolean): TransitionProps => ({
    name: 'page',
    mode: 'out-in',
    appear: false,
    // Include the last child's 100ms delay and 240ms reveal in Vue's lifecycle.
    duration: reducedMotion ? 0 : { enter: 340, leave: 140 },
    onBeforeLeave(element) {
      cleanup()
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
    onEnterCancelled: cleanup,
    onLeaveCancelled: cleanup,
  })

  if (import.meta.client) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    transition.value = options(motion.matches)
    const removeGuard = router.beforeResolve((to, from) => {
      cleanup()
      // Navigation interrupts startup rather than stacking two animations.
      if (document.documentElement.hasAttribute('data-devbit-startup')) {
        window.__devbitStartupLoading?.finish(true)
      }
      transition.value = to.meta.layout === 'game' || from.meta.layout === 'game'
        || to.meta.pageTransition === false ? false : options(motion.matches)
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
