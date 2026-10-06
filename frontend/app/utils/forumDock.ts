export type DockControl = 'search' | 'sort'

function sourceTop(element: HTMLElement) {
  let top = 0
  // Scroll/route reveals transform ancestors; offsets retain the document position.
  for (let parent: HTMLElement | null = element; parent; parent = parent.offsetParent as HTMLElement | null) top += parent.offsetTop
  return top - window.scrollY
}

/** The source is a stationary layout box, never the animated inner field. */
export function createForumDockController(options: {
  navigation: () => HTMLElement | undefined
  source: (control: DockControl) => HTMLElement | undefined
  enabled: () => boolean
  composing: () => boolean
  ready?: () => boolean
  blocked?: () => boolean
  docked?: (control: DockControl) => boolean
  change: (control: DockControl, docked: boolean, animate: boolean) => void
}) {
  const state = { search: false, sort: false }
  let frame = 0
  let disposed = false
  let suspended = false
  let settling = false
  let initialized = true
  let stableFrames = 0
  let previousScroll = window.scrollY
  let userScrolling = false
  const observer = new ResizeObserver(schedule)
  function update() {
    frame = 0
    if (disposed || suspended || options.ready?.() === false) return
    if (settling && userScrolling) {
      // Start from the rendered state, which navigation may have reset already.
      for (const control of ['search', 'sort'] as const) state[control] = options.docked?.(control) ?? state[control]
      settling = false
      initialized = true
    }
    if (settling) {
      if (options.blocked?.() || previousScroll !== window.scrollY) stableFrames = 0
      else stableFrames++
      previousScroll = window.scrollY
      // Router scrolling can be smooth; establish the state only after it stops.
      if (stableFrames < 2) { schedule(); return }
      settling = false
    }
    const navigation = options.navigation()?.getBoundingClientRect()
    // Read both source boxes before changes can resize the navigation.
    const next = (['search', 'sort'] as const).map(control => {
      const source = options.source(control)
      if (!options.enabled() || !navigation || !source) return [control, false] as const
      if (control === 'search' && options.composing()) return [control, state[control]] as const
      return [control, sourceTop(source) <= navigation.bottom + (initialized && state[control] ? 8 : 0)] as const
    })
    for (const [control, docked] of next) {
      if (initialized && state[control] === docked) continue
      state[control] = docked
      options.change(control, docked, initialized)
    }
    initialized = true
  }
  function schedule() {
    if (!disposed && !suspended && !frame) frame = requestAnimationFrame(update)
  }
  function refresh() {
    if (disposed) return
    observer.disconnect()
    for (const element of [options.navigation(), options.source('search'), options.source('sort')]) {
      if (element) observer.observe(element)
    }
    schedule()
  }
  function onUserScroll(event: Event) {
    if (!event.isTrusted || !options.enabled() || !suspended && !settling || event.defaultPrevented) return
    if (event.type === 'wheel' && (event as WheelEvent).deltaY === 0) return
    if (event.type === 'keydown') {
      const key = (event as KeyboardEvent).key
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(key)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="option"], [role="listbox"]')
        || key === ' ' && target?.closest('button, a')) return
    }
    userScrolling = true
    schedule()
  }
  function onScrollbar(event: PointerEvent) {
    if (event.clientX >= document.documentElement.clientWidth) onUserScroll(event)
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('wheel', onUserScroll, { passive: true })
  window.addEventListener('touchmove', onUserScroll, { passive: true })
  window.addEventListener('keydown', onUserScroll)
  window.addEventListener('pointerdown', onScrollbar, { passive: true })
  window.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  refresh()
  return {
    schedule, refresh,
    suspend() {
      suspended = true
      settling = false
      initialized = false
      userScrolling = false
      cancelAnimationFrame(frame)
      frame = 0
    },
    resume() {
      if (disposed || !suspended && !settling) return
      suspended = false
      settling = true
      stableFrames = 0
      previousScroll = window.scrollY
      schedule()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchmove', onUserScroll)
      window.removeEventListener('keydown', onUserScroll)
      window.removeEventListener('pointerdown', onScrollbar)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    },
  }
}
