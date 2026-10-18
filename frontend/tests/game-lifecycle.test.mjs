import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { ref } from 'vue'
import ts from 'typescript'

const source = readFileSync(new URL('../app/components/GameWasmLoader.vue', import.meta.url), 'utf8')
const shared = source.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1]
const setup = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const compiled = ts.transpileModule(setup + '\nexports.loaderTest = { state, errorMessage }', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const sharedCode = ts.transpileModule(shared, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const settle = () => new Promise(resolve => setImmediate(resolve))

function environment(initialization = async () => {}) {
  let active, initCalls = 0
  const canvas = { style: {}, tabIndex: -1, setAttribute() {}, addEventListener() {}, removeEventListener() {}, getContext: () => ({ isContextLost: () => false }) }
  const context = {
    ref, Promise, setTimeout, clearTimeout, console: { warn() {}, error() {} },
    defineProps: () => ({ wasmPath: '/experiment.js', title: '实验' }), withDefaults: value => value,
    document: { documentElement: { classList: { contains: () => false } }, body: { contains: () => true, appendChild() {} }, querySelector: () => canvas },
    window: { addEventListener() {}, removeEventListener() {}, location: { reload() {} } },
    onMounted: fn => active.mounts.push(fn), onUnmounted: fn => active.unmounts.push(fn),
    require: name => name === '~/utils/gameLoading' ? { waitForGameCanvas: async find => find() }
      : name === '/experiment.js' ? { __esModule: true, default: async () => { initCalls++; await initialization() } } : {},
  }
  runInNewContext(sharedCode + '\nthis.create = () => { const exports = {};\n' + compiled + '\nreturn exports.loaderTest }', context)
  return {
    canvas, get initCalls() { return initCalls },
    instance() {
      active = { mounts: [], unmounts: [] }
      const hooks = active, instance = context.create()
      return { ...instance, mount: () => hooks.mounts.forEach(fn => fn()), unmount: () => hooks.unmounts.forEach(fn => fn()) }
    },
  }
}

test('reentry displays the saved canvas even before the layout adds its game class', async () => {
  const env = environment(), first = env.instance()
  first.mount(); await settle()
  assert.equal(first.state.value, 'running'); assert.equal(env.canvas.style.display, 'block')
  first.unmount(); assert.equal(env.canvas.style.display, 'none')
  for (let i = 0; i < 3; i++) {
    const next = env.instance(); next.mount()
    assert.equal(next.state.value, 'running'); assert.equal(env.canvas.style.display, 'block')
    next.unmount(); assert.equal(env.canvas.style.display, 'none')
  }
  assert.equal(env.initCalls, 1)
})

test('leaving during initialization hides the late canvas and a subsequent entry can reuse it', async () => {
  let finish
  const gate = new Promise(resolve => { finish = resolve }), env = environment(() => gate)
  const first = env.instance(); first.mount(); await settle(); first.unmount()
  finish(); await settle()
  assert.equal(env.canvas.style.display, 'none')
  assert.notEqual(first.state.value, 'running')
  const next = env.instance(); next.mount()
  assert.equal(next.state.value, 'running'); assert.equal(env.canvas.style.display, 'block')
  assert.equal(env.initCalls, 1); next.unmount()
})

test('initialization failure produces a retryable error and never reports running', async () => {
  const env = environment(async () => { throw new Error('GPU initialization failed') }), app = env.instance()
  app.mount(); await settle()
  assert.equal(app.state.value, 'error'); assert.ok(app.errorMessage.value.includes('重试'))
  app.unmount()
})
