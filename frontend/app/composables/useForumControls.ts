import { gsap } from 'gsap'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import type { InjectionKey } from 'vue'
import { createForumDockController } from '~/utils/forumDock'
import type { DockControl } from '~/utils/forumDock'
import { createForumPopupLayout } from '~/utils/forumPopupLayout'

export type ForumSortMode = 'latest' | 'active' | 'views' | 'likes'
type ForumControls = ReturnType<typeof provideForumControls>
const key: InjectionKey<ForumControls> = Symbol('forum-controls')

export function provideForumControls() {
  const route = useRoute()
  const router = useRouter()
  const enabled = computed(() => route.path.replace(/\/$/, '') === '/forum')
  const navigation = shallowRef<HTMLElement>()
  const searchSource = shallowRef<HTMLElement>()
  const sortSource = shallowRef<HTMLElement>()
  const searchTarget = shallowRef<HTMLButtonElement>()
  const sortTarget = shallowRef<HTMLElement>()
  const searchDocked = ref(false)
  const sortDocked = ref(false)
  const composing = ref(false)
  const popup = ref<'search' | 'sort' | null>(null)
  const searchQuery = computed<string>({
    get: () => typeof route.query.q === 'string' ? route.query.q : '',
    set: (q: string) => {
      if (q !== searchQuery.value) void router.replace({ query: { ...route.query, q: q || undefined } })
    },
  })
  const sortMode = computed<ForumSortMode>({
    get: () => typeof route.query.sort === 'string' && ['latest', 'active', 'views', 'likes'].includes(route.query.sort)
      ? route.query.sort as ForumSortMode : 'latest',
    set: (sort: ForumSortMode) => { void router.push({ query: { ...route.query, sort: sort === 'latest' ? undefined : sort } }) },
  })
  let controller: ReturnType<typeof createForumDockController> | undefined
  let disposed = false
  let motion: MediaQueryList | undefined
  const flights = new Map<DockControl, { element: HTMLElement; tween: gsap.core.Tween }>()
  const revisions = { search: 0, sort: 0 }
  const popupLayout = createForumPopupLayout(() => controller?.schedule())
  watch(popup, owner => {
    if (!owner) { popupLayout.release(enabled.value ? 400 : 0); return }
    const element = searchSource.value?.closest<HTMLElement>('.forum-page')
    if (element) popupLayout.hold(element)
  }, { flush: 'sync' })
  const source = (control: DockControl) => control === 'search' ? searchSource.value : sortSource.value
  const target = (control: DockControl) => control === 'search' ? searchTarget.value
    : sortTarget.value?.querySelector<HTMLButtonElement>('button') ?? undefined
  function stopFlight(control: DockControl) {
    const flight = flights.get(control)
    flight?.tween.kill()
    flight?.element.remove()
    flights.delete(control)
  }
  function stopFlights() { stopFlight('search'); stopFlight('sort') }
  async function change(control: DockControl, docked: boolean) {
    const revision = ++revisions[control]
    stopFlight(control)
    const from = docked ? source(control) : target(control)
    const fromBounds = from?.getBoundingClientRect()
    const focused = !!from?.contains(document.activeElement)
      || popup.value === control && !!document.activeElement?.closest('[data-forum-popup]')
    const icon = from?.querySelector('svg')?.cloneNode(true)
    if (popup.value === control) popup.value = null
    if (control === 'search') searchDocked.value = docked
    else sortDocked.value = docked
    await nextTick()
    if (disposed || revisions[control] !== revision || !enabled.value) return
    const destination = docked ? target(control) : source(control)?.querySelector<HTMLElement>('input, button')
    if (focused) destination?.focus({ preventScroll: true })
    if (!fromBounds || !destination || motion?.matches) return
    const bounds = destination.getBoundingClientRect()
    const element = document.createElement('div')
    element.className = 'forum-dock-flight'
    element.inert = true
    element.setAttribute('aria-hidden', 'true')
    if (icon) element.append(icon)
    document.body.append(element)
    gsap.set(element, { left: fromBounds.left, top: fromBounds.top, width: fromBounds.width, height: fromBounds.height })
    const tween = gsap.to(element, { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
      opacity: 0, borderRadius: control === 'search' && docked ? 24 : 8, duration: .34, ease: 'power3.inOut',
      onComplete: () => { element.remove(); flights.delete(control) } })
    flights.set(control, { element, tween })
  }
  function setSortOpen(open: boolean) {
    if (open) popup.value = 'sort'
    else if (popup.value === 'sort') popup.value = null
  }
  onMounted(() => {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', stopFlights)
    controller = createForumDockController({ navigation: () => navigation.value, source,
      enabled: () => enabled.value, composing: () => composing.value, change })
  })
  watch([navigation, searchSource, sortSource, enabled], () => controller?.refresh(), { flush: 'post' })
  watch(composing, () => controller?.schedule(), { flush: 'post' })
  watch(enabled, active => {
    if (!active) {
      popup.value = null
      composing.value = false
      popupLayout.release()
      stopFlights()
    }
  })
  onBeforeUnmount(() => {
    disposed = true
    controller?.dispose()
    motion?.removeEventListener('change', stopFlights)
    stopFlights()
    popupLayout.dispose()
  })
  const controls = { enabled, navigation, searchSource, sortSource, searchTarget, sortTarget,
    searchDocked, sortDocked, composing, popup, searchQuery, sortMode, setSortOpen }
  provide(key, controls)
  return controls
}

export function useForumControls() {
  const controls = inject(key)
  if (!controls) throw new Error('Forum controls require the default layout')
  return controls
}
