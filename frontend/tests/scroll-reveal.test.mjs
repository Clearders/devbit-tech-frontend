import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const controllerSource = compile('../app/utils/scrollReveal.ts')
const composableSource = compile('../app/composables/useScrollReveal.ts')

function setup({ layout = false, reduced = false, startup = false, unsupported = false } = {}) {
  const animations = [], observers = [], mutations = [], frames = new Map(), hooks = new Map()
  let order = 0, frameId = 0
  class Element {
    static ELEMENT_NODE = 1
    static DOCUMENT_POSITION_FOLLOWING = 4
    nodeType = 1
    children = []
    attributes = new Set()
    listeners = new Map()
    order = order++
    append(child) { this.children.push(child); child.parentElement = this; return child }
    remove(child) { this.children = this.children.filter(item => item !== child); child.parentElement = null }
    get firstElementChild() { return this.children[0] }
    hasAttribute(name) { return this.attributes.has(name) }
    contains(node) { return node === this || this.children.some(child => child.contains(node)) }
    closest() { return this.hasAttribute('data-scroll-reveal') ? this : this.parentElement?.closest() }
    querySelectorAll() {
      return this.children.flatMap(child => [
        ...(child.hasAttribute('data-scroll-reveal') ? [child] : []), ...child.querySelectorAll(),
      ])
    }
    querySelector() { return this.transition ? this : null }
    compareDocumentPosition(other) { return this.order < other.order ? 4 : 2 }
    addEventListener(name, callback) { this.listeners.set(name, callback) }
    removeEventListener(name) { this.listeners.delete(name) }
    animate(keyframes, options) {
      if (this.fail) throw new Error('Animation unavailable')
      const animation = { target: this, keyframes, options, cancelled: false, cancel() { this.cancelled = true } }
      animations.push(animation)
      return animation
    }
  }
  class Observer {
    observed = new Set()
    constructor(callback) { this.callback = callback; observers.push(this) }
    observe(element) { this.observed.add(element) }
    unobserve(element) { this.observed.delete(element) }
    disconnect() { this.observed.clear() }
    deliver(entries) { this.callback(entries.map(([target, isIntersecting]) => ({ target, isIntersecting }))) }
  }
  class Mutation {
    constructor(callback) { this.callback = callback; mutations.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
  }
  const main = new Element(), html = new Element()
  if (startup) html.attributes.add('data-devbit-startup')
  const document = { activeElement: null, documentElement: html }
  const motion = { matches: reduced, addEventListener: (_name, callback) => { motion.change = callback }, removeEventListener() { motion.change = null } }
  const callbacks = {}
  const register = name => callback => { callbacks[name] = callback; return () => { delete callbacks[name] } }
  const exports = {}
  const context = {
    exports, document, HTMLElement: Element, Node: Element, IntersectionObserver: Observer, MutationObserver: Mutation,
    window: { IntersectionObserver: unsupported ? undefined : Observer, MutationObserver: Mutation, matchMedia: () => motion },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId },
    cancelAnimationFrame(id) { frames.delete(id) },
    onMounted: register('mount'), onBeforeUnmount: register('unmount'),
    useRouter: () => ({ beforeResolve: register('before'), afterEach: register('after'), onError: register('error') }),
    useNuxtApp: () => ({ hook(name, callback) { hooks.set(name, callback); return () => hooks.delete(name) } }),
  }
  runInNewContext(controllerSource, context)
  const utility = { ...exports }
  if (layout) {
    context.require = () => utility
    runInNewContext(composableSource, context)
    exports.useScrollReveal({ value: main })
  }
  const controller = layout ? null : exports.createScrollReveal(main)
  return {
    main, html, document, animations, observers, mutations, frames, hooks, callbacks, motion, controller,
    add(parent = main) {
      const outer = parent.append(new Element())
      outer.attributes.add('data-scroll-reveal')
      const inner = outer.append(new Element())
      inner.attributes.add('data-scroll-reveal-motion')
      return outer
    },
    flush() {
      for (let i = 0; frames.size && i < 10; i++) {
        const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback())
      }
      assert.equal(frames.size, 0)
    },
    changed() { mutations[0].callback([{ type: 'childList', addedNodes: [new Element()], removedNodes: [] }]) },
    get observer() { return observers.at(-1) },
  }
}

