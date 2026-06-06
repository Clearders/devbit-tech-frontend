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
    // Icon & manifest assets: cache for 7 days (nginx also applies cache headers)
    '/**/*.{ico,svg,png,webmanifest}': {
      headers: { 'cache-control': 'public, max-age=604800' },
    },
    // ── Security headers for all routes ──────────────────────────────────────
    '/**': {
      headers: {
        // Content-Security-Policy: wasm-unsafe-eval required for Bevy WASM games
        'content-security-policy':
          "default-src 'self'; " +
          "script-src 'self' 'wasm-unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: blob:; " +
          "connect-src 'self' ws: wss:; " +
          "media-src 'self'; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  // Nuxt 4 app configuration — all head metadata consolidated here for SSR reliability
  app: {
    head: {
      title: 'DevBit Tech',
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        // Google Fonts: preconnect for faster font delivery
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        // Async font loading — non-blocking, falls back to system font
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap', media: 'print', onload: 'this.onload=null;this.media="all"' },
        // PNG favicon (96x96)
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png?v=20260604' },
        // SVG favicon (dark mode fallback)
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=20260604' },
        // ICO favicon (legacy browser fallback)
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=20260604', sizes: '48x48' },
        // Apple touch icon (iOS Safari home screen, 180x180)
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png?v=20260604' },
        // Web app manifest (Android Chrome, PWA)
        { rel: 'manifest', href: '/site.webmanifest?v=20260604' },
      ],
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f7f5f2' },
        { name: 'color-scheme', content: 'light' },
        { name: 'description', content: 'DevBit Tech 是一个面向开发者的 Beta 社区，汇集论坛讨论、小游戏、排行榜与团队介绍。' },
        { property: 'og:site_name', content: 'DevBit Tech' },
        { property: 'og:title', content: 'DevBit Tech' },
        { property: 'og:description', content: '面向开发者的 Beta 社区' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: '/web-app-manifest-512x512.png?v=20260604' },
        { name: 'twitter:card', content: 'summary' },
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
    } as Record<string, unknown>,
  },

  // Performance
  nitro: {
    compressPublicAssets: {
      // Keep gzip (fast), disable brotli (extremely slow at quality=11).
      // Brotli at build-time is 10-50x slower than gzip with negligible
      // size improvement on already-minified JS/CSS. Nginx can handle
      // brotli at the edge if needed.
      brotli: false,
      // Exclude file types that don't benefit from compression:
      //  - .wasm: already compact binary, compression is pointless
      //  - .png/.ico: already compressed image formats
      //  - .d.ts: TypeScript declarations, not served to clients
      exclude: ['/**/*.wasm', '/**/*.png', '/**/*.ico', '/**/*.d.ts'],
    },
    minify: true,
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  // Build optimization
  vite: {
    build: {
      // Use esbuild for JS minification — 10-100x faster than terser
      minify: 'esbuild',
      // Enable CSS code splitting for faster initial load
      cssMinify: 'esbuild',
      // Target modern browsers to skip expensive transpilation
      target: 'es2022',
      // Reduce chunk size warning threshold
      chunkSizeWarningLimit: 500,
      // Skip gzip/brotli size reporting — saves ~2-5s on large builds
      reportCompressedSize: false,
      // Inline small assets (< 4 KiB) to reduce HTTP requests
      assetsInlineLimit: 4096,
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
    esbuild: {
      // Strip legal comments (faster + smaller output)
      legalComments: 'none',
    },
  },

  // Sourcemaps: disable in production for faster builds
  sourcemap: false,

  // TypeScript strict
  typescript: {
    strict: true,
    typeCheck: false, // set true for CI (type-checking adds 10-30s)
  },
})