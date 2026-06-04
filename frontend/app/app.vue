<script setup lang="ts">
// Nuxt 4 global SEO: useHead for app-level meta overrides
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  link: [
    // PNG favicon (96x96, 优先使用 — 现代浏览器首选)
    { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png?v=20260604' },
    // SVG favicon (现代浏览器暗色模式备用)
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=20260604' },
    // ICO favicon (旧浏览器兼容)
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=20260604', sizes: '48x48' },
    // Apple touch icon (iOS Safari 主屏, 180x180)
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=20260604' },
    // Web app manifest (Android Chrome, PWA)
    { rel: 'manifest', href: '/site.webmanifest?v=20260604' },
    // Preconnect for Google Fonts
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    // Async font loading — non-blocking, uses system font until loaded
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap', media: 'print', onload: 'this.onload=null;this.media="all"' },
  ],
  meta: [
    { name: 'theme-color', content: '#f7f5f2' },
    { name: 'color-scheme', content: 'light' },
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
