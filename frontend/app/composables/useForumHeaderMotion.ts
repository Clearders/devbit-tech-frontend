import { gsap } from 'gsap'
import type { Ref } from 'vue'

/** Interaction layers are separate from the site's route/scroll reveal layers. */
export function useForumHeaderMotion(root: Ref<HTMLElement | undefined>) {
  let context: gsap.Context | undefined
  let media: gsap.MatchMedia | undefined
  let reduced = false
  let hoverable = false
  let disposed = false
  const observers = new Map<HTMLElement, ResizeObserver>()
  const pressed = new Set<HTMLElement>()
  const followers = new Map<HTMLElement, { x: ReturnType<typeof gsap.quickTo>; y: ReturnType<typeof gsap.quickTo> }>()
  const listeners: (() => void)[] = []

  function record(callback: () => void) {
    if (!disposed) context ? context.add(callback) : callback()
  }

  function stop(element: Element) {
    const target = element as HTMLElement
    observers.get(target)?.disconnect()
    observers.delete(target)
    gsap.killTweensOf(target)
  }

  function prepare(element: Element, dimension: 'width' | 'height') {
    const target = element as HTMLElement
    // A cancelled leave keeps its current dimensions for the next enter.
    if (target.style[dimension] && target.style[dimension] !== 'auto') return
    gsap.set(target, { [dimension]: 0, opacity: 0, overflow: 'hidden' })
  }

  function expand(element: Element, done: () => void, dimension: 'width' | 'height') {
    const target = element as HTMLElement
    stop(target)
    const body = target.firstElementChild
    const size = () => dimension === 'height'
      ? body?.getBoundingClientRect().height ?? target.scrollHeight
      : target.scrollWidth
    let settled = false
    const finish = () => {
      gsap.set(target, { clearProps: `${dimension},overflow,opacity` })
      if (!settled) { settled = true; done() }
    }
    const tween = () => record(() => {
      gsap.to(target, { [dimension]: size(), opacity: 1, duration: reduced ? 0 : .3,
        ease: 'power3.out', overwrite: true, onComplete: finish })
    })
    if (dimension === 'height' && body && !reduced) {
      let previousSize = size()
      const observer = new ResizeObserver(() => {
        const nextSize = size()
        if (Math.abs(nextSize - previousSize) < .5) return
        // Keep a natural-height panel fluid when its contents change too.
        if (!target.style.height) gsap.set(target, { height: previousSize, overflow: 'hidden' })
        previousSize = nextSize
        tween()
      })
      observer.observe(body)
      observers.set(target, observer)
    }
    tween()
  }

  function collapse(element: Element, done: () => void, dimension: 'width' | 'height') {
    const target = element as HTMLElement
    stop(target)
    if (target.contains(document.activeElement)) {
      root.value?.querySelector<HTMLButtonElement>('[aria-controls="forum-admin-panel"]')?.focus({ preventScroll: true })
    }
    target.inert = true
    gsap.set(target, { [dimension]: target.getBoundingClientRect()[dimension], overflow: 'hidden' })
    record(() => gsap.to(target, { [dimension]: 0, opacity: 0, duration: reduced ? 0 : .26,
      ease: 'power2.inOut', overwrite: true, onComplete: done }))
  }

  function activeCategory(list: HTMLElement | undefined, indicator: HTMLElement | undefined, animate = true) {
    const active = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!active || !indicator) return
    const ready = indicator.dataset.ready === 'true'
    indicator.dataset.ready = 'true'
    record(() => gsap.to(indicator, { x: active.offsetLeft, width: active.offsetWidth, opacity: 1,
      duration: reduced || !ready || !animate ? 0 : .36, ease: 'back.out(1.15)', overwrite: true }))
  }

  onMounted(() => {
    context = gsap.context(() => {}, root.value)
    media = gsap.matchMedia()
    media.add({ reduce: '(prefers-reduced-motion: reduce)', normal: '(prefers-reduced-motion: no-preference)', hover: '(hover: hover) and (pointer: fine)' }, state => {
      reduced = !!state.conditions?.reduce
      hoverable = !!state.conditions?.hover && !reduced
      // Finish an in-flight transition when the user's motion preference changes.
      for (const tween of context?.getTweens() ?? []) if (tween.isActive()) tween.progress(1)
      for (const icon of followers.keys()) gsap.set(icon, { x: 0, y: 0, scale: 1 })
      followers.clear()
    })
    const surface = root.value
    if (!surface) return
    const control = (event: Event) => (event.target as Element | null)?.closest<HTMLElement>('[data-forum-control]')
    const iconOf = (target: HTMLElement | undefined | null) => target?.querySelector<HTMLElement>('[data-forum-icon]')
    const listen = (target: EventTarget, name: string, handler: EventListener) => {
      target.addEventListener(name, handler)
      listeners.push(() => target.removeEventListener(name, handler))
    }
    // A clipped disc grows from the entry point and retracts toward the exit.
    // Only this inner layer moves; the 44px hit target stays fixed.
    function wash(event: Event, entering: boolean, keyboard = false) {
      const target = control(event)
      const disc = target?.querySelector<HTMLElement>('[data-forum-wash]')
      if (!target || !disc || entering && (target as HTMLButtonElement).disabled) return
      const pointer = event as PointerEvent
      if (!keyboard && (pointer.pointerType !== 'mouse' || !hoverable && !reduced)) return
      if (target.contains(pointer.relatedTarget as Node | null)) return
      const bounds = target.getBoundingClientRect()
      const x = keyboard ? bounds.width / 2 : Math.max(0, Math.min(bounds.width, pointer.clientX - bounds.left))
      const y = keyboard ? bounds.height / 2 : Math.max(0, Math.min(bounds.height, pointer.clientY - bounds.top))
      const size = Math.hypot(bounds.width, bounds.height) * 2
      record(() => {
        gsap.set(disc, { width: size, height: size })
        if (Number(gsap.getProperty(disc, 'scaleX')) < .01) gsap.set(disc, { left: x, top: y })
        gsap.to(disc, { left: x, top: y, scale: entering ? 1 : 0,
          duration: reduced ? 0 : entering ? .38 : .3, ease: 'power3.out', overwrite: true })
      })
    }
    listen(surface, 'pointerover', event => wash(event, true))
    listen(surface, 'pointerout', event => wash(event, false))
    listen(surface, 'focusin', event => {
      if ((event.target as Element).matches(':focus-visible')) wash(event, true, true)
    })
    listen(surface, 'focusout', event => wash(event, false, true))
    listen(surface, 'pointermove', event => {
      const pointer = event as PointerEvent
      if (!hoverable || pointer.pointerType !== 'mouse') return
      const target = control(event)
      const icon = iconOf(target)
      if (!target || !icon || (target as HTMLButtonElement).disabled) return
      let follower = followers.get(icon)
      if (!follower) record(() => {
        follower = { x: gsap.quickTo(icon, 'x', { duration: .2, ease: 'power2.out' }),
          y: gsap.quickTo(icon, 'y', { duration: .2, ease: 'power2.out' }) }
        followers.set(icon, follower)
      })
      const bounds = target.getBoundingClientRect()
      follower?.x(Math.max(-3, Math.min(3, (pointer.clientX - bounds.left - bounds.width / 2) * .1)))
      follower?.y(Math.max(-3, Math.min(3, (pointer.clientY - bounds.top - bounds.height / 2) * .1)))
    })
    listen(surface, 'pointerout', event => {
      const target = control(event)
      if (target?.contains((event as PointerEvent).relatedTarget as Node | null)) return
      const icon = iconOf(target)
      const follower = icon && followers.get(icon)
      if (follower) { follower.x(0); follower.y(0) }
    })
    listen(surface, 'pointerdown', event => {
      const target = control(event)
      const icon = iconOf(target)
      if (!icon || reduced || (target as HTMLButtonElement)?.disabled) return
      pressed.add(icon)
      record(() => gsap.to(icon, { scale: .9, duration: .12, overwrite: 'auto' }))
    })
    const release = () => {
      for (const icon of pressed) record(() => gsap.to(icon, { scale: 1,
        duration: reduced ? 0 : .3, ease: 'back.out(1.6)', overwrite: 'auto' }))
      pressed.clear()
    }
    listen(document, 'pointerup', release)
    listen(document, 'pointercancel', release)
    for (const name of ['focusin', 'focusout']) listen(surface, name, event => {
      if (!(event.target as Element).matches('[data-forum-search]')) return
      const icon = surface.querySelector('[data-search-icon]')
      record(() => gsap.to(icon, { scale: name === 'focusin' ? 1.08 : 1,
        duration: reduced ? 0 : .16, ease: 'power2.out', overwrite: true }))
    })
  })

  onBeforeUnmount(() => {
    disposed = true
    listeners.forEach(remove => remove())
    observers.forEach(observer => observer.disconnect())
    media?.revert()
    context?.revert()
    followers.clear()
  })

  return {
    beforeInline: (element: Element) => prepare(element, 'width'),
    enterInline: (element: Element, done: () => void) => { (element as HTMLElement).inert = false; expand(element, done, 'width') },
    leaveInline: (element: Element, done: () => void) => collapse(element, done, 'width'),
    beforePanel: (element: Element) => prepare(element, 'height'),
    enterPanel: (element: Element, done: () => void) => { (element as HTMLElement).inert = false; expand(element, done, 'height') },
    leavePanel: (element: Element, done: () => void) => collapse(element, done, 'height'),
    stop, activeCategory,
  }
}
