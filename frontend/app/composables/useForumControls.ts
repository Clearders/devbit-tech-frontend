import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import type { InjectionKey } from 'vue'
import { createForumDockController } from '~/utils/forumDock'
import type { DockControl } from '~/utils/forumDock'
import { createForumPopupLayout } from '~/utils/forumPopupLayout'
import { createForumDockMotion } from '~/utils/forumDockMotion'

export type ForumSortMode = 'latest' | 'active' | 'views' | 'likes'
type ForumControls = ReturnType<typeof provideForumControls>
const key: InjectionKey<ForumControls> = Symbol('forum-controls')

export function provideForumControls() {
  const route = useRoute()
  const router = useRouter()
  const nuxtApp = useNuxtApp()
  const enabled = computed(() => router.currentRoute.value.path.replace(/\/$/, '') === '/forum')
  const navigation = shallowRef<HTMLElement>()
  const searchSource = shallowRef<HTMLElement>()
  const sortSource = shallowRef<HTMLElement>()
  const searchTarget = shallowRef<HTMLButtonElement>()
  const sortTarget = shallowRef<HTMLElement>()
  const searchDocked = ref(false)
  const sortDocked = ref(false)
  const navbarTransitioning = ref(false)
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
  const dockMotion = createForumDockMotion(() => navigation.value, () => !!motion?.matches)
  const revisions = { search: 0, sort: 0 }
  let navbarRevision = 0
  const routeDisposers: (() => void)[] = []
  const popupLayout = createForumPopupLayout(() => controller?.schedule())
  watch(popup, owner => {
    if (!owner) { popupLayout.release(enabled.value ? 400 : 0); return }
    const element = searchSource.value?.closest<HTMLElement>('.forum-page')
    if (element) popupLayout.hold(element)
  }, { flush: 'sync' })
  const source = (control: DockControl) => control === 'search' ? searchSource.value : sortSource.value
  const target = (control: DockControl) => control === 'search' ? searchTarget.value
    : sortTarget.value?.querySelector<HTMLButtonElement>('button') ?? undefined
  function stopFlights() {
    navbarRevision++
    navbarTransitioning.value = false
    dockMotion.stopAll()
  }
  async function change(control: DockControl, docked: boolean, animate = true) {
    const revision = ++revisions[control]
    if (!enabled.value) return
    if (!animate) stopFlights()
    if (control === 'search') {
      navbarRevision++
      navbarTransitioning.value = false
    }
    const from = docked ? source(control) : target(control)
    const snapshot = animate ? dockMotion.capture(control, from) : undefined
    const focused = !!from?.contains(document.activeElement)
      || popup.value === control && !!document.activeElement?.closest('[data-forum-popup]')
    if (popup.value === control) popup.value = null
    if (control === 'search') searchDocked.value = docked
    else sortDocked.value = docked
    if (!animate) return
    await nextTick()
    if (disposed || revisions[control] !== revision || !enabled.value) return
    const destination = docked ? target(control) : source(control)?.querySelector<HTMLElement>('input, button')
    if (focused) destination?.focus({ preventScroll: true })
    dockMotion.play(control, snapshot, destination, docked)
  }
  function setSortOpen(open: boolean) {
    if (open) popup.value = 'sort'
    else if (popup.value === 'sort') popup.value = null
  }
  onMounted(() => {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', stopFlights)
    window.addEventListener('resize', stopFlights, { passive: true })
    window.visualViewport?.addEventListener('resize', stopFlights, { passive: true })
    controller = createForumDockController({ navigation: () => navigation.value, source,
      enabled: () => enabled.value, composing: () => composing.value, change,
      docked: control => control === 'search' ? searchDocked.value : sortDocked.value,
      ready: () => !enabled.value || !!searchSource.value?.isConnected && !!sortSource.value?.isConnected
        && route.path === router.currentRoute.value.path,
      blocked: () => !!navigation.value?.closest('.site-layout')?.querySelector(
        '.site-layout__main [data-route-direction], .site-layout__main .page-enter-active, .site-layout__main .page-leave-active'),
    })
    const resume = () => controller?.resume()
    routeDisposers.push(
      router.beforeResolve((to, from) => { if (to.path !== from.path) controller?.suspend() }),
      router.afterEach((to, from, failure) => { if (failure || to.path !== from.path) resume() }),
      router.onError(resume),
      nuxtApp.hook('page:finish', resume),
      nuxtApp.hook('page:transition:finish', resume),
      nuxtApp.hook('app:error', resume),
    )
    controller.suspend()
    controller.resume()
  })
  watch([navigation, searchSource, sortSource, enabled, () => route.path], () => controller?.refresh(), { flush: 'post' })
  watch(composing, () => controller?.schedule(), { flush: 'post' })
  watch(enabled, async active => {
    // Capture the current paint before Vue removes the docked controls.
    const snapshot = dockMotion.captureNavbar()
    stopFlights()
    const revision = navbarRevision
    revisions.search++
    revisions.sort++
    searchDocked.value = false
    sortDocked.value = false
    if (!active) {
      popup.value = null
      composing.value = false
      popupLayout.release()
    }
    navbarTransitioning.value = !!snapshot
    await nextTick()
    if (disposed || revision !== navbarRevision) return
    dockMotion.animateNavbar(snapshot, () => {
      if (revision === navbarRevision) navbarTransitioning.value = false
    })
  })
  onBeforeUnmount(() => {
    disposed = true
    controller?.dispose()
    routeDisposers.forEach(dispose => dispose())
    motion?.removeEventListener('change', stopFlights)
    window.removeEventListener('resize', stopFlights)
    window.visualViewport?.removeEventListener('resize', stopFlights)
    stopFlights()
    popupLayout.dispose()
  })
  const controls = { enabled, navigation, searchSource, sortSource, searchTarget, sortTarget,
    searchDocked, sortDocked, navbarTransitioning, composing, popup, searchQuery, sortMode, setSortOpen }
  provide(key, controls)
  return controls
}

export function useForumControls() {
  const controls = inject(key)
  if (!controls) throw new Error('Forum controls require the default layout')
  return controls
}
