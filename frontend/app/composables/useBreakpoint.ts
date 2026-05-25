/**
 * Responsive breakpoint composable for Nuxt 4
 * Provides reactive screen size detection for adaptive layouts
 */

interface AppThemeConfig {
  breakpoints: {
    sm: number
    md: number
    lg: number
    xl: number
    '2xl': number
  }
}

export const useBreakpoint = () => {
  const config = useAppConfig() as { theme: AppThemeConfig }
  const breakpoints = config.theme.breakpoints

  // SSR-safe window width
  const windowWidth = ref(
    import.meta.server ? 1024 : window.innerWidth
  )

  const isSm = computed(() => windowWidth.value >= breakpoints.sm)
  const isMd = computed(() => windowWidth.value >= breakpoints.md)
  const isLg = computed(() => windowWidth.value >= breakpoints.lg)
  const isXl = computed(() => windowWidth.value >= breakpoints.xl)
  const is2xl = computed(() => windowWidth.value >= breakpoints['2xl'])

  // Device type detection
  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)

  // Touch device detection
  const isTouchDevice = computed(() =>
    import.meta.server
      ? false
      : 'ontouchstart' in window || navigator.maxTouchPoints > 0
  )

  if (import.meta.client) {
    const onResize = () => {
      windowWidth.value = window.innerWidth
    }
    onMounted(() => {
      window.addEventListener('resize', onResize, { passive: true })
    })
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onResize)
    })
  }

  return {
    windowWidth,
    breakpoints,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
  }
}
