export default defineNuxtPlugin({
  name: 'devbit-startup-loading',
  enforce: 'pre',
  setup(nuxtApp) {
    let mounted = false
    let hydrated = false
    const finish = () => {
      if (mounted && hydrated) window.__devbitStartupLoading?.finish()
    }
    const dismiss = () => window.__devbitStartupLoading?.finish(true)

    // Register before the async auth plugin can delay or fail initialization.
    window.__devbitStartupLoading?.setProgress(25)
    nuxtApp.hook('app:created', () => window.__devbitStartupLoading?.setProgress(65))
    nuxtApp.hook('app:mounted', () => {
      mounted = true
      finish()
    })
    nuxtApp.hook('app:suspense:resolve', () => {
      hydrated = true
      finish()
    })
    nuxtApp.hook('app:error', dismiss)
    nuxtApp.hook('vue:error', dismiss)
  },
})
