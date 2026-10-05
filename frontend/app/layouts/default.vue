<script setup lang="ts">
import AppNavbar from "~/components/AppNavbar.vue"
import AppFooter from "~/components/AppFooter.vue"

const { isAuthenticated } = useAuth()
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
    <AppFooter />
    <ClientOnly>
      <LazyForumMessagePanel v-if="isAuthenticated" />
    </ClientOnly>
  </div>
</template>
