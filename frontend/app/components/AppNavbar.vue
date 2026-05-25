<template>
  <nav class="navbar">
    <div class="container">
      <NuxtLink to="/" class="navbar__brand">
        <span>Dev</span>Bit Tech
      </NuxtLink>
      <button
        class="navbar__menu-toggle"
        type="button"
        :aria-expanded="isMenuOpen"
        aria-controls="primary-navigation"
        aria-label="Toggle navigation"
        @click="isMenuOpen = !isMenuOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div id="primary-navigation" class="navbar__right" :class="{ 'navbar__right--open': isMenuOpen }">
        <ul class="navbar__links">
          <li><NuxtLink to="/" @click="closeMenu">首页</NuxtLink></li>
          <li><NuxtLink to="/forum" @click="closeMenu">论坛</NuxtLink></li>
          <li><NuxtLink to="/games" @click="closeMenu">游戏</NuxtLink></li>
          <li><NuxtLink to="/leaderboard" @click="closeMenu">排行榜</NuxtLink></li>
          <li><NuxtLink to="/about" @click="closeMenu">团队介绍</NuxtLink></li>
        </ul>

        <div class="navbar__auth">
          <template v-if="isResolving">
            <span class="navbar__user">Checking session...</span>
          </template>
          <template v-else-if="isAuthenticated">
            <span class="navbar__user">{{ user?.name }}</span>
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
  </nav>
</template>

<script setup lang="ts">
const { isAuthenticated, isResolving, user, logout } = useAuth()
const { isMobile } = useBreakpoint()
const { onPointerDown, onMagnetMove, resetMagnet } = useMagneticButton()
const isMenuOpen = ref(false)
const route = useRoute()

// Close menu on route change (mobile)
watch(() => route.fullPath, () => {
  isMenuOpen.value = false
})

// Close menu on window resize to desktop
watch(isMobile, (mobile) => {
  if (!mobile) {
    isMenuOpen.value = false
  }
})

// Lock body scroll when mobile menu is open
watch(isMenuOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})

function closeMenu() {
  isMenuOpen.value = false
}
</script>
