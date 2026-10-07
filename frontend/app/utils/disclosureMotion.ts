/** Animate native details without unmounting its fields or hiding a closing frame. */
export function createDisclosureMotion(details: HTMLDetailsElement, clip: HTMLElement, content: HTMLElement,
  options: { rendered: (open: boolean) => void; reduced: () => boolean }) {
  let animation: Animation | undefined
  let desired = details.open
  let disposed = false

  function cancel() {
    if (!animation) return
    animation.onfinish = null
    animation.cancel()
    animation = undefined
  }
  function settle() {
    cancel()
    details.open = desired
    options.rendered(desired)
    clip.style.removeProperty('height')
    clip.style.removeProperty('opacity')
    clip.style.removeProperty('overflow')
  }
  function setOpen(open: boolean, animate = true) {
    if (disposed) return
    const height = details.open ? clip.getBoundingClientRect().height : 0
    const opacity = details.open ? Number(clip.ownerDocument.defaultView?.getComputedStyle(clip).opacity ?? 1) : 0
    desired = open
    cancel()
    if (!animate || options.reduced() || typeof clip.animate !== 'function') { settle(); return }

    // Keep the native content visible while closing; make it inaccessible in the component.
    details.open = true
    options.rendered(true)
    const target = open ? content.getBoundingClientRect().height : 0
    if (Math.abs(target - height) < .5) { settle(); return }
    clip.style.height = `${height}px`
    clip.style.overflow = 'hidden'
    const current = clip.animate([
      { height: `${height}px`, opacity },
      { height: `${target}px`, opacity: open ? 1 : 0 },
    ], { duration: open ? 300 : 240, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' })
    animation = current
    current.onfinish = () => { if (animation === current && !disposed) settle() }
  }
  return {
    setOpen,
    resize() { if (animation && desired) setOpen(true) },
    finish: settle,
    dispose() { settle(); disposed = true },
  }
}
