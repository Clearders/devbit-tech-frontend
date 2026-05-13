<template>
  <nav class="navbar">
    <div class="container">
      <NuxtLink to="/" class="navbar__brand">
        <span>Dev</span>Bit Tech
      </NuxtLink>
      <div class="navbar__right">
        <ul class="navbar__links">
          <li><NuxtLink to="/">首页</NuxtLink></li>
          <li><NuxtLink to="/forum">论坛</NuxtLink></li>
          <li><NuxtLink to="/games">游戏</NuxtLink></li>
          <li><NuxtLink to="/leaderboard">排行榜</NuxtLink></li>
          <li><NuxtLink to="/about">团队介绍</NuxtLink></li>
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
