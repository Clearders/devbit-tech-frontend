import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../app/utils/forumDockMotion.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
class Style {
  values = new Map()
  getPropertyValue(key) { return this.values.get(key)?.value ?? '' }
  getPropertyPriority(key) { return this.values.get(key)?.priority ?? '' }
  setProperty(key, value, priority = '') { this.values.set(key, { value, priority }) }
  removeProperty(key) { this.values.delete(key); delete this[key] }
}
class Surface {
  style = new Style(); children = []; isConnected = true; className = ''; dataset = {}
  constructor(box = { left: 20, top: 220, width: 700, height: 44 }) { this.box = box }
  append(...children) { children.forEach(child => { child.parent = this; this.children.push(child) }) }
  remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this) }
  setAttribute() {}
  matches(selector) { return selector === 'input' && this.tag === 'input' }
  closest() { return this.field ?? null }
  querySelector(selector) {
    if (selector === 'input') return this.input ?? null
    if (selector === '.navbar__skin') return this.skin ?? null
    return this.children.find(child => selector === 'svg' ? child.tag === 'svg' : `.${child.className}` === selector)
      ?? this.children.map(child => child.querySelector(selector)).find(Boolean) ?? null
  }
  querySelectorAll() { return this.items ?? [] }
  getBoundingClientRect() {
    let box = this.box
    if (this.parent?.className === 'forum-dock-flight' || this.parent?.className === 'forum-dock-flight__icon') {
      const parent = this.parent.getBoundingClientRect()
      box = { left: parent.left, top: parent.top, width: this.className.endsWith('__shape') ? parent.width : 18,
        height: this.className.endsWith('__shape') ? parent.height : 18 }
    }
    // Browser DOMRect properties are prototype accessors, not enumerable own properties.
    const result = {}
    for (const key of ['left', 'top', 'width', 'height']) {
      let value = Number.parseFloat(this.style[key] ?? box[key])
      if (key === 'left') value = this.parent?.className === 'forum-dock-flight' && this.style.left !== undefined
        ? box.left + Number(this.style.left) : value
      if (key === 'left') value += Number(this.style.x ?? 0)
      if (key === 'top') value += Number(this.style.y ?? 0)
      if (key === 'width') value *= Number(this.style.scaleX ?? 1)
      if (key === 'height') value *= Number(this.style.scaleY ?? 1)
      Object.defineProperty(result, key, { value, enumerable: false })
    }
    return result
  }
  cloneNode() { const copy = new Surface(this.box); copy.tag = this.tag; return copy }
}
function setup() {
  const timelines = [], body = new Surface()
  const apply = (target, vars) => {
    for (const [key, value] of Object.entries(vars)) {
      if (key === 'clearProps') {
        value.split(',').forEach(key => {
          target.style.removeProperty(key)
          if (key === 'transform') ['x', 'y', 'scaleX', 'scaleY'].forEach(part => target.style.removeProperty(part))
        })
        continue
      }
      if (['duration', 'ease', 'onUpdate'].includes(key)) continue
      if (!target.style) { target[key] = value; continue }
      if (key.startsWith('--')) target.style.setProperty(key, value)
      else { target.style[key] = value; target.style.setProperty(key, String(value)) }
    }
    vars.onUpdate?.()
  }
  const gsap = { set: apply, timeline(options) {
    const timeline = { steps: [], killed: false,
      to(target, vars, position) { this.steps.push({ target, vars, position }); return this },
      kill() { this.killed = true },
      advanceGeometry(progress) {
        const step = this.steps.find(step => 'progress' in step.target)
        if (!this.killed && step) apply(step.target, { ...step.vars, progress })
      },
      finish() { if (!this.killed) { this.steps.forEach(step => apply(step.target, step.vars)); options.onComplete() } },
    }
    timelines.push(timeline); return timeline
  } }
  let reduced = false
  const nav = new Surface({ left: 200, top: 16, width: 800, height: 58 })
  nav.skin = new Surface(nav.box); nav.skin.style.borderRadius = 29
  nav.items = [new Surface({ left: 235, top: 30, width: 100, height: 24 })]
  const exports = {}, viewport = { innerWidth: 1440, scrollY: 0 }
  runInNewContext(compiled, { exports, require: () => ({ gsap }), document: { body, createElement: () => new Surface() },
    window: viewport, getComputedStyle: element => ({ borderRadius: element.style.borderRadius ?? '8px',
      opacity: element.style.opacity ?? '1', getPropertyValue: key => element.style.getPropertyValue(key) }) })
  const motion = exports.createForumDockMotion(() => nav, () => reduced)
  const source = new Surface(), icon = new Surface({ left: 34, top: 233, width: 18, height: 18 })
  icon.tag = 'svg'; source.append(icon)
  source.input = { value: '', placeholder: '搜索帖子标题、内容或标签' }
  const target = new Surface({ left: 430, top: 23, width: 44, height: 44 })
  const targetIcon = icon.cloneNode()
  targetIcon.box = { left: 443, top: 36, width: 18, height: 18 }
  target.append(targetIcon); target.style.borderRadius = 22
  return { motion, source, target, body, nav, timelines, apply, viewport, setReduced: value => { reduced = value } }
}

