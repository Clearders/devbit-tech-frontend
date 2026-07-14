<script setup lang="ts">
import AppNavbar from "~/components/AppNavbar.vue"
import AppFooter from "~/components/AppFooter.vue"

const { isAuthenticated } = useAuth()
</script>

<template>
  <div class="site-layout">
    <AppNavbar />
    <main class="site-layout__main">
      <slot />
    </main>
    <AppFooter />
    <ClientOnly>
      <LazyForumMessagePanel v-if="isAuthenticated" />
    </ClientOnly>
  </div>
</template>
