import { formatRelativeTime } from '~/utils/forum'

const clocks = new WeakMap<object, { users: number; timer: ReturnType<typeof setInterval> | null }>()

// Nuxt serializes this clock with the page, so SSR and hydration share a timestamp.
export function useRelativeTime() {
  const app = useNuxtApp()
  const now = useState('reading_now', () => Date.now())
  let attached = false
  onMounted(() => {
    attached = true
    now.value = Date.now()
    const clock = clocks.get(app) ?? { users: 0, timer: null }
    clocks.set(app, clock); clock.users++
    clock.timer ??= setInterval(() => { now.value = Date.now() }, 60_000)
  })
  onBeforeUnmount(() => {
    const clock = clocks.get(app)
    if (!attached || !clock) return
    if (--clock.users === 0) { if (clock.timer) clearInterval(clock.timer); clocks.delete(app) }
  })
  return (date: string) => formatRelativeTime(date, now.value)
}
