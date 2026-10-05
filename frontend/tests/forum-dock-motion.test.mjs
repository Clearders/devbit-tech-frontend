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
    // Browser DOMRect properties are prototype accessors, not enumerable own properties.
    const result = {}
    for (const key of ['left', 'top', 'width', 'height']) Object.defineProperty(result, key, {
      value: Number.parseFloat(this.style[key] ?? this.box[key]), enumerable: false,
    })
    return result
  }
  cloneNode() { const copy = new Surface(this.box); copy.tag = this.tag; return copy }
}
function setup() {
  const timelines = [], body = new Surface()
  const apply = (target, vars) => {
    for (const [key, value] of Object.entries(vars)) {
      if (key === 'clearProps') { value.split(',').forEach(key => target.style.removeProperty(key)); continue }
      if (['duration', 'ease'].includes(key)) continue
      if (key.startsWith('--')) target.style.setProperty(key, value)
      else { target.style[key] = value; target.style.setProperty(key, String(value)) }
    }
  }
  const gsap = { set: apply, timeline(options) {
    const timeline = { steps: [], killed: false,
      to(target, vars, position) { this.steps.push({ target, vars, position }); return this },
      kill() { this.killed = true },
      finish() { if (!this.killed) { this.steps.forEach(step => apply(step.target, step.vars)); options.onComplete() } },
    }
    timelines.push(timeline); return timeline
  } }
  let reduced = false
  const nav = new Surface({ left: 200, top: 16, width: 800, height: 58 })
  nav.skin = new Surface(nav.box); nav.skin.style.borderRadius = 29
  nav.items = [new Surface({ left: 235, top: 30, width: 100, height: 24 })]
  const exports = {}
  runInNewContext(compiled, { exports, require: () => ({ gsap }), document: { body, createElement: () => new Surface() },
    window: { innerWidth: 1440 }, getComputedStyle: element => ({ borderRadius: element.style.borderRadius ?? '8px',
      opacity: element.style.opacity ?? '1', getPropertyValue: key => element.style.getPropertyValue(key) }) })
  const motion = exports.createForumDockMotion(() => nav, () => reduced)
  const source = new Surface(), icon = new Surface({ left: 34, top: 233, width: 18, height: 18 })
  icon.tag = 'svg'; source.append(icon)
  source.input = { value: '', placeholder: '搜索帖子标题、内容或标签' }
  const target = new Surface({ left: 430, top: 23, width: 44, height: 44 })
  target.append(icon.cloneNode()); target.style.borderRadius = 22
  return { motion, source, target, body, nav, timelines, apply, setReduced: value => { reduced = value } }
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
  app.apply(ghost, { left: 310, top: 60, width: 120, height: 42, borderRadius: 21 })
  const snapshot = app.motion.capture('search', app.target)
  assert.equal(snapshot.box.width, 120)
  assert.equal(snapshot.box.left, 310)
  assert.equal(snapshot.radius, 21)
  assert.equal(previous.killed, true)
  assert.equal(app.target.style.getPropertyValue('opacity'), '.8')
  assert.equal(app.target.style.getPropertyPriority('opacity'), 'important')
  app.motion.play('search', snapshot, app.source, false)
  previous.finish()
  assert.equal(app.body.children.length, 1, 'old completion cannot remove the replacement')
  assert.equal(app.body.children[0].style.width, 120)
  app.timelines.at(-1).finish()
  assert.equal(app.body.children.length, 0)
})
test('navbar paint stretches while layout geometry stays unchanged and translations are restored', () => {
  const app = setup(), snapshot = app.motion.capture('search', app.source)
  app.nav.box = { ...app.nav.box, left: 178, width: 844 }
  app.nav.items[0].box.left = 213
  app.motion.play('search', snapshot, app.target, true)
  assert.equal(app.nav.style.scaleX, undefined)
  assert.equal(app.nav.style.width, undefined)
  assert.equal(app.nav.items[0].style.getPropertyValue('--navbar-dock-x'), '22px')
  assert.ok(app.timelines[0].steps.some(step => step.target === app.nav.skin && step.vars.scaleX > 1))
  app.motion.stopAll()
  assert.equal(app.nav.skin.style.transformOrigin, undefined)
  assert.equal(app.nav.skin.style.borderRadius, undefined)
  assert.equal(app.nav.items[0].style.getPropertyValue('--navbar-dock-x'), '')
  assert.equal(app.body.children.length, 0)
  assert.ok(app.timelines.every(timeline => timeline.killed))
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
