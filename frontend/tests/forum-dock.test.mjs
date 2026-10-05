import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../app/utils/forumDock.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function setup() {
  const frames = new Map(), listeners = new Map(), changes = []
  let nextFrame = 0, enabled = true, composing = false, bottom = 74
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
  runInNewContext(compiled, { exports, ResizeObserver: Observer,
    window: { ...surface(listeners), visualViewport: surface(viewportListeners), scrollY: 0 },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id },
    cancelAnimationFrame(id) { frames.delete(id) },
  })
  const controller = exports.createForumDockController({
    navigation: () => navigation, source: control => control === 'search' ? search : sort,
    enabled: () => enabled, composing: () => composing,
    change(control, docked) { changes.push([control, docked]); onChange?.(control, docked) },
  })
  function flush() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()) }
  return { controller, changes, search, sort, frames, listeners, viewportListeners,
    observer: () => observer, flush,
    update() { controller.schedule(); flush() },
    enable(value) { enabled = value }, compose(value) { composing = value },
    bottom(value) { bottom = value }, onChange(callback) { onChange = callback },
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
