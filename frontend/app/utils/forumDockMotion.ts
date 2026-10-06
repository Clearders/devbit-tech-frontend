import { gsap } from 'gsap'
import type { DockControl } from './forumDock'

type Box = { left: number; top: number; width: number; height: number }
type NavbarSnapshot = { navigation?: Box; navigationRadius?: number; items: Map<HTMLElement, number> }
type Snapshot = NavbarSnapshot & { box: Box; radius: number; icon?: Node; iconX: number; label: string; labelOpacity: number }
type Flight = { element: HTMLElement; shape: HTMLElement; radius: () => number; timeline: gsap.core.Timeline; restore: () => void }

const duration = .42
const ease = 'power2.inOut'
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress

/** Animate paint separately from layout so contact thresholds and glyphs stay stable. */
export function createForumDockMotion(navigation: () => HTMLElement | undefined, reduced: () => boolean) {
  const flights = new Map<DockControl, Flight>()
  let navbarMotion: gsap.core.Timeline | undefined
  let restoreNavbar: (() => void) | undefined
  const labelOf = (element: HTMLElement) => {
    const input = element.matches('input') ? element as HTMLInputElement : element.querySelector('input')
    return input ? input.value || input.placeholder : element.textContent?.trim().replace(/\s+/g, ' ') || ''
  }
  function stop(control: DockControl) {
    const flight = flights.get(control)
    if (!flight) return
    flight.timeline.kill()
    flight.restore()
    flight.element.remove()
    flights.delete(control)
  }
  function stopNavbar() {
    navbarMotion?.kill()
    restoreNavbar?.()
    navbarMotion = undefined
    restoreNavbar = undefined
  }
  function captureNavbar(): NavbarSnapshot | undefined {
    const nav = navigation()
    const skin = nav?.querySelector<HTMLElement>('.navbar__skin')
    if (!nav || !skin) return
    const snapshot: NavbarSnapshot = { navigation: skin.getBoundingClientRect(),
      navigationRadius: parseFloat(getComputedStyle(skin).borderRadius), items: new Map() }
    nav?.querySelectorAll<HTMLElement>('.navbar__brand, .navbar__links > li:not(.navbar__search-slot), .navbar__indicator, .navbar__auth')
      .forEach(item => {
        if (item.offsetWidth === 0) return // Collapsed mobile links have no visible frame to preserve.
        snapshot.items.set(item, item.getBoundingClientRect().left
          + (item.matches('.navbar__links > li') ? parseFloat(getComputedStyle(item).getPropertyValue('--navbar-dock-x')) || 0 : 0))
      })
    return snapshot
  }
  function capture(control: DockControl, source?: HTMLElement): Snapshot | undefined {
    const flight = flights.get(control)
    const element = flight?.element ?? source
    if (!element) return
    const box = (flight?.shape ?? element).getBoundingClientRect()
    const icon = element.querySelector('svg')
    const iconBox = icon?.getBoundingClientRect()
    const label = element.querySelector<HTMLElement>('.forum-dock-flight__label')
    const navbar = captureNavbar()
    const snapshot: Snapshot = { ...navbar, items: navbar?.items ?? new Map(),
      box: { left: box.left, top: box.top, width: box.width, height: box.height },
      radius: flight?.radius() ?? Math.min(parseFloat(getComputedStyle(element).borderRadius) || 8, box.height / 2),
      icon: icon?.cloneNode(true), iconX: iconBox ? iconBox.left - box.left : 14,
      label: label?.textContent || labelOf(element), labelOpacity: label ? Number(getComputedStyle(label).opacity) : labelOf(element) ? 1 : 0 }
    stop(control)
    return snapshot
  }
  function animateNavbar(snapshot: NavbarSnapshot | undefined, complete?: () => void) {
    stopNavbar()
    if (!snapshot || reduced()) { complete?.(); return }
    const nav = navigation(), before = snapshot.navigation
    const skin = nav?.querySelector<HTMLElement>('.navbar__skin')
    if (!nav || !skin || !before) { complete?.(); return }
    // Layout changes settle immediately; the bubble follows the same tween as its label.
    nav.dataset.docking = 'true'
    const paintBounds = skin.getBoundingClientRect()
    const radius = Math.min(parseFloat(getComputedStyle(nav).borderRadius), paintBounds.height / 2)
    const saved: Array<() => void> = []
    gsap.set(skin, { transformOrigin: 'left center', x: before.left - paintBounds.left,
      scaleX: before.width / paintBounds.width, scaleY: before.height / paintBounds.height,
      borderRadius: Math.min(snapshot.navigationRadius ?? radius, before.height / 2) })
    const timeline = gsap.timeline({ onComplete: () => { restoreNavbar?.(); restoreNavbar = undefined; navbarMotion = undefined; complete?.() } })
    for (const [item, left] of snapshot.items) {
      if (!item.isConnected) continue
      const previous = item.style.getPropertyValue('--navbar-dock-x')
      const priority = item.style.getPropertyPriority('--navbar-dock-x')
      item.style.removeProperty('--navbar-dock-x')
      const delta = left - item.getBoundingClientRect().left
      saved.push(() => previous ? item.style.setProperty('--navbar-dock-x', previous, priority) : item.style.removeProperty('--navbar-dock-x'))
      gsap.set(item, { '--navbar-dock-x': `${delta}px` })
      timeline.to(item, { '--navbar-dock-x': '0px', duration, ease }, 0)
    }
    restoreNavbar = () => {
      saved.forEach(restore => restore())
      gsap.set(skin, { clearProps: 'transform,transformOrigin,borderRadius' })
      delete nav.dataset.docking
    }
    timeline.to(skin, { x: 0, scaleX: 1, scaleY: 1, borderRadius: radius, duration, ease }, 0)
    navbarMotion = timeline
  }
  function play(control: DockControl, snapshot: Snapshot | undefined, destination: HTMLElement | null | undefined, docked: boolean) {
    stop(control)
    if (!snapshot || !destination || reduced()) return
    // Search changes the capsule width; sort follows its own flight without replaying that pulse.
    if (control === 'search') animateNavbar(snapshot)
    const paint = destination.matches('input') ? destination.closest<HTMLElement>('.forum-search') ?? destination : destination
    let end = paint.getBoundingClientRect()
    const start = snapshot.box
    if (Math.min(start.width, start.height, end.width, end.height) <= 0) return
    const element = document.createElement('div')
    element.className = 'forum-dock-flight'
    element.dataset.control = control
    element.inert = true
    element.setAttribute('aria-hidden', 'true')
    const shape = document.createElement('span')
    shape.className = 'forum-dock-flight__shape'
    const icon = document.createElement('span')
    icon.className = 'forum-dock-flight__icon'
    if (snapshot.icon) icon.append(snapshot.icon)
    const label = document.createElement('span')
    label.className = 'forum-dock-flight__label'
    label.textContent = snapshot.label || labelOf(paint)
    element.append(shape, icon, label)
    document.body.append(element)
    const opacity = paint.style.getPropertyValue('opacity'), priority = paint.style.getPropertyPriority('opacity')
    const restore = () => opacity ? paint.style.setProperty('opacity', opacity, priority) : paint.style.removeProperty('opacity')
    gsap.set(paint, { opacity: 0 })
    gsap.set(element, { ...start })
    gsap.set(shape, { transformOrigin: 'left top', borderRadius: snapshot.radius })
    gsap.set(icon, { left: snapshot.iconX })
    // Keep the current label alpha when reversing an unfinished flight.
    gsap.set(label, { opacity: snapshot.labelOpacity })
    element.style.setProperty('--dock-label-width', `${Math.max(0, start.width - 56)}px`)
    const endRadius = Math.min(parseFloat(getComputedStyle(destination).borderRadius) || 0, end.height / 2)
    const destinationIcon = paint.querySelector('svg')
    const endIconX = destinationIcon ? destinationIcon.getBoundingClientRect().left - end.left : 14
    const geometry = { progress: 0 }
    let scrollY = window.scrollY
    const render = () => {
      // The returning field continues scrolling beneath the fixed flight.
      // Read its new bounds only when scrolling, not on every animation frame.
      if (scrollY !== window.scrollY) {
        scrollY = window.scrollY
        end = paint.getBoundingClientRect()
      }
      const p = geometry.progress
      const scaleX = mix(start.width, end.width, p) / start.width
      const scaleY = mix(start.height, end.height, p) / start.height
      const radius = mix(snapshot.radius, endRadius, p)
      gsap.set(element, { x: mix(start.left, end.left, p) - start.left, y: mix(start.top, end.top, p) - start.top })
      // Only the empty background scales; glyphs and text keep their original size.
      gsap.set(shape, { scaleX, scaleY, borderRadius: `${radius / scaleX}px / ${radius / scaleY}px` })
      gsap.set(icon, { x: mix(snapshot.iconX, endIconX, p) - snapshot.iconX })
      element.style.setProperty('--dock-label-width', `${Math.max(0, mix(start.width, end.width, p) - 56)}px`)
    }
    const timeline = gsap.timeline({ onComplete: () => { restore(); element.remove(); flights.delete(control) } })
    timeline.to(geometry, { progress: 1, duration, ease, onUpdate: render }, 0)
      .to(label, { opacity: docked ? 0 : 1, duration: .14, ease: 'power1.out' }, docked ? 0 : .2)
      .to(element, { opacity: 0, duration: .08, ease: 'none' }, duration - .08)
      .to(paint, { opacity: 1, duration: .08, ease: 'none' }, duration - .08)
    flights.set(control, { element, shape, radius: () => mix(snapshot.radius, endRadius, geometry.progress), timeline, restore })
  }
  function stopAll() { stop('search'); stop('sort'); stopNavbar() }
  return { capture, captureNavbar, animateNavbar, play, stopAll }
}
