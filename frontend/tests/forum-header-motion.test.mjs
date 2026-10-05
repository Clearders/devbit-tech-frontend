import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../app/composables/useForumHeaderMotion.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

class Surface {
  constructor(height = 200) { this.style = {}; this.dataset = {}; this.height = height; this.listeners = new Map() }
  addEventListener(name, callback) {
    const previous = this.listeners.get(name)
    this.listeners.set(name, previous ? event => { previous(event); callback(event) } : callback)
  }
  removeEventListener(name) { this.listeners.delete(name) }
  querySelector() { return null }
  contains() { return false }
  getBoundingClientRect() { return { left: 0, top: 0, height: this.style.height === undefined ? this.height : parseFloat(this.style.height), width: 120 } }
}

function setup(initialReduced = false) {
  const tweens = [], observers = [], mounted = [], unmount = []
  const root = new Surface(), document = new Surface()
  const apply = (target, vars) => {
    for (const key of ['height', 'width', 'opacity', 'overflow', 'scale', 'left', 'top']) {
      if (key in vars) target.style[key] = ['height', 'width'].includes(key) ? `${vars[key]}px` : vars[key]
    }
    if (vars.clearProps) for (const key of vars.clearProps.split(',')) delete target.style[key]
  }
  const context = { add: callback => callback(), getTweens: () => tweens, revert() { this.reverted = true; tweens.forEach(tween => { tween.active = false }) } }
  let mediaCallback
  const media = { add(_queries, callback) { mediaCallback = callback; callback({ conditions: { reduce: initialReduced, normal: !initialReduced, hover: true } }) }, revert() { this.reverted = true } }
  const gsap = {
    context: () => context, matchMedia: () => media, set: apply,
    getProperty: (target, key) => key === 'scaleX' ? target.style.scale ?? 0 : target.style[key],
    killTweensOf: target => tweens.filter(tween => tween.target === target).forEach(tween => { tween.active = false }),
    to(target, vars) {
      if (vars.overwrite) gsap.killTweensOf(target)
      const startHeight = target.getBoundingClientRect().height
      const tween = { target, vars, startHeight, active: true, isActive() { return this.active },
        progress(value) {
          if (!this.active) return this
          if ('height' in vars) apply(target, { height: startHeight + (vars.height - startHeight) * value })
          if (value === 1) { apply(target, vars); this.active = false; vars.onComplete?.() }
          return this
        },
      }
      tweens.push(tween)
      if (vars.duration === 0) tween.progress(1)
      return tween
    },
  }
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
    fire() { if (!this.disconnected) this.callback() }
  }
  const exports = {}
  runInNewContext(compiled, { exports, require: () => ({ gsap }), document, ResizeObserver: Observer,
    onMounted: callback => mounted.push(callback), onBeforeUnmount: callback => unmount.push(callback) })
  const motion = exports.useForumHeaderMotion({ value: root })
  mounted.forEach(callback => callback())
  const panel = new Surface()
  panel.firstElementChild = new Surface()
  panel.scrollHeight = 176 // The inner flow-root also contains the bottom margin.
  return { motion, panel, root, document, tweens, observers, context, media,
    setReduced: reduce => mediaCallback({ conditions: { reduce, normal: !reduce, hover: false } }),
    dispose: () => unmount.forEach(callback => callback()), last: () => tweens.at(-1) }
}

test('panel uses full natural content height and remains fluid after expanding', () => {
  const app = setup()
  let completed = 0
  app.motion.beforePanel(app.panel)
  app.motion.enterPanel(app.panel, () => completed++)
  assert.equal(app.last().vars.height, 200)
  app.last().progress(1)
  assert.equal(app.panel.style.height, undefined)
  assert.equal(completed, 1)
  app.panel.firstElementChild.height = 120
  app.observers[0].fire()
  assert.equal(app.last().startHeight, 200)
  assert.equal(app.last().vars.height, 120)
  app.last().progress(1)
  assert.equal(app.panel.style.height, undefined)
  assert.equal(completed, 1, 'resizing must not replay the enter completion')
})

test('arrow color expands from entry and reverses toward a clamped exit without queued tweens', () => {
  const app = setup()
  const arrow = new Surface(44), disc = new Surface()
  arrow.closest = () => arrow
  arrow.querySelector = selector => selector === '[data-forum-wash]' ? disc : null
  const pointer = { target: arrow, pointerType: 'mouse', clientX: 5, clientY: 15, relatedTarget: null }
  app.root.listeners.get('pointerover')(pointer)
  assert.equal(disc.style.left, 5)
  assert.equal(disc.style.top, 15)
  assert.equal(app.last().vars.scale, 1)
  const entering = app.last()
  app.root.listeners.get('pointerout')({ ...pointer, clientX: 500, clientY: -30 })
  assert.equal(entering.active, false)
  assert.equal(app.last().vars.left, 120)
  assert.equal(app.last().vars.top, 0)
  assert.equal(app.last().vars.scale, 0)
  app.setReduced(true)
  app.root.listeners.get('pointerover')(pointer)
  assert.equal(app.last().vars.duration, 0)
  assert.equal(disc.style.scale, 1)
  app.root.listeners.get('pointerout')(pointer)
  assert.equal(disc.style.scale, 0)
  arrow.disabled = true
  const count = app.tweens.length
  app.root.listeners.get('pointerover')(pointer)
  assert.equal(app.tweens.length, count)
})

test('rapid open/close/open continues from the current frame without stale removal', () => {
  const app = setup()
  let removed = 0
  app.motion.beforePanel(app.panel)
  app.motion.enterPanel(app.panel, () => {})
  app.last().progress(.5)
  app.motion.stop(app.panel)
  app.motion.leavePanel(app.panel, () => removed++)
  app.last().progress(.5)
  assert.equal(app.panel.style.height, '50px')
  app.motion.stop(app.panel)
  app.motion.beforePanel(app.panel)
  assert.equal(app.panel.style.height, '50px')
  app.motion.enterPanel(app.panel, () => {})
  assert.equal(app.last().startHeight, 50)
  app.last().progress(1)
  assert.equal(removed, 0)
  assert.equal(app.panel.inert, false)
  assert.equal(app.panel.style.height, undefined)
})

test('reduced motion finishes ongoing changes and restores normal timing when disabled', () => {
  const app = setup()
  let completed = 0
  app.motion.beforePanel(app.panel)
  app.motion.enterPanel(app.panel, () => completed++)
  app.last().progress(.3)
  app.setReduced(true)
  assert.equal(completed, 1)
  app.motion.leavePanel(app.panel, () => completed++)
  assert.equal(app.last().vars.duration, 0)
  assert.equal(completed, 2)
  app.setReduced(false)
  app.motion.enterPanel(app.panel, () => {})
  assert.equal(app.last().vars.duration, .3)
})

test('unmount removes delegated handlers, observers and GSAP contexts', () => {
  const app = setup()
  app.motion.beforePanel(app.panel)
  app.motion.enterPanel(app.panel, () => {})
  assert.ok(app.root.listeners.size > 0)
  app.dispose()
  assert.equal(app.root.listeners.size, 0)
  assert.equal(app.document.listeners.size, 0)
  assert.ok(app.observers.every(observer => observer.disconnected))
  assert.equal(app.context.reverted, true)
  assert.equal(app.media.reverted, true)
  const count = app.tweens.length
  app.motion.activeCategory({ querySelector: () => ({ offsetLeft: 0, offsetWidth: 100 }) }, app.root)
  assert.equal(app.tweens.length, count)
})