test('initial visible content stays still; fully leaving and reentering replays in either direction', () => {
  const app = setup(), card = app.add()
  app.controller.resume()
  app.observer.deliver([[card, true]])
  assert.equal(app.animations.length, 0)
  for (let count = 1; count <= 3; count++) {
    app.observer.deliver([[card, false], [card, true]])
    assert.equal(app.animations.length, count)
    app.observer.deliver([[card, true]])
    assert.equal(app.animations.length, count, 'remaining partially visible never replays')
  }
  assert.ok(app.animations.slice(0, -1).every(animation => animation.cancelled))
})

test('offscreen content reveals in DOM order, with capped stagger on the separate inner layer', () => {
  const app = setup(), cards = Array.from({ length: 5 }, () => app.add())
  app.controller.resume()
  app.observer.deliver(cards.map(card => [card, false]))
  app.observer.deliver([...cards].reverse().map(card => [card, true]))
  assert.deepEqual(app.animations.map(animation => animation.options.delay), [0, 60, 120, 180, 180])
  assert.deepEqual(app.animations.map(animation => animation.target), cards.map(card => card.firstElementChild))
  for (const animation of app.animations) {
    assert.equal(animation.options.duration, 500)
    assert.equal(animation.keyframes[0].transform, 'translate3d(0, 16px, 0)')
    animation.onfinish()
    assert.equal(animation.cancelled, true, 'finished animations leave no styles behind')
  }
})

test('only outermost marked groups are observed', () => {
  const app = setup(), outer = app.add(), nested = app.add(outer.firstElementChild)
  app.controller.resume()
  assert.deepEqual([...app.observer.observed], [outer])
  assert.equal(app.observer.observed.has(nested), false)
})

test('rapid multiple crossings in one delivery only animate the final visible entry', () => {
  const app = setup(), card = app.add()
  app.controller.resume()
  app.observer.deliver([[card, false], [card, true], [card, false], [card, true]])
  assert.equal(app.animations.length, 1)
  app.observer.deliver([[card, false], [card, true], [card, false]])
  assert.equal(app.animations.length, 1)
  assert.equal(app.animations[0].cancelled, true)
})

test('late cards animate, unchanged cards do not replay, removed cards are cancelled and released', () => {
  const app = setup(), first = app.add()
  app.controller.resume()
  app.observer.deliver([[first, true]])
  const late = app.add()
  app.controller.refresh()
  app.observer.deliver([[late, true]])
  assert.equal(app.animations.length, 1)
  app.controller.refresh()
  app.observer.deliver([[late, true]])
  assert.equal(app.animations.length, 1)
  app.main.remove(late)
  app.controller.refresh()
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(app.observer.observed.has(late), false)
})

test('focus immediately restores visibility and a focused block never fades out on entry', () => {
  const app = setup(), card = app.add()
  app.controller.resume()
  app.observer.deliver([[card, false], [card, true]])
  app.document.activeElement = card.firstElementChild
  app.main.listeners.get('focusin')({ target: card.firstElementChild })
  assert.equal(app.animations[0].cancelled, true)
  app.observer.deliver([[card, false], [card, true]])
  assert.equal(app.animations.length, 1)
})

test('suspension cancels queued animations and stale callbacks; resume establishes a fresh viewport baseline', () => {
  const app = setup(), card = app.add()
  app.controller.resume()
  app.observer.deliver([[card, false], [card, true]])
  const old = app.observer
  app.controller.suspend()
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(old.observed.size, 0)
  app.controller.resume()
  old.deliver([[card, false], [card, true]])
  app.observer.deliver([[card, true]])
  assert.equal(app.animations.length, 1)
  app.controller.destroy()
  assert.equal(app.main.listeners.size, 0)
  assert.equal(app.observer.observed.size, 0)
})

