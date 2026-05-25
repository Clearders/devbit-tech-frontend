const apiProxyTarget = (
  process.env.NUXT_API_PROXY_TARGET ?? 'http://127.0.0.1:7878'
).replace(/\/$/, '')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  // Nuxt 4 defaults: enable directory-based auto-imports
  future: {
    compatibilityVersion: 4,
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api',
    },
  },

  routeRules: {
    '/api/**': {
      proxy: `${apiProxyTarget}/api/**`,
    },
  },

  devtools: { enabled: true },

  // Nuxt 4 app configuration
  app: {
    head: {
      title: 'DevBit Tech',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'DevBit Tech 是一个面向开发者的 Beta 社区，汇集论坛讨论、小游戏、排行榜与团队介绍。' },
        { name: 'theme-color', content: '#090a0f' },
        { name: 'color-scheme', content: 'dark' },
        { property: 'og:title', content: 'DevBit Tech' },
        { property: 'og:description', content: '面向开发者的 Beta 社区' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
    buildAssetsDir: '/_nuxt/',
  },

  // CSS: import in app instead for better HMR
  css: ['~/assets/css/main.css'],

  // Nuxt 4 optimizations
  experimental: {
    viewTransition: true,
    renderJsonPayloads: true,
    asyncContext: true,
    headNext: true,
  },

  // Performance
  nitro: {
    compressPublicAssets: true,
    minify: true,
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  // TypeScript strict
  typescript: {
    strict: true,
    typeCheck: false, // set true for CI
  },

  // Vite optimizations
  vite: {
    css: {
      devSourcemap: true,
    },
  },
})
