<template>
  <nav class="navbar" aria-label="主导航" @keydown.esc="dismissMenu">
    <div class="navbar__group" :class="{ 'navbar__group--forum': forumEnabled }">
      <div ref="island" class="container navbar__island" :class="{ 'navbar__island--open': isMenuOpen }">
        <span class="navbar__skin" aria-hidden="true"></span>
        <NuxtLink to="/" class="navbar__brand">
          <span>Dev</span>Bit Tech
        </NuxtLink>
        <button
          ref="menuToggle"
          class="navbar__menu-toggle"
          type="button"
          :aria-expanded="isMenuOpen"
          aria-controls="navigation-menu"
          :aria-label="isMenuOpen ? '收起导航菜单' : '展开导航菜单'"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div v-if="forumEnabled && searchDocked && isMobile" class="navbar__mobile-search"><ForumNavbarSearch /></div>
        <div id="navigation-menu" class="navbar__right">
          <div ref="tabs" class="navbar__tabs">
            <span ref="activeBubble" class="navbar__indicator" :class="{ 'navbar__indicator--ready': indicator.ready }" :style="indicatorStyle" aria-hidden="true">
              <span :key="activePath" class="navbar__indicator-shine"></span>
            </span>
            <ul class="navbar__links">
              <template v-for="item in visibleItems" :key="item.path">
                <li>
                  <NuxtLink :to="item.path" :class="{ 'is-selected': activePath === item.path }" :aria-current="activePath === item.path ? 'page' : undefined"
                    @pointerenter="onTabMagnetMove" @pointermove="onTabMagnetMove"
                    @pointerleave="resetTabMagnet" @pointercancel="resetTabMagnet" @blur="resetTabMagnet" @click="closeMenu">
                    <span class="navbar__label"><span class="navbar__label-text">{{ item.label }}</span></span>
                  </NuxtLink>
                </li>
                <li v-if="item.path === '/' && forumEnabled && searchDocked && !isMobile" class="navbar__search-slot">
                  <ForumNavbarSearch />
                </li>
              </template>
            </ul>
          </div>

          <div id="navigation-account" class="navbar__auth">
            <template v-if="isResolving">
              <span class="navbar__user">Checking session...</span>
            </template>
            <template v-else-if="isAuthenticated">
              <div class="navbar__user-area">
                <NuxtLink to="/settings" class="navbar__avatar-link" title="账户设置">
                  <AvatarImage
                    :avatar-url="user?.avatarUrl"
                    :avatar="userInitials"
                    :name="user?.name ?? ''"
                    size="sm"
                  />
                </NuxtLink>
                <span class="navbar__user">{{ user?.name }}</span>
              </div>
              <button
                class="btn btn--outline navbar__logout navbar__magnetic"
                @pointermove="onMagnetMove"
                @pointerleave="resetMagnet"
                @pointerdown="onPointerDown"
                @click="logout"
              >
                Logout
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="btn btn--outline navbar__cta navbar__magnetic"
                @pointermove="onMagnetMove"
                @pointerleave="resetMagnet"
                @pointerdown="onPointerDown"
              >
                Login
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="btn btn--primary navbar__cta navbar__magnetic"
                @pointermove="onMagnetMove"
                @pointerleave="resetMagnet"
                @pointerdown="onPointerDown"
              >
                Register
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
      <div v-if="forumEnabled" ref="sortTarget" class="navbar__sort-slot" :class="{ 'is-docked': sortDocked }"
        :inert="!sortDocked" :aria-hidden="!sortDocked">
        <ForumSortMenu v-model="sortMode" compact :active="sortDocked" :dismiss="popup === 'search'" @open-change="controls.setSortOpen" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import AvatarImage from '~/components/AvatarImage.vue'
import { navigationItems, navigationIndex } from '~/utils/navigation'

const { isAuthenticated, isResolving, user, logout } = useAuth()
const { windowWidth } = useBreakpoint()
const isMobile = computed(() => windowWidth.value <= 760)
const { onPointerDown, onMagnetMove, resetMagnet } = useMagneticButton()
const isMenuOpen = ref(false)
const menuToggle = ref<HTMLButtonElement>()
const router = useRouter()
const route = router.currentRoute
const controls = useForumControls()
const { enabled: forumEnabled, navigation: island, searchDocked, sortDocked, sortTarget, sortMode, popup, navbarTransitioning } = controls
const tabs = ref<HTMLElement>()
const activeBubble = ref<HTMLElement>()
const visibleItems = computed(() => navigationItems.filter(item => !item.authenticated || isAuthenticated.value))
const activePath = computed(() => navigationItems[navigationIndex(route.value.path)]?.path)
const indicator = reactive({ left: 0, top: 0, width: 0, height: 0, ready: false })
const indicatorStyle = computed(() => ({
  left: `${indicator.left}px`, top: `${indicator.top}px`,
  width: `${indicator.width}px`, height: `${indicator.height}px`,
  opacity: activePath.value && indicator.ready ? 1 : 0,
}))
let resizeObserver: ResizeObserver | undefined
let islandAnimation: Animation | undefined
let disposed = false
let magneticTab: HTMLElement | undefined
let magneticMedia: MediaQueryList | undefined

