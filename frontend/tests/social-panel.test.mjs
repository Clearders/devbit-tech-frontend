import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import ts from 'typescript'
import { loadTs } from './helpers/load-ts.mjs'
const script = readFileSync(new URL('../app/pages/friends.vue', import.meta.url), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const compiled = ts.transpileModule(script + '\nexport const pageTest = { query, search, results, searchStatus, searchError, startComposition, endComposition }', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
function setup(searchUsers) {
  const exports = {}, user = ref({ id: 1000 }), stops = [], unmounts = [], timers = new Map(); let sequence = 0
  const state = ref({ friendQuery: {}, friendsView: 'discover', friends: [], incoming: [], outgoing: [], groups: [], members: {}, profiles: {} }), api = ref({ mode: 'v2', capabilities: {}, searchUsers })
  runInNewContext(compiled, { exports, computed, reactive, ref, nextTick, Error,
    require: name => name === '~/utils/apiError' ? loadTs('app/utils/apiError.ts') : {},
    definePageMeta() {}, useSeoMeta() {}, useRoute: () => reactive({ query: { view: 'discover' } }), useRouter: () => ({ replace() {} }), useAuth: () => ({ user }),
    useSocialWorkspace: () => ({ state, api, refresh() {}, loadFriends() {}, loadRequests() {}, loadSettings() {}, loadProfile() {}, run() {} }), useWebSocket: () => ({ status: ref('connected') }),
    watch: (...args) => { stops.push(watch(...args)) }, onMounted() {}, onActivated() {}, onDeactivated() {}, onBeforeUnmount: fn => unmounts.push(fn),
    setTimeout: fn => { const id = ++sequence; timers.set(id, fn); return id }, clearTimeout: id => timers.delete(id),
  })
  return { ...exports.pageTest, user, timers, dispose() { unmounts.forEach(fn => fn()); stops.forEach(stop => stop()) } }
}
test('member search waits for Chinese composition and only schedules after completion', async t => {
  let calls = 0; const app = setup(async () => { calls++; return { items: [], nextCursor: null } }); t.after(app.dispose)
  app.startComposition(); app.query.value = '中'; await nextTick(); await app.search(); assert.equal(calls, 0); assert.equal(app.timers.size, 0)
  app.endComposition(); assert.equal(app.timers.size, 1)
})
test('member search discards reversed responses and clearing invalidates a pending response', async t => {
  const a = deferred(), b = deferred(); const app = setup(q => q === 'A' ? a.promise : b.promise); t.after(app.dispose)
  app.query.value = 'A'; await nextTick(); const first = app.search(); app.query.value = 'B'; await nextTick(); const second = app.search()
  b.resolve({ items: [{ id: 2, name: 'B' }], nextCursor: null }); await second; a.resolve({ items: [{ id: 1, name: 'A' }], nextCursor: null }); await first
  assert.equal(app.results.value[0].name, 'B'); app.query.value = ''; await nextTick(); await app.search(); assert.equal(app.results.value.length, 0); assert.equal(app.searchStatus.value, 'idle')
})
test('search errors remain separate from empty results and account changes discard responses', async t => {
  const a = deferred(), app = setup(() => a.promise); t.after(app.dispose)
  app.query.value = 'A'; await nextTick(); const reading = app.search(); app.user.value = { id: 2000 }; a.resolve({ items: [{ id: 2 }], nextCursor: null }); await reading; assert.equal(app.results.value.length, 0)
  const failing = setup(async () => { throw Object.assign(new Error('down'), { status: 503 }) }); t.after(failing.dispose)
  failing.query.value = 'A'; await nextTick(); await failing.search(); assert.equal(failing.searchStatus.value, 'error'); assert.match(failing.searchError.value, /暂时不可用/)
})
