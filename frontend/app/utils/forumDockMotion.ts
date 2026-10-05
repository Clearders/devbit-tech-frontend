import { gsap } from 'gsap'
import type { DockControl } from './forumDock'

type Box = { left: number; top: number; width: number; height: number }
type Snapshot = { box: Box; radius: number; icon?: Node; iconX: number; label: string; labelOpacity: number;
  navigation?: Box; navigationRadius?: number; items: Map<HTMLElement, number> }
type Flight = { element: HTMLElement; timeline: gsap.core.Timeline; restore: () => void }

/** Animate paint separately from layout so contact thresholds and glyphs stay stable. */
export function createForumDockMotion(navigation: () => HTMLElement | undefined, reduced: () => boolean) {
  const flights = new Map<DockControl, Flight>()
  let navbarMotion: gsap.core.Timeline | undefined
  let restoreNavbar: (() => void) | undefined
  const labelOf = (element: HTMLElement) => {
    const input = element.matches('input') ? element as HTMLInputElement : element.querySelector('input')
    return input ? input.value || input.placeholder : element.textContent?.trim() || ''
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
  function capture(control: DockControl, source?: HTMLElement): Snapshot | undefined {
    const element = flights.get(control)?.element ?? source
    if (!element) return
    const box = element.getBoundingClientRect()
    const icon = element.querySelector('svg')
    const iconBox = icon?.getBoundingClientRect()
    const label = element.querySelector<HTMLElement>('.forum-dock-flight__label')
    const nav = navigation()
    const skin = nav?.querySelector<HTMLElement>('.navbar__skin')
    const snapshot: Snapshot = { box: { left: box.left, top: box.top, width: box.width, height: box.height }, radius: Math.min(parseFloat(getComputedStyle(element).borderRadius) || 8, box.height / 2),
      icon: icon?.cloneNode(true), iconX: iconBox ? iconBox.left - box.left : 14,
      label: label?.textContent || labelOf(element), labelOpacity: label ? Number(getComputedStyle(label).opacity) : 1,
      navigation: skin?.getBoundingClientRect(), navigationRadius: skin ? parseFloat(getComputedStyle(skin).borderRadius) : undefined, items: new Map() }
    nav?.querySelectorAll<HTMLElement>('.navbar__brand, .navbar__links > li:not(.navbar__search-slot), .navbar__auth')
      .forEach(item => snapshot.items.set(item, item.getBoundingClientRect().left
        + (item.matches('.navbar__links > li') ? parseFloat(getComputedStyle(item).getPropertyValue('--navbar-dock-x')) || 0 : 0)))
    stop(control)
    return snapshot
  }
  function animateNavbar(snapshot: Snapshot) {
    const nav = navigation(), before = snapshot.navigation
    const skin = nav?.querySelector<HTMLElement>('.navbar__skin')
    if (!nav || !skin || !before) return
    stopNavbar()
    const after = nav.getBoundingClientRect()
    const paintBounds = skin.getBoundingClientRect()
    const radius = Math.min(parseFloat(getComputedStyle(nav).borderRadius), paintBounds.height / 2)
    // At most 3px on each side, retaining clearance to the external sort button.
    const stretch = Math.max(0, Math.min(6, after.left * 2, (window.innerWidth - after.left - after.width) * 2))
    const saved: Array<() => void> = []
    gsap.set(skin, { transformOrigin: 'left center', x: before.left - paintBounds.left,
      scaleX: before.width / paintBounds.width, scaleY: before.height / paintBounds.height,
      borderRadius: Math.min(snapshot.navigationRadius ?? radius, before.height / 2) })
    const timeline = gsap.timeline({ onComplete: () => { restoreNavbar?.(); restoreNavbar = undefined; navbarMotion = undefined } })
    for (const [item, left] of snapshot.items) {
      if (!item.isConnected) continue
      const previous = item.style.getPropertyValue('--navbar-dock-x')
      const priority = item.style.getPropertyPriority('--navbar-dock-x')
      item.style.removeProperty('--navbar-dock-x')
      const delta = left - item.getBoundingClientRect().left
      saved.push(() => previous ? item.style.setProperty('--navbar-dock-x', previous, priority) : item.style.removeProperty('--navbar-dock-x'))
      gsap.set(item, { '--navbar-dock-x': `${delta}px` })
      timeline.to(item, { '--navbar-dock-x': '0px', duration: .52, ease: 'power3.out' }, 0)
    }
    restoreNavbar = () => {
      saved.forEach(restore => restore())
      gsap.set(skin, { clearProps: 'transform,transformOrigin,borderRadius' })
    }
    timeline.to(skin, { x: -stretch / 2, scaleX: 1 + stretch / paintBounds.width, scaleY: .965,
      borderRadius: radius * .88, duration: .25, ease: 'power3.out' }, 0)
      .to(skin, { x: 0, scaleX: 1, scaleY: 1, borderRadius: radius, duration: .36, ease: 'back.out(1.25)' }, .25)
    navbarMotion = timeline
  }
  function play(control: DockControl, snapshot: Snapshot | undefined, destination: HTMLElement | null | undefined, docked: boolean) {
    if (!snapshot || !destination || reduced()) return
    stop(control)
    // Search changes the capsule width; sort follows its own flight without replaying that pulse.
    if (control === 'search') animateNavbar(snapshot)
    const paint = destination.matches('input') ? destination.closest<HTMLElement>('.forum-search') ?? destination : destination
    const end = paint.getBoundingClientRect(), start = snapshot.box
    const element = document.createElement('div')
    element.className = 'forum-dock-flight'
    element.dataset.control = control
    element.inert = true
    element.setAttribute('aria-hidden', 'true')
    const icon = document.createElement('span')
    icon.className = 'forum-dock-flight__icon'
    if (snapshot.icon) icon.append(snapshot.icon)
    const label = document.createElement('span')
    label.className = 'forum-dock-flight__label'
    label.textContent = snapshot.label || labelOf(paint)
    element.append(icon, label)
    document.body.append(element)
    const opacity = paint.style.getPropertyValue('opacity'), priority = paint.style.getPropertyPriority('opacity')
    const restore = () => opacity ? paint.style.setProperty('opacity', opacity, priority) : paint.style.removeProperty('opacity')
    gsap.set(paint, { opacity: 0 })
    gsap.set(element, { ...start, borderRadius: snapshot.radius })
    gsap.set(icon, { left: snapshot.iconX })
    gsap.set(label, { opacity: docked ? snapshot.labelOpacity : 0 })
    const endRadius = docked && control === 'search' ? 22 : 8
    const middleWidth = docked ? Math.max(64, start.width * .28) : Math.max(64, end.width * .68)
    const middleHeight = 42
    const mix = docked ? .64 : .42
    const middle = { left: (start.left + start.width / 2) * (1 - mix) + (end.left + end.width / 2) * mix - middleWidth / 2,
      top: start.top * (1 - mix) + end.top * mix, width: middleWidth, height: middleHeight, borderRadius: middleHeight / 2 }
    const endIconX = docked ? (end.width - 18) / 2 : 14
    const timeline = gsap.timeline({ onComplete: () => { restore(); element.remove(); flights.delete(control) } })
    timeline.to(element, { ...middle, filter: 'blur(0.3px)', duration: .26, ease: 'power2.inOut' }, 0)
      .to(element, { left: end.left, top: end.top, width: end.width, height: end.height,
        borderRadius: endRadius, filter: 'blur(0px)', duration: .3, ease: 'back.out(1.12)' }, .26)
      .to(icon, { left: endIconX, duration: .5, ease: 'power2.inOut' }, 0)
      .to(label, { opacity: docked ? 0 : 1, duration: docked ? .18 : .24, ease: 'power2.out' }, docked ? 0 : .26)
      .to(element, { opacity: 0, duration: .12, ease: 'power1.out' }, .48)
      .to(paint, { opacity: 1, duration: .12, ease: 'power1.out' }, .48)
    flights.set(control, { element, timeline, restore })
  }
  function stopAll() { stop('search'); stop('sort'); stopNavbar() }
  return { capture, play, stopAll }
}
