import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const compiled = ts.transpileModule(readFileSync(new URL('../app/utils/forumPopupLayout.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function setup(height = '', priority = '') {
  const timers = new Map()
  let nextId = 0, releases = 0
  const values = new Map(height ? [['min-height', { height, priority }]] : [])
  const element = { height: 1400.25, getBoundingClientRect() { return { height: this.height } }, style: {
    getPropertyValue: key => values.get(key)?.height ?? '',
    getPropertyPriority: key => values.get(key)?.priority ?? '',
    setProperty: (key, height, priority) => values.set(key, { height, priority }),
    removeProperty: key => values.delete(key),
  } }
  const exports = {}
  runInNewContext(compiled, { exports,
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, delay }); return id },
    clearTimeout(id) { timers.delete(id) },
  })
  return { layout: exports.createForumPopupLayout(() => releases++), element, timers, values,
    releases: () => releases, flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(t => t.callback()) } }
}

test('short results keep the original page height throughout a popup handoff', () => {
  const app = setup()
  app.layout.hold(app.element)
  assert.equal(app.element.style.getPropertyValue('min-height'), '1401px')
  app.element.height = 400
  app.layout.release(400)
  assert.equal(app.timers.size, 1)
  app.layout.hold(app.element)
  assert.equal(app.timers.size, 0, 'the next popup cancels the pending release')
  assert.equal(app.element.style.getPropertyValue('min-height'), '1401px', 'do not recapture the shortened results')
  app.flush()
  assert.equal(app.releases(), 0)
  app.layout.release(400); app.flush()
  assert.equal(app.element.style.getPropertyValue('min-height'), '')
  assert.equal(app.releases(), 1)
})

test('release restores existing inline sizing and priority after the leave animation', () => {
  const app = setup('600px', 'important')
  app.layout.hold(app.element)
  assert.equal(app.element.style.getPropertyPriority('min-height'), 'important')
  app.layout.release(400)
  assert.equal([...app.timers.values()][0].delay, 400)
  app.flush()
  assert.equal(app.element.style.getPropertyValue('min-height'), '600px')
  assert.equal(app.element.style.getPropertyPriority('min-height'), 'important')
})

test('route departure releases immediately and unmount cancels timers without stale writes', () => {
  const app = setup()
  app.layout.hold(app.element); app.layout.release(400)
  app.layout.release()
  assert.equal(app.timers.size, 0)
  assert.equal(app.values.size, 0)
  app.layout.hold(app.element); app.layout.release(400)
  app.layout.dispose()
  assert.equal(app.timers.size, 0)
  assert.equal(app.values.size, 0)
  assert.equal(app.releases(), 2)
  app.layout.hold(app.element); app.layout.release(400); app.flush()
  assert.equal(app.releases(), 2)
  assert.equal(app.values.size, 0)
})
