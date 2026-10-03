import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../app/composables/usePageTransition.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replaceAll('import.meta.client', 'true'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function style() {
  const properties = new Map()
  return {
    setProperty: (name, value, priority = '') => properties.set(name, { value, priority }),
    removeProperty: name => properties.delete(name),
    getPropertyValue: name => properties.get(name)?.value ?? '',
    getPropertyPriority: name => properties.get(name)?.priority ?? '',
  }
}

function group(kind, parent = null) {
  const attributes = new Map()
  return {
    dataset: { transitionGroup: kind },
    parentElement: { closest: () => parent },
    style: style(),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    getAttribute: name => attributes.get(name),
  }
}

function setup({ reducedMotion = false, startup = false } = {}) {
  const callbacks = {}
  const motionEvents = new Map()
  const disposals = []
  let dismissals = 0
  const motion = {
    matches: reducedMotion,
    addEventListener: (name, callback) => motionEvents.set(name, callback),
    removeEventListener: name => motionEvents.delete(name),
  }
  const register = name => callback => {
    callbacks[name] = callback
    return () => disposals.push(name)
  }
  const exports = {}
  runInNewContext(compiled, {
    exports,
    shallowRef: value => ({ value }),
    useRouter: () => ({
      beforeResolve: register('beforeResolve'),
      afterEach: register('afterEach'),
      onError: register('routerError'),
    }),
    useNuxtApp: () => ({ hook: (_name, callback) => register('appError')(callback) }),
    onBeforeUnmount: callback => { callbacks.unmount = callback },
    window: {
      matchMedia: () => motion,
      __devbitStartupLoading: { finish: immediate => { assert.equal(immediate, true); dismissals++ } },
    },
    document: { documentElement: { hasAttribute: () => startup } },
  })
  const transition = exports.usePageTransition()
  const main = { style: style(), getBoundingClientRect: () => ({ height: 720 }) }
  const groups = [group('title'), group('content'), ...Array.from({ length: 6 }, () => group('card'))]
  const element = {
    closest: () => main,
    querySelectorAll: () => groups,
    contains: parent => groups.includes(parent),
  }
  return {
    transition, callbacks, motion, motionEvents, disposals, main, groups, element,
    get dismissals() { return dismissals },
    navigate(to = {}, from = {}) { callbacks.beforeResolve({ meta: to }, { meta: from }) },
  }
}

test('page fade has no initial appearance and includes the final staggered group', () => {
  const app = setup()
  assert.equal(app.transition.value.mode, 'out-in')
  assert.equal(app.transition.value.appear, false)
  assert.equal(app.transition.value.duration.enter, 340)
  assert.equal(app.transition.value.duration.leave, 140)
  app.transition.value.onBeforeEnter(app.element)
  assert.deepEqual(app.groups.map(g => g.style.getPropertyValue('--route-reveal-delay')),
    ['0ms', '40ms', '60ms', '80ms', '100ms', '100ms', '100ms', '100ms'])
  assert.equal(app.groups[0].getAttribute('data-route-reveal'), 'title')
})

test('nested groups and content arriving later cannot acquire a second animation', () => {
  const app = setup()
  const child = group('card', app.groups[1])
  app.groups.push(child)
  app.transition.value.onBeforeEnter(app.element)
  assert.equal(child.getAttribute('data-route-reveal'), undefined)
  const late = group('card')
  app.groups.push(late)
  assert.equal(late.getAttribute('data-route-reveal'), undefined)
})

for (const end of ['onAfterEnter', 'onEnterCancelled', 'onLeaveCancelled']) {
  test(`${end} restores the original layout height and clears animation markers`, () => {
    const app = setup()
    app.main.style.setProperty('min-height', '15rem', 'important')
    app.transition.value.onBeforeLeave(app.element)
    assert.equal(app.main.style.getPropertyValue('min-height'), '720px')
    app.transition.value.onBeforeEnter(app.element)
    app.transition.value[end]()
    assert.equal(app.main.style.getPropertyValue('min-height'), '15rem')
    assert.equal(app.main.style.getPropertyPriority('min-height'), 'important')
    for (const item of app.groups) {
      assert.equal(item.getAttribute('data-route-reveal'), undefined)
      assert.equal(item.style.getPropertyValue('--route-reveal-delay'), '')
    }
  })
}

test('rapid navigation, navigation failure and application errors release a reserved height', () => {
  const app = setup()
  for (const end of [() => app.navigate(), () => app.callbacks.afterEach({}, {}, new Error('cancelled')),
    app.callbacks.routerError, app.callbacks.appError]) {
    app.transition.value.onBeforeLeave(app.element)
    app.transition.value.onBeforeEnter(app.element)
    end()
    assert.equal(app.main.style.getPropertyValue('min-height'), '')
    assert.equal(app.groups[0].getAttribute('data-route-reveal'), undefined)
  }
})

test('both directions of game navigation bypass transitions and normal navigation restores them', () => {
  const app = setup()
  app.navigate({ layout: 'game' })
  assert.equal(app.transition.value, false)
  app.navigate({}, { layout: 'game' })
  assert.equal(app.transition.value, false)
  app.navigate()
  assert.equal(app.transition.value.mode, 'out-in')
  app.navigate({ pageTransition: false })
  assert.equal(app.transition.value, false)
})

test('navigation interrupts startup and reduced motion has no animation delay or markers', () => {
  const app = setup({ startup: true, reducedMotion: true })
  app.navigate()
  assert.equal(app.dismissals, 1)
  assert.equal(app.transition.value.duration, 0)
  app.transition.value.onBeforeEnter(app.element)
  assert.equal(app.groups[0].getAttribute('data-route-reveal'), undefined)
})

test('motion preference changes and unmounting clean up state and registrations', () => {
  const app = setup()
  app.transition.value.onBeforeLeave(app.element)
  app.transition.value.onBeforeEnter(app.element)
  app.motion.matches = true
  app.motionEvents.get('change')()
  assert.equal(app.main.style.getPropertyValue('min-height'), '')
  assert.equal(app.transition.value.duration, 0)
  app.callbacks.unmount()
  assert.equal(app.disposals.length, 4)
  assert.equal(app.motionEvents.size, 0)
})
