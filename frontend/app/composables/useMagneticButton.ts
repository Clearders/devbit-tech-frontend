/**
 * Magnetic hover & ripple effect for buttons.
 * Extracted from AppNavbar to be reusable across components.
 */

export const useMagneticButton = () => {
  const onPointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    const rect = target.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    target.style.setProperty('--ripple-x', `${x}px`)
    target.style.setProperty('--ripple-y', `${y}px`)
    target.classList.remove('is-rippling')
    void target.offsetWidth
    target.classList.add('is-rippling')
  }

  const onMagnetMove = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    const rect = target.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const magnetStrength = 0.18
    const maxOffset = 7

    const x = Math.max(Math.min(dx * magnetStrength, maxOffset), -maxOffset)
    const y = Math.max(Math.min(dy * magnetStrength, maxOffset), -maxOffset)

    target.style.setProperty('--magnet-x', `${x}px`)
    target.style.setProperty('--magnet-y', `${y}px`)
  }

  const resetMagnet = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null
    if (!target) return

    target.style.setProperty('--magnet-x', '0px')
    target.style.setProperty('--magnet-y', '0px')
  }

  return { onPointerDown, onMagnetMove, resetMagnet }
}
