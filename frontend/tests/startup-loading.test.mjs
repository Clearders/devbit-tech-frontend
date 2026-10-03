import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const compiled = compile('../app/utils/startupLoading.ts')
const compiledPlugin = compile('../app/plugins/00.startup-loading.client.ts')

function setup({ game = false, inert = false, reducedMotion = false, parse = true } = {}) {
  let now = 0
  let nextId = 0
  let parsed = false
  const timers = new Map()
  const attributes = new Map()
  const styles = new Map()
  const trackAttributes = new Map()
  const events = new Map()
  const documentEvents = new Map()
  const content = { inert }
  const root = {
    classList: { contains: name => game && name === 'is-game' },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: name => styles.delete(name),
    },
  }
  const track = {
    setAttribute: (name, value) => trackAttributes.set(name, value),
    removeAttribute: name => trackAttributes.delete(name),
  }
  const window = {
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(callback, delay) {
      const id = ++nextId
      timers.set(id, { at: now + delay, callback })
      return id
    },
    clearTimeout: id => timers.delete(id),
    addEventListener: (name, callback) => events.set(name, callback),
    removeEventListener: name => events.delete(name),
  }
  const hooks = new Map()
  let plugin
  runInNewContext(compiledPlugin, {
    exports: {}, window, defineNuxtPlugin: definition => { plugin = definition },
  })
  const exports = {}
  const context = {
    exports, window, performance: { now: () => now },
    document: {
      documentElement: root,
      querySelector: selector => parsed ? selector === '.startup-loader__track' ? track : content : null,
      addEventListener: (name, callback) => documentEvents.set(name, callback),
      removeEventListener: name => documentEvents.delete(name),
    },
  }
  runInNewContext(compiled, context)
  exports.initializeStartupLoading(window, context.document, context.performance)
  const parseBody = () => {
    parsed = true
    window.__devbitStartupLoading?.start()
    documentEvents.get('DOMContentLoaded')?.()
    plugin.setup({ hook: (name, callback) => hooks.set(name, callback) })
  }
  if (parse) parseBody()

  return {
    plugin, hooks, window, timers, events, documentEvents, content, parseBody,
    get phase() { return attributes.get('data-devbit-startup') },
    get progress() { return trackAttributes.get('aria-valuenow') },
    get stage() { return attributes.get('data-devbit-startup-stage') },
    get fill() { return styles.get('--devbit-startup-progress') },
    ready() {
      hooks.get('app:mounted')()
      hooks.get('app:suspense:resolve')()
    },
    advance(ms) {
      const end = now + ms
      while (true) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        now = next[1].at
        timers.delete(next[0])
        next[1].callback()
      }
      now = end
    },
  }
}

function assertReleased(app, inert = false) {
  assert.equal(app.phase, undefined)
  assert.equal(app.content.inert, inert)
  assert.equal(app.timers.size, 0)
  assert.equal(app.events.size, 0)
  assert.equal(app.documentEvents.size, 0)
  assert.equal(app.fill, undefined)
}

test('head takes ownership before body parsing or application initialization', () => {
  const app = setup({ parse: false })
  assert.equal(app.phase, 'loading')
  app.advance(1500)
  app.parseBody()
  app.ready()
  app.advance(1199)
  assert.equal(app.phase, 'loading', 'head download time must not consume the visible splash')
  app.advance(1)
  assert.equal(app.phase, 'leaving')
  app.advance(1120)
  assertReleased(app)
})

test('fast hydration keeps a 1200ms splash and 1120ms coordinated transition', () => {
  const app = setup()
  assert.equal(app.phase, 'loading')
  assert.equal(app.content.inert, true)
  app.advance(10)
  app.ready()
  assert.equal(app.progress, '100')
  app.advance(1189)
  assert.equal(app.phase, 'loading')
  app.advance(1)
  assert.equal(app.phase, 'leaving')
  assert.equal(app.content.inert, true)
  app.advance(1119)
  assert.equal(app.phase, 'leaving')
  app.advance(1)
  assertReleased(app)
})

test('slow startup waits only for the 200ms completion stroke, without another full splash', () => {
  const app = setup()
  app.advance(3000)
  assert.equal(app.progress, '25')
  app.ready()
  app.advance(199)
  assert.equal(app.phase, 'loading')
  app.advance(1)
  assert.equal(app.phase, 'leaving')
  app.advance(1120)
  assertReleased(app)
})

