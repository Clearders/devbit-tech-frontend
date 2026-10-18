import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { randomUUID } from 'node:crypto'
import { computed, effectScope, ref, watch } from 'vue'
import ts from 'typescript'
import { loadTs } from './helpers/load-ts.mjs'
const { createSocialMock } = loadTs('app/utils/socialMock.ts')
const { createSocialService } = loadTs('app/utils/socialService.ts')
const { mergeMessages, summarizeMessages, attachment } = loadTs('app/utils/socialWorkspace.ts')
const owner = { id: 1000, name: 'Preview', avatar: 'P', isAdmin: false }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const source = readFileSync(new URL('../app/composables/useSocialWorkspace.ts', import.meta.url), 'utf8').replaceAll('import.meta.client', 'true')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function setup(overrides = {}) {
  const user = ref(owner), states = new Map(), callbacks = new Map(), exports = {}, scope = effectScope()
  let service = { ...createSocialMock(owner, 0), ...overrides }
  const app = { runWithContext: fn => fn() }, ws = { status: ref('disconnected'), on: (name, fn) => callbacks.set(name, fn) }
  runInNewContext(compiled, { exports, Error, Promise, Set, Map, Date, Intl, Object, Array, Number, String, crypto: { randomUUID }, computed, ref, watch, effectScope: () => scope,
    require: name => loadTs(name.replace('~/', 'app/') + '.ts'),
    useNuxtApp: () => app, useAuth: () => ({ user }), useWebSocket: () => ws, useSocialApi: () => service,
    useState: (key, factory) => { if (!states.has(key)) states.set(key, ref(factory())); return states.get(key) },
  })
  return { ...exports.useSocialWorkspace(), user, ws, callbacks, states, replaceService(value) { service = value }, dispose: () => scope.stop() }
}
test('shared workspace filters on the server, deduplicates pages and discards stale reads', async t => {
  const a = deferred(), b = deferred(); let calls = 0
  const app = setup({ listFriends: async () => ++calls === 1 ? a.promise : b.promise }); t.after(app.dispose)
  const first = app.loadFriends(); app.state.value.friendQuery = { q: '最新' }; const second = app.loadFriends()
  b.resolve({ items: [{ user: { ...owner, id: 2, name: '最新' }, createdAt: '' }], nextCursor: null }); await second
  a.resolve({ items: [{ user: { ...owner, id: 1, name: '旧值' }, createdAt: '' }], nextCursor: null }); await first
  assert.equal(app.state.value.friends[0].user.id, 2)
})
test('account switch clears drafts, pending sends and late private responses', async t => {
  const pending = deferred(), app = setup({ listHistory: () => pending.promise }); t.after(app.dispose)
  app.state.value.drafts[1001] = 'private draft'; app.state.value.draftAttachments[1001] = [{ content: 'private file' }]
  const read = app.loadHistory(1001)
  app.replaceService(createSocialMock({ ...owner, id: 9000 }, 0)); app.user.value = { ...owner, id: 9000 }
  assert.equal(Object.keys(app.state.value.drafts).length, 0); assert.equal(Object.keys(app.state.value.draftAttachments).length, 0)
  pending.resolve({ items: [{ id: 77, sender: owner, recipient: { ...owner, id: 1001 }, content: 'old private', createdAt: '', isRead: false }], nextCursor: null }); await read
  assert.equal(app.state.value.messages.some(m => m.id === 77), false)
})
test('a late profile cannot start an old-account private metadata request', async t => {
  const pending = deferred(); let privateReads = 0
  const app = setup({ getProfile: () => pending.promise, getFriendMetadata: async () => { privateReads++; return { note: 'old secret', starred: false, groupId: null } } }); t.after(app.dispose)
  const reading = app.loadProfile(1001)
  app.replaceService(createSocialMock({ ...owner, id: 9000 }, 0)); app.user.value = { ...owner, id: 9000 }
  app.state.value.profiles[1001] = { ...owner, id: 1001, relationship: 'friends' }
  pending.resolve({ ...owner, id: 1001, relationship: 'friends' }); await reading
  assert.equal(privateReads, 0)
})
test('failed send retains content and reuses the same id on retry without duplicate delivery', async t => {
  const real = createSocialMock(owner, 0), ids = []; let fail = true
  const app = setup({ async sendMessage(id, content, clientId) { ids.push(clientId); if (fail) throw Object.assign(new Error('offline'), { status: 503 }); return real.sendMessage(id, content, clientId) } }); t.after(app.dispose)
  await app.send(1001, '不要丢失这条消息')
  assert.equal(app.state.value.outbox[0].status, 'failed'); assert.equal(app.state.value.outbox[0].content, '不要丢失这条消息')
  fail = false; await app.send(1001, '不要丢失这条消息', app.state.value.outbox[0].clientMessageId)
  assert.equal(ids[0], ids[1]); assert.equal(app.state.value.outbox.length, 0); assert.equal(app.state.value.messages.filter(m => m.content === '不要丢失这条消息').length, 1)
})
test('duplicate operations are locked independently and failures remain visible', async t => {
  const app = setup(), pending = deferred(); t.after(app.dispose); let calls = 0
  const first = app.run('one', () => { calls++; return pending.promise })
  assert.equal(await app.run('one', async () => { calls++ }), false)
  assert.equal(await app.run('two', async () => { throw Object.assign(new Error('unavailable'), { status: 503 }) }), false)
  assert.match(app.state.value.errors.two, /暂时不可用/); pending.resolve(); await first; assert.equal(calls, 1)
})
test('legacy conversation summaries preserve contact relationships without pretending mutual friendship', async t => {
  const contact = { ...owner, id: 1001, name: 'Contact', relationship: 'contact', canMessage: true }
  const app = setup({ mode: 'legacy', capabilities: {}, listFriends: async () => ({ items: [{ user: contact, createdAt: '' }], nextCursor: null }), listMessages: async () => [{ id: 1, sender: contact, recipient: owner, content: 'hello', createdAt: '', isRead: false }] }); t.after(app.dispose)
  await app.loadFriends(); await app.loadConversations(); await app.loadProfile(1001)
  assert.equal(app.state.value.conversations[0].user.relationship, 'contact'); assert.equal(app.state.value.profiles[1001].relationship, 'contact')
})
test('group deletion moves members to ungrouped and metadata is private to the account', async () => {
  const service = createSocialMock(owner, 0), group = await service.createGroup('一起写代码')
  await service.updateFriend(1001, { note: '林同学', groupId: group.id, starred: true })
  assert.equal((await service.listFriends(undefined, { q: '林同学', groupId: group.id })).items.length, 1)
  await service.deleteGroup(group.id)
  assert.equal((await service.listFriends(undefined, { groupId: null })).items[0].metadata.note, '林同学')
  assert.equal((await createSocialMock(owner, 0).listFriends()).items[0].metadata.note, '')
})
test('read acknowledgement never marks a message arriving during the request as read', async t => {
  const pending = deferred(), app = setup({ markConversationRead: () => pending.promise }); t.after(app.dispose)
  const incoming = { id: 10, sender: { ...owner, id: 1001 }, recipient: owner, content: 'seen', createdAt: '2026-01-01T00:00:00Z', isRead: false }
  app.state.value.messages = [incoming]; app.state.value.conversations = [{ user: incoming.sender, unread: 1 }]
  const read = app.markRead(1001)
  app.state.value.messages.push({ ...incoming, id: 11, content: 'new' }); app.state.value.conversations[0].unread = 2
  pending.resolve(); await read
  assert.equal(app.state.value.messages[0].isRead, true); assert.equal(app.state.value.messages[1].isRead, false); assert.equal(app.state.value.conversations[0].unread, 1)
})
test('conversation organization and idempotent sends persist in the development service', async () => {
  const service = createSocialMock(owner, 0)
  const a = await service.sendMessage(1001, 'same', 'client-1'), b = await service.sendMessage(1001, 'same', 'client-1'); assert.equal(a.id, b.id)
  await service.updateConversation(1001, { archived: true, muted: true, pinned: false })
  const conversation = (await service.listConversations()).items[0]; assert.equal(conversation.preferences.archived, true); assert.equal(conversation.preferences.muted, true)
  await service.markConversationRead(1001); assert.equal((await service.listConversations()).items[0].unread, 0)
})
test('large fixtures support stable multi-page friends and search across unloaded members', async () => {
  const service = createSocialMock(owner, 0, 'large'), first = await service.listFriends(), second = await service.listFriends(first.nextCursor)
  assert.equal(first.total, 57); assert.equal(first.items.length, 20); assert.equal(second.items.length, 20)
  assert.equal(new Set([...first.items, ...second.items].map(f => f.user.id)).size, 40)
  assert.equal((await service.listFriends(undefined, { q: '社区创作者 48' })).items[0].user.id, 1147)
})
test('reserved capabilities never perform unsupported writes and enabled routes preserve payloads', async () => {
  const calls = [], fetch = async (path, options) => { calls.push({ path, options }); return { note: '私人备注', starred: true, groupId: null } }
  const disabled = createSocialService(fetch, 'v2', owner.id)
  await assert.rejects(disabled.updateFriend(1001, { note: 'x' }), e => e.code === 'FEATURE_NOT_READY'); assert.equal(calls.length, 0)
  const enabled = createSocialService(fetch, 'v2', owner.id, { metadata: true, conversations: true })
  await enabled.updateFriend(1001, { note: '私人备注' }); assert.equal(calls[0].path, '/v2/social/friends/1001/metadata')
  await enabled.sendMessage(1001, 'hello', 'client-1'); assert.equal(calls[1].options.body.clientMessageId, 'client-1'); assert.equal(calls[1].path, '/v2/social/conversations/1001/messages')
})
test('history merging updates receipts, deduplicates pages and excludes unrelated conversations', () => {
  const a = { id: 1, sender: owner, recipient: { ...owner, id: 2 }, content: 'a', createdAt: '2026-01-01T00:00:00Z', isRead: false }
  const merged = mergeMessages([a], [{ ...a, isRead: true }]); assert.equal(merged.length, 1); assert.equal(merged[0].isRead, true)
  assert.equal(summarizeMessages([a, { ...a, id: 2, sender: { ...owner, id: 3 } }], owner.id).length, 1)
})
test('attachments retain supported images and files without accepting executable URLs', () => {
  assert.equal(attachment('![图片](data:image/png;base64,aGVsbG8=)').kind, 'image')
  assert.equal(attachment('[笔记](data:text/plain;base64,aGVsbG8=)').kind, 'file')
  assert.equal(attachment('![bad](javascript:alert(1))'), null)
  assert.equal(attachment('![bad](data:image/svg+xml;base64,aGVsbG8=)'), null)
})
