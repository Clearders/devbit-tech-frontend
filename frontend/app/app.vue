<script setup lang="ts">
// Nuxt 4 global SEO: useHead for app-level meta overrides
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  ],
  meta: [
    { name: 'theme-color', content: '#090a0f' },
    { name: 'color-scheme', content: 'dark' },
    { property: 'og:site_name', content: 'DevBit Tech' },
  ],
})
</script>
<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <div class="app-shell__background" aria-hidden="true">
      <DynamicBackground layer="base" />
    </div>
    <div class="app-shell__content">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
    <div class="app-shell__overlay" aria-hidden="true">
      <DynamicBackground layer="overlay" />
    </div>
  </div>
</template>
