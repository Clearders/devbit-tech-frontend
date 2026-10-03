<script setup lang="ts">
const route = useRoute()
const isGameLayout = computed(() => route.meta.layout === 'game')
const pageTransition = usePageTransition()
</script>

<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <StartupLoader v-if="!isGameLayout" />
    <NuxtLoadingIndicator
      v-if="!isGameLayout"
      :height="2"
      :throttle="200"
      :hide-delay="180"
      :color="false"
      error-color="#e0737a"
      aria-hidden="true"
    />
    <div class="app-shell__background" aria-hidden="true">
      <DynamicBackground layer="base" />
    </div>
    <div class="app-shell__content">
      <NuxtLayout>
        <NuxtPage :transition="pageTransition" />
      </NuxtLayout>
    </div>
    <div class="app-shell__overlay" aria-hidden="true">
      <DynamicBackground layer="overlay" />
    </div>
  </div>
</template>
