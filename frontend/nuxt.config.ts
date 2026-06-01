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
    // Long-term cache for hashed static assets
    '/_nuxt/**': {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
      },
    },
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  // Nuxt 4 app configuration
  app: {
    head: {
      title: 'DevBit Tech',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'DevBit Tech 是一个面向开发者的 Beta 社区，汇集论坛讨论、小游戏、排行榜与团队介绍。' },
        { name: 'theme-color', content: '#f7f5f2' },
        { name: 'color-scheme', content: 'light' },
        { property: 'og:title', content: 'DevBit Tech' },
        { property: 'og:description', content: '面向开发者的 Beta 社区' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        // Async font loading — non-blocking, uses system font until loaded
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap', media: 'print', onload: 'this.onload=null;this.media="all"' },
      ],
    },
    pageTransition: { name: 'page', mode: 'default' },
    buildAssetsDir: '/_nuxt/',
  },

  // CSS: import in app instead for better HMR
  css: ['~/assets/css/main.css'],

  // Nuxt 4 optimizations
  experimental: {
    // viewTransition disabled: the browser's View Transition API snapshots the
    // entire viewport on every navigation, freezing the background canvas and
    // causing 130+ms frame drops. Vue's pageTransition (CSS-only, scoped to
    // <NuxtPage>) is sufficient and does not interfere with fixed-position canvas.
    viewTransition: false,
    renderJsonPayloads: true,
    asyncContext: true,
    headNext: true,
  },

  // Route prefetching: only prefetch links in viewport on idle
  router: {
    options: {
      linkPrefetchedClass: 'nuxt-link-prefetched',
    },
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

  // Build optimization
  vite: {
    build: {
      // Enable CSS code splitting for faster initial load
      cssMinify: 'esbuild',
      // Reduce chunk size warning threshold
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks(id: string) {
            // Group vendor libs separately for better cache
            if (id.includes('node_modules/markdown-it')) {
              return 'vendor-markdown'
            }
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
    },
    css: {
      devSourcemap: true,
    },
  },

  // TypeScript strict
  typescript: {
    strict: true,
    typeCheck: false, // set true for CI
  },
})