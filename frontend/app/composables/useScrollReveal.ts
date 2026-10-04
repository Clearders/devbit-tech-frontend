import type { Ref } from 'vue'
import { createScrollReveal } from '~/utils/scrollReveal'

/** One controller for the default layout's main content, never overlays/games. */
export function useScrollReveal(root: Ref<HTMLElement | undefined>) {
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  let dispose = () => {}

  onMounted(() => {
    const main = root.value
    if (!main || !window.IntersectionObserver || !window.MutationObserver
      || !HTMLElement.prototype.animate) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const controller = createScrollReveal(main)
    let pendingPage = false
    let suspended = true
    let disposed = false
    let frame = 0

    function suspend() {
      suspended = true
      controller.suspend()
      cancelAnimationFrame(frame)
      frame = 0
    }
    function blocked() {
      return motion.matches || pendingPage
        || document.documentElement.hasAttribute('data-devbit-startup')
        || !!main!.querySelector('[data-route-direction], .page-enter-active, .page-leave-active')
    }
    function sync() {
      frame = 0
      if (disposed) return
      if (blocked()) {
        suspend()
        return
      }
      if (suspended) {
        controller.resume()
        suspended = false
      } else controller.refresh()
    }
    function schedule() {
      if (disposed || frame) return
      // Let Vue finish DOM updates and router scroll restoration before baselining.
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(sync) })
    }
    function finishPage() {
      pendingPage = false
      schedule()
    }
    function startPage() {
      pendingPage = true
      suspend()
    }
    function onMotionChange() {
      suspend()
      schedule()
    }

    const contentObserver = new MutationObserver(records => {
      // Text edits (counts, form errors, typing) do not rescan the entire page.
      const changed = records.some(record => record.type === 'attributes'
        || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))
      if (!changed) return
      if (blocked()) suspend()
      schedule()
    })
    contentObserver.observe(main, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-route-direction'],
    })
    const startupObserver = new MutationObserver(() => {
      if (blocked()) suspend()
      schedule()
    })
    startupObserver.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-devbit-startup'],
    })
    const removeGuard = router.beforeResolve(() => { startPage() })
    const removeAfter = router.afterEach(() => { finishPage() })
    const removeError = router.onError(finishPage)
    const removeStart = nuxtApp.hook('page:start', startPage)
    const removeFinish = nuxtApp.hook('page:finish', finishPage)
    const removeTransition = nuxtApp.hook('page:transition:finish', finishPage)
    const removeAppError = nuxtApp.hook('app:error', finishPage)
    motion.addEventListener('change', onMotionChange)
    schedule()

    dispose = () => {
      disposed = true
      cancelAnimationFrame(frame)
      controller.destroy()
      contentObserver.disconnect()
      startupObserver.disconnect()
      motion.removeEventListener('change', onMotionChange)
      removeGuard()
      removeAfter()
      removeError()
      removeStart()
      removeFinish()
      removeTransition()
      removeAppError()
    }
  })
  onBeforeUnmount(() => dispose())
}
