export default defineAppConfig({
  site: {
    name: 'DevBit Tech',
    description: '面向开发者的 Beta 社区',
    url: 'https://devbit.tech',
  },

  theme: {
    breakpoints: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
  },

  ui: {
    navbar: {
      height: 72,
    },
    forum: {
      postsPerPage: 20,
      hotPostsCount: 5,
    },
  },
})