test('captures DOMRect accessor values and keeps text and glyphs separate from shape motion', () => {
  const app = setup(), snapshot = app.motion.capture('search', app.source)
  app.motion.play('search', snapshot, app.target, true)
  const ghost = app.body.children[0]
  assert.equal(ghost.style.width, 700)
  assert.equal(ghost.style.left, 20)
  assert.equal(ghost.querySelector('.forum-dock-flight__label').textContent, app.source.input.placeholder)
  assert.equal(ghost.querySelector('svg').style.scaleX, undefined)
  assert.equal(app.target.style.opacity, 0)
  app.timelines.at(-1).finish()
  assert.equal(app.body.children.length, 0)
  assert.equal(app.target.style.getPropertyValue('opacity'), '')
})
test('reversing captures the visible intermediate shape and cancels stale completion', () => {
  const app = setup()
  app.target.style.setProperty('opacity', '.8', 'important')
  app.motion.play('search', app.motion.capture('search', app.source), app.target, true)
  const previous = app.timelines.at(-1), ghost = app.body.children[0]
  previous.advanceGeometry(.75)
  app.apply(ghost.querySelector('.forum-dock-flight__label'), { opacity: .3 })
  const snapshot = app.motion.capture('search', app.target)
  assert.equal(snapshot.box.width, 208)
  assert.equal(snapshot.box.left, 327.5)
  assert.equal(snapshot.radius, 18.5)
  assert.equal(snapshot.labelOpacity, .3)
  assert.equal(previous.killed, true)
  assert.equal(app.target.style.getPropertyValue('opacity'), '.8')
  assert.equal(app.target.style.getPropertyPriority('opacity'), 'important')
  app.motion.play('search', snapshot, app.source, false)
  previous.finish()
  assert.equal(app.body.children.length, 1, 'old completion cannot remove the replacement')
  assert.equal(app.body.children[0].style.width, 208)
  assert.equal(app.body.children[0].querySelector('.forum-dock-flight__label').style.opacity, .3)
  app.timelines.at(-1).finish()
  assert.equal(app.body.children.length, 0)
})
test('navbar and flights share one curve without overshoot and restore translations', () => {
  const app = setup(), snapshot = app.motion.capture('search', app.source)
  app.nav.box = { ...app.nav.box, left: 178, width: 844 }
  app.nav.items[0].box.left = 213
  app.motion.play('search', snapshot, app.target, true)
  assert.equal(app.nav.style.scaleX, undefined)
  assert.equal(app.nav.style.width, undefined)
  assert.equal(app.nav.items[0].style.getPropertyValue('--navbar-dock-x'), '22px')
  const skin = app.timelines[0].steps.find(step => step.target === app.nav.skin)
  assert.equal(skin.vars.scaleX, 1)
  assert.equal(skin.vars.scaleY, 1)
  const flight = app.timelines[1].steps.find(step => 'progress' in step.target)
  assert.equal(skin.vars.duration, flight.vars.duration)
  assert.equal(skin.vars.ease, flight.vars.ease)
  app.motion.stopAll()
  assert.equal(app.nav.skin.style.transformOrigin, undefined)
  assert.equal(app.nav.skin.style.borderRadius, undefined)
  assert.equal(app.nav.items[0].style.getPropertyValue('--navbar-dock-x'), '')
  assert.equal(app.body.children.length, 0)
  assert.ok(app.timelines.every(timeline => timeline.killed))
})

