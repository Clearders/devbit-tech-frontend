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
  change: (control: DockControl, docked: boolean) => void
}) {
  const state = { search: false, sort: false }
  let frame = 0
  let disposed = false
  const observer = new ResizeObserver(schedule)
  function update() {
    frame = 0
    if (disposed) return
    const navigation = options.navigation()?.getBoundingClientRect()
    // Read both source boxes before changes can resize the navigation.
    const next = (['search', 'sort'] as const).map(control => {
      const source = options.source(control)
      if (!options.enabled() || !navigation || !source) return [control, false] as const
      if (control === 'search' && options.composing()) return [control, state[control]] as const
      return [control, sourceTop(source) <= navigation.bottom + (state[control] ? 8 : 0)] as const
    })
    for (const [control, docked] of next) {
      if (state[control] === docked) continue
      state[control] = docked
      options.change(control, docked)
    }
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(update)
  }
  function refresh() {
    if (disposed) return
    observer.disconnect()
    for (const element of [options.navigation(), options.source('search'), options.source('sort')]) {
      if (element) observer.observe(element)
    }
    schedule()
  }
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  window.visualViewport?.addEventListener('resize', schedule)
  refresh()
  return {
    schedule, refresh,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
    },
  }
}
