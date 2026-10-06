import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../app/utils/forumDock.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup() {
  const frames = new Map(), listeners = new Map(), changes = [], transitions = []
  let nextFrame = 0, enabled = true, composing = false, bottom = 74, ready = true, blocked = false
  const search = { top: 180, get offsetTop() { return this.top }, offsetParent: null }
  const sort = { top: 230, get offsetTop() { return this.top }, offsetParent: null }
  const navigation = { getBoundingClientRect() { return { bottom } } }
  const viewportListeners = new Map()
  const surface = entries => ({
    addEventListener(name, callback) { entries.set(name, callback) },
    removeEventListener(name) { entries.delete(name) },
  })
  let observer, onChange
  class Observer {
    constructor(callback) { this.callback = callback; this.elements = new Set(); observer = this }
    observe(element) { this.elements.add(element) }
    disconnect() { this.elements.clear() }
  }
  const exports = {}
  const viewport = { ...surface(listeners), visualViewport: surface(viewportListeners), scrollY: 0 }
  const rendered = { search: false, sort: false }
  runInNewContext(compiled, { exports, ResizeObserver: Observer,
    window: viewport,
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id },
    cancelAnimationFrame(id) { frames.delete(id) },
  })
  const controller = exports.createForumDockController({
    navigation: () => navigation, source: control => control === 'search' ? search : sort,
    enabled: () => enabled, composing: () => composing,
    ready: () => ready, blocked: () => blocked,
    docked: control => rendered[control],
    change(control, docked, animate) { rendered[control] = docked; changes.push([control, docked]); transitions.push([control, docked, animate]); onChange?.(control, docked) },
  })
  function flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) }
  return { controller, changes, transitions, viewport, rendered, search, sort, frames, listeners, viewportListeners,
    observer: () => observer, flush,
    update() { controller.schedule(); flush() },
    enable(value) { enabled = value }, compose(value) { composing = value },
    bottom(value) { bottom = value }, onChange(callback) { onChange = callback },
    ready(value) { ready = value }, blocked(value) { blocked = value },
  }
}

test('each control docks on contact and restores only after the return buffer', () => {
  const app = setup()
  app.flush()
  assert.deepEqual(app.changes, [])
  app.search.top = 74; app.update()
  assert.deepEqual(app.changes, [['search', true]])
  app.search.top = 79; app.update()
  assert.equal(app.changes.length, 1, 'small reverse scroll must not flicker')
  app.search.top = 83; app.update()
  assert.deepEqual(app.changes.at(-1), ['search', false])
})

test('route entry ignores outgoing scroll and establishes controls silently after layout and scroll settle', () => {
  const app = setup()
  app.flush()
  app.controller.suspend()
  app.viewport.scrollY = 500
  app.listeners.get('scroll')()
  assert.equal(app.frames.size, 0, 'navigation suspends scroll updates')
  app.ready(false)
  app.controller.resume(); app.flush()
  assert.deepEqual(app.transitions, [])
  app.ready(true); app.blocked(true)
  app.controller.refresh(); app.flush(); app.flush()
  assert.deepEqual(app.transitions, [], 'incoming page animation cannot trigger a handoff')
  app.blocked(false)
  for (const scroll of [400, 250, 100, 0]) {
    app.viewport.scrollY = scroll; app.flush()
    assert.deepEqual(app.transitions, [], 'smooth router scrolling cannot trigger a handoff')
  }
  app.flush(); app.flush()
  assert.deepEqual(app.transitions, [['search', false, false], ['sort', false, false]])
  app.viewport.scrollY = 300; app.update()
  assert.deepEqual(app.transitions.slice(-2), [['search', true, true], ['sort', true, true]], 'later user scrolling animates normally')
})

test('a restored deep forum position docks silently and does not inherit the previous route buffer', () => {
  const app = setup()
  app.controller.suspend(); app.viewport.scrollY = 500; app.controller.resume()
  app.flush(); app.flush()
  assert.deepEqual(app.transitions, [['search', true, false], ['sort', true, false]])
  app.controller.suspend(); app.viewport.scrollY = 0
  app.search.top = 78; app.sort.top = 78
  app.controller.resume(); app.flush(); app.flush()
  assert.deepEqual(app.transitions.slice(-2), [['search', false, false], ['sort', false, false]])
})

test('interrupted navigation and unmount discard pending initialization frames', () => {
  const app = setup()
  app.controller.suspend(); app.controller.resume(); app.flush()
  app.controller.suspend()
  assert.equal(app.frames.size, 0)
  app.viewport.scrollY = 500
  app.controller.resume(); app.flush(); app.flush()
  assert.deepEqual(app.transitions, [['search', true, false], ['sort', true, false]])
  app.controller.suspend(); app.controller.resume(); app.controller.dispose()
  app.controller.resume(); app.flush()
  assert.equal(app.frames.size, 0)
  assert.equal(app.transitions.length, 2)
})

