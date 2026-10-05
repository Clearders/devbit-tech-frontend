/** Preserve scroll while a popup is edited, animating out, or handing off. */
export function createForumPopupLayout(onRelease: () => void) {
  let reservation: { element: HTMLElement; height: string; priority: string } | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  function restore() {
    if (!reservation) return
    const { element, height, priority } = reservation
    if (height) element.style.setProperty('min-height', height, priority)
    else element.style.removeProperty('min-height')
    reservation = undefined
    onRelease()
  }
  function cancelRelease() { clearTimeout(timer); timer = undefined }
  return {
    hold(element: HTMLElement) {
      if (disposed) return
      cancelRelease()
      if (reservation?.element === element) return
      restore()
      reservation = { element, height: element.style.getPropertyValue('min-height'), priority: element.style.getPropertyPriority('min-height') }
      element.style.setProperty('min-height', `${Math.ceil(element.getBoundingClientRect().height)}px`, reservation.priority)
    },
    release(delay = 0) {
      cancelRelease()
      if (delay && reservation && !disposed) timer = setTimeout(() => { timer = undefined; restore() }, delay)
      else restore()
    },
    dispose() {
      disposed = true
      cancelRelease()
      restore()
    },
  }
}
