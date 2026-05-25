<script setup lang="ts">
import AppNavbar from "~/components/AppNavbar.vue"
import AppFooter from "~/components/AppFooter.vue"
import ForumMessagePanel from "~/components/ForumMessagePanel.vue"
</script>

<template>
  <div class="site-layout">
    <AppNavbar />
    <main class="site-layout__main">
      <slot />
    </main>
    <AppFooter />
    <ForumMessagePanel />
  </div>
</template>
