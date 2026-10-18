<script setup lang="ts">
import AppNavbar from "~/components/AppNavbar.vue"
import AppFooter from "~/components/AppFooter.vue"

const { isAuthenticated } = useAuth()
const isMockPreview = import.meta.dev && useRuntimeConfig().public.socialMode === 'mock'
const mainContent = ref<HTMLElement>()
provideForumControls()
useScrollReveal(mainContent)
</script>

<template>
  <div class="site-layout">
    <AppNavbar />
    <main ref="mainContent" class="site-layout__main">
      <slot />
    </main>
    <p v-if="isMockPreview" class="dev-banner">本地演示 · 社交操作使用 Mock，帖子为只读样例</p>
    <AppFooter />
    <ClientOnly>
      <LazyForumMessagePanel v-if="isAuthenticated" />
    </ClientOnly>
  </div>
</template>
