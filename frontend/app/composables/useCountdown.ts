/**
 * Reusable countdown timer — extracted from register.vue cooldown logic.
 */

export const useCountdown = () => {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  const start = (seconds = 60) => {
    stop()
    remaining.value = seconds
    timer = setInterval(() => {
      if (remaining.value <= 1) {
        remaining.value = 0
        stop()
        return
      }
      remaining.value -= 1
    }, 1000)
  }

  onBeforeUnmount(() => {
    stop()
  })

  return { remaining, start, stop }
}
