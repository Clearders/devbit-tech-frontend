import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import * as Vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'
import ts from 'typescript'

const { descriptor } = parse(readFileSync(new URL('../app/components/InfoDisclosure.vue', import.meta.url), 'utf8'))
const script = compileScript(descriptor, { id: 'disclosure-state-test' }).content
const exports = {}
runInNewContext(ts.transpileModule(script, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { ...Vue, exports, require: name => name === 'vue' ? Vue : {} })

async function setup(props = {}) {
  let state
  const updates = []
  const component = {
    ...exports.default,
    setup(props, context) { state = exports.default.setup(props, context); return state },
    render() { return null },
  }
  await renderToString(Vue.createSSRApp(component, { title: '说明', ...props, 'onUpdate:modelValue': value => updates.push(value) }))
  return { state, updates }
}

test('an omitted Boolean model uses local state instead of being cast to false', async () => {
  const { state, updates } = await setup()
  assert.equal(state.props.modelValue, undefined)
  assert.equal(state.desired.value, false)
  state.toggle()
  assert.equal(state.desired.value, true)
  state.toggle()
  assert.equal(state.desired.value, false)
  assert.deepEqual(updates, [true, false])
})

test('a controlled disclosure reflects the parent state and emits the requested change', async () => {
  for (const modelValue of [false, true]) {
    const { state, updates } = await setup({ modelValue })
    assert.equal(state.desired.value, modelValue)
    assert.equal(state.renderedOpen.value, modelValue)
    state.toggle()
    assert.equal(state.desired.value, modelValue, 'only the parent should commit a controlled change')
    assert.deepEqual(updates, [!modelValue])
  }
})