test('immediate user scrolling during route entry animates without waiting for page motion to finish', () => {
  for (const [type, details] of [['wheel', { deltaY: 200 }], ['touchmove', {}], ['keydown', { key: 'PageDown' }]]) {
    const app = setup()
    app.controller.suspend(); app.controller.resume(); app.blocked(true)
    app.listeners.get(type)({ type, isTrusted: true, ...details })
    app.viewport.scrollY = 300; app.flush()
    assert.deepEqual(app.transitions, [['search', true, true], ['sort', true, true]], type)
    app.controller.resume(); app.viewport.scrollY = 0; app.update()
    assert.deepEqual(app.transitions.slice(-2), [['search', false, true], ['sort', false, true]], 'later lifecycle hooks cannot mute active scrolling')
  }
})

test('early input waits for the incoming controls, then uses their reset rendered state', () => {
  const app = setup()
  app.viewport.scrollY = 300; app.update()
  app.controller.suspend(); app.ready(false); app.rendered.search = false; app.rendered.sort = false
  app.transitions.length = 0
  app.listeners.get('wheel')({ type: 'wheel', isTrusted: true, deltaY: 200 })
  app.controller.resume(); app.flush()
  assert.deepEqual(app.transitions, [], 'no animation before the new controls exist')
  app.ready(true); app.blocked(true); app.controller.refresh(); app.flush()
  assert.deepEqual(app.transitions, [['search', true, true], ['sort', true, true]])
})

test('horizontal wheel movement and typing cannot opt automatic restoration into animation', () => {
  const app = setup()
  app.controller.suspend(); app.controller.resume()
  app.listeners.get('wheel')({ type: 'wheel', isTrusted: true, deltaY: 0 })
  app.listeners.get('keydown')({ type: 'keydown', isTrusted: true, key: 'a' })
  app.listeners.get('keydown')({ type: 'keydown', isTrusted: true, key: 'ArrowDown', target: { closest: () => ({}) } })
  app.listeners.get('wheel')({ type: 'wheel', isTrusted: false, deltaY: 200 })
  app.viewport.scrollY = 300; app.flush(); app.flush(); app.flush()
  assert.deepEqual(app.transitions, [['search', true, false], ['sort', true, false]])
})

test('phone search docks before the lower sort row without changing either source', () => {
  const app = setup()
  app.search.top = 60; app.sort.top = 120; app.update()
  assert.deepEqual(app.changes, [['search', true]])
  assert.equal(app.sort.top, 120)
  app.sort.top = 74; app.update()
  assert.deepEqual(app.changes.at(-1), ['sort', true])
  app.search.top = 120; app.sort.top = 180; app.update()
  assert.deepEqual(app.changes.slice(-2), [['search', false], ['sort', false]])
})

test('composition postpones both search directions while sort can still dock', () => {
  const app = setup()
  app.compose(true); app.search.top = 40; app.sort.top = 40; app.update()
  assert.deepEqual(app.changes, [['sort', true]])
  app.compose(false); app.update()
  assert.deepEqual(app.changes.at(-1), ['search', true])
  app.compose(true); app.search.top = 130; app.update()
  assert.deepEqual(app.changes.at(-1), ['search', true])
  app.compose(false); app.update()
  assert.deepEqual(app.changes.at(-1), ['search', false])
})

test('source readings precede a navigation resize caused by the first dock', () => {
  const app = setup()
  app.search.top = 70; app.sort.top = 90
  app.onChange(control => { if (control === 'search') app.bottom(100) })
  app.update()
  assert.deepEqual(app.changes, [['search', true]])
  app.observer().callback(); app.flush()
  assert.deepEqual(app.changes.at(-1), ['sort', true])
})

test('leaving the forum resets both dock states even during composition', () => {
  const app = setup()
  app.search.top = 0; app.sort.top = 0; app.update()
  app.compose(true); app.enable(false); app.controller.refresh(); app.flush()
  assert.deepEqual(app.changes.slice(-2), [['search', false], ['sort', false]])
})

test('scroll and resize events share one frame and disposal releases all resources', () => {
  const app = setup()
  app.flush()
  app.listeners.get('scroll')(); app.listeners.get('resize')(); app.viewportListeners.get('resize')()
  assert.equal(app.frames.size, 1)
  assert.equal(app.observer().elements.size, 3)
  app.controller.dispose()
  assert.equal(app.frames.size, 0)
  assert.equal(app.listeners.size, 0)
  assert.equal(app.viewportListeners.size, 0)
  assert.equal(app.observer().elements.size, 0)
  app.controller.refresh(); app.controller.schedule(); app.observer().callback()
  assert.equal(app.frames.size, 0)
  assert.deepEqual(app.changes, [])
})
