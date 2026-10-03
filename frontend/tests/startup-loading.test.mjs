import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const loaderSource = readFileSync(new URL('../app/components/StartupLoader.vue', import.meta.url), 'utf8')
const script = loaderSource.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const compiled = ts.transpileModule(script, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const pluginSource = readFileSync(new URL('../app/plugins/00.startup-loading.client.ts', import.meta.url), 'utf8')
const compiledPlugin = ts.transpileModule(pluginSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function setup({ game = false, inert = false, reducedMotion = false } = {}) {
  let now = 0
  let nextId = 0
  const timers = new Map()
  const attributes = new Map()
  const styles = new Map()
  const trackAttributes = new Map()
  const events = new Map()
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
    exports: {},
    window,
    defineNuxtPlugin: definition => { plugin = definition },
  })
  runInNewContext(compiled, {
    document: { documentElement: root, querySelector: selector => selector === '.startup-loader__track' ? track : content },
    window,
    onPrehydrate: callback => callback(),
  })
  plugin.setup({ hook: (name, callback) => hooks.set(name, callback) })

  return {
    plugin,
    hooks,
    window,
    timers,
    events,
    content,
    get visible() { return attributes.get('data-devbit-startup') === 'loading' },
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

test('fast hydration cancels the splash before the 200ms threshold', () => {
  const app = setup()
  app.advance(199)
  assert.equal(app.visible, false)
  assert.equal(app.content.inert, false)
  app.ready()
  app.advance(10_000)
  assert.equal(app.visible, false)
  assert.equal(app.timers.size, 0)
  assert.equal(app.events.size, 0)
})

test('slow startup starts its exit as soon as hydration resolves and restores interaction after the curtain exit', () => {
  const app = setup()
  app.advance(200)
  assert.equal(app.visible, true)
  assert.equal(app.content.inert, true)
  app.ready()
  assert.equal(app.visible, false)
  assert.equal(app.phase, 'leaving')
  assert.equal(app.content.inert, true)
  app.advance(419)
  assert.equal(app.phase, 'leaving')
  app.advance(1)
  assert.equal(app.phase, undefined)
  assert.equal(app.content.inert, false)
  assert.equal(app.timers.size, 0)
})

test('blocked application scripts cannot leave the splash active beyond 10 seconds', () => {
  const app = setup()
  app.advance(9_999)
  assert.equal(app.visible, true)
  app.advance(1)
  assert.equal(app.visible, false)
  assert.equal(app.content.inert, false)
  assert.equal(app.timers.size, 0)
  assert.equal(app.events.size, 0)
  app.advance(10_000)
  assert.equal(app.visible, false)
})

for (const event of ['app:error', 'vue:error', 'error', 'unhandledrejection']) {
  test(`${event} dismisses startup and cancels outstanding timers`, () => {
    const app = setup()
    app.advance(200)
    ;(app.hooks.get(event) ?? app.events.get(event))()
    assert.equal(app.visible, false)
    assert.equal(app.timers.size, 0)
    app.advance(10_000)
    assert.equal(app.visible, false)
  })
}

test('initialization errors before 200ms prevent a later splash flash', () => {
  const app = setup()
  app.hooks.get('app:error')()
  app.advance(200)
  assert.equal(app.visible, false)
})

test('completion is idempotent when readiness and errors both arrive', () => {
  const app = setup()
  app.advance(200)
  app.ready()
  app.hooks.get('app:error')()
  app.window.__devbitStartupLoading.finish()
  assert.equal(app.visible, false)
  assert.equal(app.phase, undefined)
  assert.equal(app.timers.size, 0)
})

test('game startup does not register splash timers or browser handlers', () => {
  const app = setup({ game: true })
  app.advance(10_000)
  assert.equal(app.visible, false)
  assert.equal(app.timers.size, 0)
  assert.equal(app.events.size, 0)
  assert.equal(app.window.__devbitStartupLoading, undefined)
  assert.doesNotThrow(() => app.ready())
})

test('readiness hooks run in an early plugin and wait for mounting and hydration', () => {
  const app = setup()
  assert.equal(app.plugin.enforce, 'pre')
  assert.equal(app.hooks.has('app:suspense:resolve'), true)
  assert.equal(app.hooks.has('app:mounted'), true)
})

test('dismissal preserves content that was already inert before startup', () => {
  const app = setup({ inert: true })
  app.advance(200)
  app.ready()
  app.advance(420)
  assert.equal(app.content.inert, true)
})

test('reduced motion dismisses immediately without a page transition', () => {
  const app = setup({ reducedMotion: true })
  app.advance(200)
  app.ready()
  assert.equal(app.phase, undefined)
  assert.equal(app.content.inert, false)
  assert.equal(app.timers.size, 0)
})

test('readiness during the entrance does not enforce a minimum display time', () => {
  const app = setup()
  app.advance(210)
  app.ready()
  assert.equal(app.phase, 'leaving')
  app.advance(420)
  assert.equal(app.phase, undefined)
  assert.equal(app.content.inert, false)
})

test('repeated readiness signals preserve a single exit timer', () => {
  const app = setup()
  app.advance(200)
  app.ready()
  app.ready()
  assert.equal(app.timers.size, 1)
  app.advance(420)
  assert.equal(app.phase, undefined)
  assert.equal(app.timers.size, 0)
})

test('real startup milestones advance the bar without time-based progress', () => {
  const app = setup()
  assert.equal(app.progress, '25')
  assert.equal(app.fill, '0.25')
  app.advance(2_000)
  assert.equal(app.progress, '25')
  app.hooks.get('app:created')()
  assert.equal(app.progress, '65')
  assert.equal(app.fill, '0.65')
  app.advance(2_000)
  assert.equal(app.progress, '65')
  app.ready()
  assert.equal(app.progress, '100')
  assert.equal(app.fill, '1')
  assert.equal(app.phase, 'leaving')
  app.advance(420)
  assert.equal(app.stage, undefined)
  assert.equal(app.fill, undefined)
})

test('duplicate, invalid and out-of-order milestones cannot move the bar backwards or complete it', () => {
  const app = setup()
  app.window.__devbitStartupLoading.setProgress(65)
  for (const value of [25, 65, 100, 0, NaN, Infinity]) {
    app.window.__devbitStartupLoading.setProgress(value)
    assert.equal(app.progress, '65')
  }
  assert.equal(app.phase, undefined)
})

for (const first of ['app:mounted', 'app:suspense:resolve']) {
  test(`100% requires both mounting and hydration when ${first} arrives first`, () => {
    const app = setup()
    app.advance(200)
    app.hooks.get('app:created')()
    app.hooks.get(first)()
    assert.equal(app.progress, '65')
    assert.equal(app.phase, 'loading')
    app.hooks.get(first === 'app:mounted' ? 'app:suspense:resolve' : 'app:mounted')()
    assert.equal(app.progress, '100')
    assert.equal(app.phase, 'leaving')
  })
}

test('failed or timed-out startup never reports successful completion or accepts late milestones', () => {
  for (const fail of [app => app.hooks.get('app:error')(), app => app.advance(10_000)]) {
    const app = setup()
    app.advance(200)
    fail(app)
    app.hooks.get('app:created')()
    app.ready()
    assert.equal(app.progress, undefined)
    assert.equal(app.stage, undefined)
    assert.equal(app.fill, undefined)
    assert.equal(app.phase, undefined)
    assert.equal(app.content.inert, false)
    assert.equal(app.timers.size, 0)
  }
})