test('animation failures leave normal content and observation usable', () => {
  const app = setup(), card = app.add()
  card.firstElementChild.fail = true
  app.controller.resume()
  assert.doesNotThrow(() => app.observer.deliver([[card, false], [card, true]]))
  assert.equal(app.animations.length, 0)
  card.firstElementChild.fail = false
  app.observer.deliver([[card, false], [card, true]])
  assert.equal(app.animations.length, 1)
})

test('layout waits for startup and resumes without replaying visible content', () => {
  const app = setup({ layout: true, startup: true }), card = app.add()
  app.callbacks.mount(); app.flush()
  assert.equal(app.observers.length, 0)
  app.html.attributes.clear()
  app.mutations[1].callback(); app.flush()
  app.observer.deliver([[card, true]])
  assert.equal(app.animations.length, 0)
  app.observer.deliver([[card, false], [card, true]])
  assert.equal(app.animations.length, 1)
})

test('route navigation pauses until rendering and route animation complete, including failed navigation', () => {
  const app = setup({ layout: true }), card = app.add()
  app.callbacks.mount(); app.flush()
  app.observer.deliver([[card, false], [card, true]])
  app.callbacks.before()
  assert.equal(app.animations[0].cancelled, true)
  app.main.transition = true
  app.callbacks.after()
  app.hooks.get('page:start')()
  app.hooks.get('page:finish')()
  app.flush()
  assert.equal(app.observer.observed.size, 0)
  app.main.transition = false
  app.hooks.get('page:transition:finish')(); app.flush()
  app.observer.deliver([[card, true]])
  assert.equal(app.animations.length, 1)
  app.callbacks.before(); app.callbacks.after({}, {}, new Error('cancelled')); app.flush()
  assert.equal(app.observer.observed.has(card), true)
  app.callbacks.before(); app.callbacks.error(new Error('failed')); app.flush()
  assert.equal(app.observer.observed.has(card), true)
})

test('reduced motion disables animation initially and changing it cancels motion immediately', () => {
  const app = setup({ layout: true, reduced: true }), card = app.add()
  app.callbacks.mount(); app.flush()
  assert.equal(app.observers.length, 0)
  app.motion.matches = false; app.motion.change(); app.flush()
  app.observer.deliver([[card, false], [card, true]])
  app.motion.matches = true; app.motion.change()
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(app.observer.observed.size, 0)
})

test('layout detects added nodes, ignores text updates, and disposes all observers and callbacks', () => {
  const app = setup({ layout: true })
  app.callbacks.mount(); app.flush()
  app.mutations[0].callback([{ type: 'childList', addedNodes: [{ nodeType: 3 }], removedNodes: [] }])
  assert.equal(app.frames.size, 0)
  const late = app.add()
  app.changed(); app.flush()
  app.observer.deliver([[late, true]])
  assert.equal(app.animations.length, 1)
  app.changed(); app.callbacks.unmount()
  assert.equal(app.frames.size, 0)
  assert.equal(app.hooks.size, 0)
  assert.equal(app.main.listeners.size, 0)
  assert.equal(app.motion.change, null)
  assert.equal(app.callbacks.before, undefined)
  assert.ok(app.mutations.every(observer => observer.disconnected))
  assert.equal(app.animations[0].cancelled, true)
})

test('unsupported browsers leave content untouched without registering effects', () => {
  const app = setup({ layout: true, unsupported: true })
  app.add(); app.callbacks.mount(); app.flush(); app.callbacks.unmount()
  assert.equal(app.observers.length, 0)
  assert.equal(app.mutations.length, 0)
  assert.equal(app.animations.length, 0)
})