test('the active bubble shares label timing and disables layout transitions during docking', () => {
  const app = setup()
  const bubble = new Surface({ left: 400, top: 23, width: 66, height: 34 })
  bubble.className = 'navbar__indicator'
  app.nav.items.push(bubble)
  bubble.style.setProperty('--navbar-dock-x', '3px', 'important')
  const snapshot = app.motion.capture('search', app.source)
  bubble.box.left += 44
  app.motion.play('search', snapshot, app.target, true)
  assert.equal(app.nav.dataset.docking, 'true')
  const timeline = app.timelines[0]
  const label = timeline.steps.find(step => step.target === app.nav.items[0])
  const indicator = timeline.steps.find(step => step.target === bubble)
  assert.equal(bubble.style.getPropertyValue('--navbar-dock-x'), '-44px')
  assert.equal(indicator.position, label.position)
  assert.equal(indicator.vars.duration, label.vars.duration)
  assert.equal(indicator.vars.ease, label.vars.ease)
  timeline.finish()
  assert.equal(app.nav.dataset.docking, undefined)
  assert.equal(bubble.style.getPropertyValue('--navbar-dock-x'), '3px')
  assert.equal(bubble.style.getPropertyPriority('--navbar-dock-x'), 'important')
})
test('sort uses its own flight without replaying the capsule expansion and preserves independent cleanup', () => {
  const app = setup()
  app.motion.play('search', app.motion.capture('search', app.source), app.target, true)
  const sortTarget = new Surface({ left: 1020, top: 23, width: 44, height: 44 })
  app.motion.play('sort', app.motion.capture('sort', app.source), sortTarget, true)
  assert.equal(app.timelines.length, 3, 'one navbar timeline and two flights')
  app.timelines.at(-1).finish()
  assert.equal(app.body.children.length, 1)
  assert.equal(app.body.children[0].dataset.control, 'search')
  app.motion.stopAll()
  assert.equal(app.target.style.getPropertyValue('opacity'), '')
  assert.equal(sortTarget.style.getPropertyValue('opacity'), '')
})
test('reduced motion and missing destinations leave no ghosts or masked controls', () => {
  const app = setup(), snapshot = app.motion.capture('search', app.source)
  app.setReduced(true)
  app.motion.play('search', snapshot, app.target, true)
  app.setReduced(false)
  app.motion.play('search', snapshot, null, true)
  app.motion.play('search', undefined, app.target, true)
  assert.equal(app.timelines.length, 0)
  assert.equal(app.body.children.length, 0)
  assert.equal(app.target.style.opacity, undefined)
})

test('intermediate morphs use transforms while glyphs and layout dimensions stay stable', () => {
  const app = setup()
  app.motion.play('search', app.motion.capture('search', app.source), app.target, true)
  const ghost = app.body.children[0], shape = ghost.querySelector('.forum-dock-flight__shape')
  app.timelines.at(-1).advanceGeometry(.5)
  assert.equal(ghost.style.left, 20)
  assert.equal(ghost.style.top, 220)
  assert.equal(ghost.style.width, 700)
  assert.equal(ghost.style.height, 44)
  assert.equal(ghost.style.x, 205)
  assert.equal(ghost.style.y, -98.5)
  assert.ok(Math.abs(shape.getBoundingClientRect().width - 372) < .000001)
  assert.equal(ghost.querySelector('svg').getBoundingClientRect().width, 18)
  assert.equal(shape.style.width, undefined)
  assert.equal(shape.style.filter, undefined)
})

