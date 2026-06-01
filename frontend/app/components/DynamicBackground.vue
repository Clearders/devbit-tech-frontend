<template>
  <canvas ref="canvasRef" class="dynamic-bg" aria-hidden="true" />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    layer?: 'base' | 'overlay'
  }>(),
  {
    layer: 'base'
  }
)

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  alphaDir: number
  color: string
}

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const canvasEl = canvas
  const ctx2d = ctx

  let animId: number
  let isVisible = true
  // Client-only check — useBreakpoint() composable cannot be called inside onMounted()
  // because it would create a duplicate reactive instance; inline check is correct here.
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const particles: Particle[] = []
  const ripples: Ripple[] = []

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PRIMARY = '91, 141, 239' // Porcelain blue
  const SECONDARY = '140, 160, 220' // Soft periwinkle
  const ACCENT = '180, 150, 210' // Lavender accent

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const width = Math.max(1, canvasEl.offsetWidth)
    const height = Math.max(1, canvasEl.offsetHeight)
    canvasEl.width = Math.floor(width * dpr)
    canvasEl.height = Math.floor(height * dpr)
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx2d.imageSmoothingEnabled = false
  }

  function particleCount() {
    if (prefersReducedMotion.matches) return 0
    // Reduced DPR cap for better performance
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    // Reduced counts across all breakpoints
    if (window.innerWidth < 480) return Math.round(5 * dpr)
    if (window.innerWidth < 768) return Math.round(8 * dpr)
    if (window.innerWidth < 1024) return Math.round(12 * dpr)
    return Math.round(16 * dpr)
  }

  function createParticle(): Particle {
    const colors = [PRIMARY, SECONDARY, ACCENT]
    const pick = colors[Math.floor(Math.random() * colors.length)]!
    return {
      x: Math.random() * canvasEl.offsetWidth,
      y: Math.random() * canvasEl.offsetHeight,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.55,
      radius: Math.random() * 2.6 + 0.6,
      alpha: Math.random() * 0.55 + 0.2,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      color: pick
    }
  }

  function initParticles() {
    if (props.layer !== 'base') return

    particles.length = 0
    for (let i = 0; i < particleCount(); i++) {
      particles.push(createParticle())
    }
  }

  function drawConnections() {
    const MAX_DIST = 150
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i]
      if (!a) continue
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j]
        if (!b) continue

        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MAX_DIST) {
          const opacity = (1 - dist / MAX_DIST) * 0.18
          ctx2d.beginPath()
          ctx2d.moveTo(a.x, a.y)
          ctx2d.lineTo(b.x, b.y)
          ctx2d.strokeStyle = `rgba(${a.color}, ${opacity})`
          ctx2d.lineWidth = 1.0
          ctx2d.stroke()
        }
      }
    }
  }

  function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i]
      if (!ripple) continue

      ripple.radius += 2.8
      ripple.alpha *= 0.962

      ctx2d.beginPath()
      ctx2d.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      ctx2d.strokeStyle = `rgba(${PRIMARY}, ${ripple.alpha})`
      ctx2d.lineWidth = 2.2
      ctx2d.stroke()

      // Inner glow ring
      if (ripple.alpha > 0.08) {
        ctx2d.beginPath()
        ctx2d.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2)
        ctx2d.strokeStyle = `rgba(${SECONDARY}, ${ripple.alpha * 0.6})`
        ctx2d.lineWidth = 1.2
        ctx2d.stroke()
      }

      if (ripple.radius >= ripple.maxRadius || ripple.alpha <= 0.015) {
        ripples.splice(i, 1)
      }
    }
  }

  function toCanvasPoint(clientX: number, clientY: number) {
    const rect = canvasEl.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    }
  }

  function onClick(event: MouseEvent) {
    if (prefersReducedMotion.matches) return
    const point = toCanvasPoint(event.clientX, event.clientY)
    if (!point.inside) return

    ripples.push({
      x: point.x,
      y: point.y,
      radius: 6,
      maxRadius: 240,
      alpha: 0.45
    })
    // Add a secondary, larger softer ripple
    ripples.push({
      x: point.x,
      y: point.y,
      radius: 4,
      maxRadius: 320,
      alpha: 0.25
    })
  }

  let frameCount = 0

  function tick() {
    if (!isVisible || prefersReducedMotion.matches) {
      animId = requestAnimationFrame(tick)
      return
    }

    frameCount++
    ctx2d.clearRect(0, 0, canvasEl.offsetWidth, canvasEl.offsetHeight)

    if (props.layer === 'overlay') {
      drawRipples()
      animId = requestAnimationFrame(tick)
      return
    }

    // Draw connection lines every other frame (most expensive O(n²) operation)
    if (frameCount % 2 === 0) {
      drawConnections()
    }

    // Draw particles with subtle glow
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.alpha += p.alphaDir * 0.004
      if (p.alpha >= 0.7) p.alphaDir = -1
      if (p.alpha <= 0.08) p.alphaDir = 1

      if (p.x < -5) p.x = canvasEl.offsetWidth + 5
      if (p.x > canvasEl.offsetWidth + 5) p.x = -5
      if (p.y < -5) p.y = canvasEl.offsetHeight + 5
      if (p.y > canvasEl.offsetHeight + 5) p.y = -5

      // Particle glow
      const glow = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3)
      glow.addColorStop(0, `rgba(${p.color}, ${p.alpha * 0.5})`)
      glow.addColorStop(1, `rgba(${p.color}, 0)`)
      ctx2d.fillStyle = glow
      ctx2d.beginPath()
      ctx2d.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
      ctx2d.fill()

      // Particle core
      ctx2d.beginPath()
      ctx2d.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx2d.fillStyle = `rgba(${p.color}, ${p.alpha})`
      ctx2d.fill()
    }

    animId = requestAnimationFrame(tick)
  }

  resize()
  initParticles()
  tick()

  if (props.layer === 'overlay' && !isTouchDevice) {
    window.addEventListener('click', onClick)
  }

  // Throttled resize to avoid excessive recalculations
  let resizeTimer: ReturnType<typeof setTimeout>
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resize()
      initParticles()
    }, 150)
  })
  ro.observe(canvasEl)

  function onVisibilityChange() {
    isVisible = document.visibilityState === 'visible'
  }

  function onMotionPreferenceChange() {
    ripples.length = 0
    resize()
    initParticles()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  prefersReducedMotion.addEventListener('change', onMotionPreferenceChange)

  onUnmounted(() => {
    cancelAnimationFrame(animId)
    clearTimeout(resizeTimer)
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    prefersReducedMotion.removeEventListener('change', onMotionPreferenceChange)
    if (props.layer === 'overlay' && !isTouchDevice) {
      window.removeEventListener('click', onClick)
    }
  })
})
</script>

<style scoped>
.dynamic-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  /* Promote to own GPU compositing layer so page transitions don't force
     a repaint of the canvas. This isolates the background animation from
     layout/paint work triggered by route changes. */
  transform: translateZ(0);
  will-change: transform;
  /* Exclude from the View Transition API snapshots so the canvas is not
     captured/animated during cross-page transitions. */
  view-transition-name: none;
  /* Contain paint/layout/style to prevent the canvas from invalidating
     the parent's render tree during animation frames. */
  contain: layout style paint;
}
</style>