test('deferred bundle initialization cannot reset the body-close splash clock', () => {
  const app = setup()
  app.advance(2500)
  app.window.__devbitStartupLoading.start()
  app.ready()
  app.advance(200)
  assert.equal(app.phase, 'leaving')
  app.advance(1120)
  assertReleased(app)
})

test('readiness near the end of splash still lets the 100% stroke settle', () => {
  const app = setup()
  app.advance(1150)
  app.ready()
  app.advance(199)
  assert.equal(app.phase, 'loading')
  app.advance(1)
  assert.equal(app.phase, 'leaving')
})

test('missing bundles and even an unparsed body cannot trap the first-paint gate', () => {
  for (const parse of [true, false]) {
    const app = setup({ parse })
    app.advance(9999)
    assert.equal(app.phase, 'loading')
    app.advance(1)
    assertReleased(app)
    app.parseBody()
    app.ready()
    assertReleased(app)
  }
})

for (const event of ['app:error', 'vue:error', 'error', 'unhandledrejection', 'pagehide']) {
  for (const phase of ['splash', 'pending', 'leaving']) {
    test(`${event} releases immediately during ${phase} and cancels all callbacks`, () => {
      const app = setup()
      if (phase !== 'splash') app.ready()
      if (phase === 'leaving') app.advance(1200)
      ;(app.hooks.get(event) ?? app.events.get(event))()
      assertReleased(app)
      app.advance(10_000)
      assertReleased(app)
    })
  }
}

test('duplicate readiness cannot restart or extend either phase', () => {
  const app = setup()
  app.ready()
  app.advance(1000)
  app.ready()
  app.advance(200)
  assert.equal(app.phase, 'leaving')
  app.ready()
  app.advance(1120)
  assertReleased(app)
  app.ready()
  assertReleased(app)
})

test('game startup has no gate, timers or browser handlers', () => {
  const app = setup({ game: true })
  assertReleased(app)
  assert.equal(app.window.__devbitStartupLoading, undefined)
  assert.doesNotThrow(() => app.ready())
})

test('dismissal preserves content that was already inert before startup', () => {
  const app = setup({ inert: true })
  app.ready()
  app.advance(2320)
  assertReleased(app, true)
})

test('reduced motion uses a brief stable splash with no moving transition', () => {
  const app = setup({ reducedMotion: true })
  app.ready()
  app.advance(399)
  assert.equal(app.phase, 'loading')
  app.advance(1)
  assertReleased(app)
})

test('real milestones advance monotonically regardless of the animation clock', () => {
  const app = setup()
  assert.equal(app.progress, '25')
  app.advance(2000)
  assert.equal(app.progress, '25')
  app.hooks.get('app:created')()
  assert.equal(app.progress, '65')
  assert.equal(app.fill, '0.65')
  for (const value of [25, 65, 100, 0, NaN, Infinity]) {
    app.window.__devbitStartupLoading.setProgress(value)
    assert.equal(app.progress, '65')
  }
  app.advance(2000)
  assert.equal(app.progress, '65')
  app.ready()
  assert.equal(app.progress, '100')
  assert.equal(app.fill, '1')
  app.advance(1320)
  assertReleased(app)
})

for (const first of ['app:mounted', 'app:suspense:resolve']) {
  test(`both readiness hooks are required when ${first} arrives first`, () => {
    const app = setup()
    assert.equal(app.plugin.enforce, 'pre')
    app.hooks.get('app:created')()
    app.hooks.get(first)()
    app.advance(2000)
    assert.equal(app.progress, '65')
    assert.equal(app.phase, 'loading')
    app.hooks.get(first === 'app:mounted' ? 'app:suspense:resolve' : 'app:mounted')()
    assert.equal(app.progress, '100')
    app.advance(200)
    assert.equal(app.phase, 'leaving')
  })
}

test('error and timeout do not report success or accept late milestones', () => {
  for (const fail of [app => app.hooks.get('app:error')(), app => app.advance(10_000)]) {
    const app = setup()
    fail(app)
    app.hooks.get('app:created')()
    app.ready()
    assert.equal(app.progress, undefined)
    assert.equal(app.stage, undefined)
    assertReleased(app)
  }
})
