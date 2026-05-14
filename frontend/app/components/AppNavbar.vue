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
              @pointerdown="onButtonPointerDown"
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
              @pointerdown="onButtonPointerDown"
            >
              Login
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="btn btn--primary navbar__cta navbar__magnetic"
              @pointermove="onMagnetMove"
              @pointerleave="resetMagnet"
              @pointerdown="onButtonPointerDown"
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
const isMenuOpen = ref(false)

function closeMenu() {
  isMenuOpen.value = false
}

function onButtonPointerDown(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  target.style.setProperty('--ripple-x', `${x}px`)
  target.style.setProperty('--ripple-y', `${y}px`)
  target.classList.remove('is-rippling')
  void target.offsetWidth
  target.classList.add('is-rippling')
}

function onMagnetMove(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const dx = event.clientX - (rect.left + rect.width / 2)
  const dy = event.clientY - (rect.top + rect.height / 2)
  const magnetStrength = 0.18
  const maxOffset = 7

  const x = Math.max(Math.min(dx * magnetStrength, maxOffset), -maxOffset)
  const y = Math.max(Math.min(dy * magnetStrength, maxOffset), -maxOffset)

  target.style.setProperty('--magnet-x', `${x}px`)
  target.style.setProperty('--magnet-y', `${y}px`)
}

function resetMagnet(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  target.style.setProperty('--magnet-x', '0px')
  target.style.setProperty('--magnet-y', '0px')
}
</script>
