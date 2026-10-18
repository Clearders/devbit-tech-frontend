import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'
import ts from 'typescript'
import { loadTs } from './helpers/load-ts.mjs'

const source = readFileSync(new URL('../app/components/SocialMessagesWorkspace.vue', import.meta.url), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const compiled = ts.transpileModule(source + '\nexport const conversationTest = { scroll, openConversation, older }', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes }); return { promise, resolve } }

function setup(loadHistory) {
  const props = reactive({ userId: 1001 }), exports = {}, scope = effectScope(), unmounts = [], reads = []
  const state = ref({ profiles: {}, members: {}, conversations: [], friends: [], messages: [], outbox: [], drafts: {}, draftAttachments: {}, histories: {}, busy: {}, errors: {} })
  scope.run(() => runInNewContext(compiled, {
    exports, computed, nextTick, reactive, ref, watch,
    require: name => name.startsWith('~/') ? loadTs(name.replace('~/', 'app/') + '.ts') : {},
    defineProps: () => props,
    useSocialWorkspace: () => ({ state, api: ref({ mode: 'mock', capabilities: {} }), loadHistory, loadProfile: async () => {}, markRead: id => { reads.push(id) } }),
    useAuth: () => ({ user: ref({ id: 1000 }) }), useWebSocket: () => ({ status: ref('connected') }),
    onMounted() {}, onBeforeUnmount: callback => unmounts.push(callback), document: { visibilityState: 'visible', removeEventListener() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
  }))
  return { ...exports.conversationTest, props, reads, dispose() { unmounts.forEach(fn => fn()); scope.stop() } }
}

test('late history from the previous conversation cannot move the current conversation scroll position', async t => {
  const pending = deferred(), app = setup((_id, append) => append ? pending.promise : Promise.resolve()); t.after(app.dispose)
  const node = { scrollHeight: 1000, scrollTop: 50, clientHeight: 300 }; app.scroll.value = node
  await nextTick()
  const loading = app.older()
  app.props.userId = 1010; await nextTick(); await app.openConversation()
  node.scrollHeight = 1400; node.scrollTop = 77
  pending.resolve(); await loading
  assert.equal(node.scrollTop, 77)
})

test('rapid conversation switches ignore an older open completion and preserve the latest reading position', async t => {
  const first = deferred(), second = deferred(), app = setup(id => id === 1001 ? first.promise : second.promise); t.after(app.dispose)
  const node = { scrollHeight: 1000, scrollTop: 0, clientHeight: 300 }; app.scroll.value = node
  const opening = app.openConversation(); await nextTick()
  app.props.userId = 1010; await nextTick(); second.resolve(); await nextTick(); await nextTick()
  node.scrollTop = 99; const readCount = app.reads.length
  first.resolve(); await opening
  assert.equal(node.scrollTop, 99); assert.equal(app.reads.length, readCount); assert.equal(app.reads.at(-1), 1010)
})
