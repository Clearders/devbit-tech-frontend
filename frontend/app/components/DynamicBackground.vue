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
  const particles: Particle[] = []
  const ripples: Ripple[] = []
  const mouse = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    active: false
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const PRIMARY = '77, 166, 255' // Sky blue for primary particles
  const SECONDARY = '124, 172, 255' // Periwinkle blue for secondary particles

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, canvasEl.offsetWidth)
    const height = Math.max(1, canvasEl.offsetHeight)
    canvasEl.width = Math.floor(width * dpr)
    canvasEl.height = Math.floor(height * dpr)
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function particleCount() {
    if (prefersReducedMotion.matches) return 0
    if (window.innerWidth < 640) return 28
    if (window.innerWidth < 1024) return 48
    return 72
  }

  function createParticle(): Particle {
    return {
      x: Math.random() * canvasEl.offsetWidth,
      y: Math.random() * canvasEl.offsetHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      color: Math.random() > 0.85 ? PRIMARY : SECONDARY
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
    const MAX_DIST = 130
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
          const opacity = (1 - dist / MAX_DIST) * 0.15
          ctx2d.beginPath()
          ctx2d.moveTo(a.x, a.y)
          ctx2d.lineTo(b.x, b.y)
          ctx2d.strokeStyle = `rgba(${PRIMARY}, ${opacity})`
          ctx2d.lineWidth = 0.8
          ctx2d.stroke()
        }
      }
    }
  }

  function drawMouseGlow() {
    if (!mouse.active) return

    mouse.x += (mouse.tx - mouse.x) * 0.12
    mouse.y += (mouse.ty - mouse.y) * 0.12

    const gradient = ctx2d.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180)
    gradient.addColorStop(0, `rgba(${PRIMARY}, 0.26)`)
    gradient.addColorStop(0.45, `rgba(${PRIMARY}, 0.12)`)
    gradient.addColorStop(1, `rgba(${PRIMARY}, 0)`)
    ctx2d.fillStyle = gradient
    ctx2d.beginPath()
    ctx2d.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2)
    ctx2d.fill()
  }

  function drawRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i]
      if (!ripple) continue

      ripple.radius += 2.4
      ripple.alpha *= 0.965

      ctx2d.beginPath()
      ctx2d.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
      ctx2d.strokeStyle = `rgba(${PRIMARY}, ${ripple.alpha})`
      ctx2d.lineWidth = 1.8
      ctx2d.stroke()

      if (ripple.radius >= ripple.maxRadius || ripple.alpha <= 0.02) {
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

  function onPointerMove(event: PointerEvent) {
    const point = toCanvasPoint(event.clientX, event.clientY)
    mouse.tx = point.x
    mouse.ty = point.y
    mouse.active = point.inside
  }

  function onPointerLeave() {
    mouse.active = false
  }

  function onClick(event: MouseEvent) {
    if (prefersReducedMotion.matches) return
    const point = toCanvasPoint(event.clientX, event.clientY)
    if (!point.inside) return

    ripples.push({
      x: point.x,
      y: point.y,
      radius: 8,
      maxRadius: 180,
      alpha: 0.4
    })
  }

  function tick() {
    if (!isVisible || prefersReducedMotion.matches) {
      animId = requestAnimationFrame(tick)
      return
    }

    ctx2d.clearRect(0, 0, canvasEl.offsetWidth, canvasEl.offsetHeight)

    if (props.layer === 'overlay') {
      drawRipples()
      animId = requestAnimationFrame(tick)
      return
    }

    drawConnections()

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.alpha += p.alphaDir * 0.003
      if (p.alpha >= 0.6) p.alphaDir = -1
      if (p.alpha <= 0.05) p.alphaDir = 1

      if (p.x < -5) p.x = canvasEl.offsetWidth + 5
      if (p.x > canvasEl.offsetWidth + 5) p.x = -5
      if (p.y < -5) p.y = canvasEl.offsetHeight + 5
      if (p.y > canvasEl.offsetHeight + 5) p.y = -5

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

  if (props.layer === 'overlay') {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('click', onClick)
  }

  const ro = new ResizeObserver(() => {
    resize()
    initParticles()
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
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    prefersReducedMotion.removeEventListener('change', onMotionPreferenceChange)
    if (props.layer === 'overlay') {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerleave', onPointerLeave)
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
}
</style>