test('return flights track the field while the page keeps scrolling and skip redundant measurements', () => {
  const app = setup()
  let reads = 0
  const measure = app.source.getBoundingClientRect.bind(app.source)
  app.source.getBoundingClientRect = () => { reads++; return measure() }
  app.motion.play('search', app.motion.capture('search', app.target), app.source, false)
  const flight = app.timelines.at(-1), ghost = app.body.children[0]
  const initialReads = reads
  flight.advanceGeometry(.4)
  assert.equal(reads, initialReads)
  app.viewport.scrollY = 50
  app.source.box.top = 170
  flight.advanceGeometry(.8)
  assert.equal(reads, initialReads + 1)
  assert.ok(Math.abs(ghost.getBoundingClientRect().top - 140.6) < .000001)
  flight.advanceGeometry(1)
  assert.equal(reads, initialReads + 1)
  assert.equal(ghost.getBoundingClientRect().top, 170)
})

test('switching to reduced motion or losing a target cleans up an existing flight', () => {
  for (const reduced of [false, true]) {
    const app = setup()
    app.motion.play('search', app.motion.capture('search', app.source), app.target, true)
    const running = app.timelines.at(-1)
    app.setReduced(reduced)
    app.motion.play('search', undefined, reduced ? app.target : null, true)
    assert.equal(running.killed, true)
    assert.equal(app.body.children.length, 0)
    assert.equal(app.target.style.getPropertyValue('opacity'), '')
    app.motion.stopAll()
  }
})

test('route departure contracts the existing navbar paint without a control destination', () => {
  const app = setup(), snapshot = app.motion.captureNavbar()
  app.motion.stopAll()
  app.nav.box = { ...app.nav.box, left: 250, width: 700 }
  app.nav.skin.box = app.nav.box
  app.nav.items[0].box.left = 285
  let completed = 0
  app.motion.animateNavbar(snapshot, () => completed++)
  assert.equal(app.nav.skin.getBoundingClientRect().width, 800)
  assert.equal(app.nav.skin.getBoundingClientRect().left, 200)
  assert.equal(app.nav.items[0].style.getPropertyValue('--navbar-dock-x'), '-50px')
  assert.equal(app.body.children.length, 0, 'route departure does not return a field to the outgoing page')
  app.timelines[0].finish()
  assert.equal(completed, 1)
  assert.equal(app.nav.skin.getBoundingClientRect().width, 700)
  assert.equal(app.nav.skin.getBoundingClientRect().left, 250)
  assert.equal(app.nav.dataset.docking, undefined)
})

test('interrupted route contraction preserves the visible frame and cancels stale completion', () => {
  const app = setup()
  app.motion.animateNavbar(app.motion.captureNavbar())
  const previous = app.timelines[0]
  app.apply(app.nav.skin, { x: 15, scaleX: .9 })
  const snapshot = app.motion.captureNavbar()
  app.motion.stopAll()
  app.nav.box = { ...app.nav.box, left: 180, width: 840 }
  app.nav.skin.box = app.nav.box
  app.motion.animateNavbar(snapshot)
  assert.equal(previous.killed, true)
  assert.equal(app.nav.skin.getBoundingClientRect().left, 215)
  assert.equal(app.nav.skin.getBoundingClientRect().width, 720)
  previous.finish()
  assert.equal(app.nav.dataset.docking, 'true', 'old completion cannot clean up the new animation')
  app.motion.stopAll()
  assert.equal(app.nav.dataset.docking, undefined)
})

test('reduced motion restores any pending navbar transition and completes immediately', () => {
  const app = setup(), snapshot = app.motion.captureNavbar()
  app.motion.animateNavbar(snapshot)
  app.setReduced(true)
  let completed = 0
  app.motion.animateNavbar(snapshot, () => completed++)
  assert.equal(completed, 1)
  assert.equal(app.nav.skin.style.scaleX, undefined)
  assert.equal(app.nav.dataset.docking, undefined)
  assert.equal(app.timelines[0].killed, true)
})