function resetTabMagnet() {
  for (const element of [magneticTab, activeBubble.value]) {
    element?.classList.remove('is-magnetic')
    element?.style.removeProperty('--tab-magnet-x')
    element?.style.removeProperty('--tab-magnet-y')
  }
  magneticTab = undefined
}

function onTabMagnetMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !magneticMedia?.matches) return
  const target = event.currentTarget as HTMLElement
  if (magneticTab !== target) resetTabMagnet()
  magneticTab = target
  // The link stays still as the hit target; only its text and bubble move.
  // This avoids a feedback loop when the pointer rests near an edge.
  const bounds = target.getBoundingClientRect()
  const x = Math.max(-6, Math.min(6, (event.clientX - bounds.left - bounds.width / 2) * 0.24))
  const y = Math.max(-3, Math.min(3, (event.clientY - bounds.top - bounds.height / 2) * 0.24))
  const elements = target.classList.contains('is-selected') ? [target, activeBubble.value] : [target]
  for (const element of elements) {
    element?.classList.add('is-magnetic')
    element?.style.setProperty('--tab-magnet-x', `${x}px`)
    element?.style.setProperty('--tab-magnet-y', `${y}px`)
  }
}

function updateIndicator() {
  const container = tabs.value
  const active = container?.querySelector<HTMLElement>('a.is-selected')
  if (!container || !active) return
  Object.assign(indicator, {
    // Layout offsets ignore hover lifts and the island's elastic transform.
    left: active.offsetLeft, top: active.offsetTop,
    width: active.offsetWidth, height: active.offsetHeight, ready: true,
  })
  if (isMobile.value) {
    container.scrollTo({ left: active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
}

watch(activePath, () => {
  resetTabMagnet()
  updateIndicator()
  islandAnimation?.cancel()
  if (!navbarTransitioning.value && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    islandAnimation = island.value?.animate([
      { transform: 'scale(1)' }, { transform: 'scale(1.012, 0.97)', offset: 0.3 },
      { transform: 'scale(0.998, 1.015)', offset: 0.65 }, { transform: 'scale(1)' },
    ], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' })
  }
}, { flush: 'post' })
watch(visibleItems, async () => { await nextTick(); updateIndicator() })
watch(searchDocked, updateIndicator, { flush: 'post' })
watch(isMenuOpen, async () => { await nextTick(); updateIndicator() })
onMounted(() => {
  magneticMedia = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  magneticMedia.addEventListener('change', resetTabMagnet)
  updateIndicator()
  resizeObserver = new ResizeObserver(updateIndicator)
  if (tabs.value) resizeObserver.observe(tabs.value)
  if (island.value) resizeObserver.observe(island.value)
  document.fonts.ready.then(() => { if (!disposed) updateIndicator() })
  document.addEventListener('pointerdown', onOutsideMenu)
  document.addEventListener('focusin', onOutsideMenu)
})

const userInitials = computed(() => {
  const name = user.value?.name ?? ''
  const upper = name.replace(/[^A-Z]/g, '').slice(0, 2)
  if (upper.length >= 2) return upper
  if (upper.length === 1) {
    const lower = name.replace(/[^a-z]/g, '')
    return upper + (lower[0]?.toUpperCase() ?? '')
  }
  return name.slice(0, 2).toUpperCase() || '??'
})

// Close menu on route change (mobile)
watch(() => route.value.fullPath, () => {
  isMenuOpen.value = false
})

// Close menu on window resize to desktop
watch(isMobile, (mobile) => {
  if (!mobile) {
    isMenuOpen.value = false
  }
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  islandAnimation?.cancel()
  magneticMedia?.removeEventListener('change', resetTabMagnet)
  resetTabMagnet()
  document.removeEventListener('pointerdown', onOutsideMenu)
  document.removeEventListener('focusin', onOutsideMenu)
})

function closeMenu() {
  isMenuOpen.value = false
}
function dismissMenu() {
  if (!isMenuOpen.value) return
  closeMenu()
  menuToggle.value?.focus({ preventScroll: true })
}
function toggleMenu() {
  popup.value = null
  isMenuOpen.value = !isMenuOpen.value
}
function onOutsideMenu(event: Event) {
  if (isMenuOpen.value && !island.value?.contains(event.target as Node)) closeMenu()
}
watch(popup, value => { if (value) closeMenu() })
</script>
