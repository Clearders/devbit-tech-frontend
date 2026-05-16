const apiProxyTarget = (
  process.env.NUXT_API_PROXY_TARGET ?? 'http://127.0.0.1:7878'
).replace(/\/$/, '')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '/api'
    }
  },
  routeRules: {
    '/api/**': {
      proxy: `${apiProxyTarget}/api/**`
    }
  },
  devtools: { enabled: true },
  app: {
    head: {
      title: 'DevBit Tech',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'DevBit Tech 是一个面向开发者的 Beta 社区，汇集论坛讨论、小游戏、排行榜与团队介绍。' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/css/main.css']
})
