import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadTs } from './helpers/load-ts.mjs'
const { createSocialService } = loadTs('app/utils/socialService.ts')
const { createSocialMock } = loadTs('app/utils/socialMock.ts')
const { resolveSocialMode, apiErrorMessage } = loadTs('app/utils/apiError.ts')
const current = { id: 1000, name: 'Preview', avatar: 'P', isAdmin: false }

test('legacy contacts are never presented as mutually confirmed friends', async () => {
  const calls = []
  const member = { id: 1, name: 'Member', avatar: 'M', isAdmin: false }
  const service = createSocialService(async (path, options) => { calls.push([path, options]); return [{ user: member, createdAt: '2026-10-17T00:00:00Z' }] }, 'legacy', current.id)
  assert.equal((await service.listFriends()).items[0].user.relationship, 'contact')
  await assert.rejects(service.acceptRequest(1), e => e.code === 'FEATURE_NOT_READY')
  assert.equal(calls.length, 1, 'disabled capabilities must not call the backend')
})
test('v2 writes use the reserved routes and preserve errors without falling back', async () => {
  const calls = [], failure = Object.assign(new Error('unavailable'), { status: 503 })
  const service = createSocialService(async (path, options) => { calls.push([path, options]); throw failure }, 'v2', current.id)
  await assert.rejects(service.requestFriend(2, 'hello'), error => error === failure)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], '/v2/social/friend-requests')
  assert.equal(calls[0][1].body.recipientId, 2)
  assert.equal(calls[0][1].body.message, 'hello')
})
test('malformed v2 pages fail visibly instead of becoming empty lists', async () => {
  const service = createSocialService(async () => [], 'v2', current.id)
  await assert.rejects(service.listFriends(), e => e.code === 'BAD_RESPONSE')
  await assert.rejects(service.acceptRequest(undefined), e => e.code === 'BAD_RESPONSE')
})
test('mock supports accepting, rejecting, withdrawing and duplicate outgoing requests', async () => {
  const service = createSocialMock(current, 0)
  const incoming = (await service.listRequests('incoming')).items[0]
  await service.acceptRequest(incoming.id)
  assert.equal((await service.listRequests('incoming')).items.length, 0)
  assert.equal((await service.listFriends()).items.length, 2)
  await assert.rejects(service.rejectRequest(incoming.id), e => e.code === 'REQUEST_NOT_PENDING')
  const first = await service.requestFriend(1003, 'hello')
  assert.equal((await service.requestFriend(1003)).id, first.id)
  assert.equal((await service.searchUsers('小步')).items[0].relationship, 'outgoing_pending')
  await service.cancelRequest(first.id)
  assert.equal((await service.searchUsers('小步')).items[0].relationship, 'none')
  await service.removeFriend(1002)
  assert.equal((await service.searchUsers('向量')).items[0].relationship, 'none')
  assert.equal((await service.listMessages()).length, 1, 'removing a friend preserves history')
  const declining = createSocialMock(current, 0)
  await declining.rejectRequest((await declining.listRequests('incoming')).items[0].id)
  assert.equal((await declining.listRequests('incoming')).items.length, 0)
  assert.equal((await declining.searchUsers('向量')).items[0].relationship, 'none')
})
test('mock blocking affects sends; receiving preferences do not prevent outbound messages', async () => {
  const service = createSocialMock(current, 0)
  await service.sendMessage(1001, '保留到成功')
  assert.equal((await service.listMessages()).length, 2)
  await service.block(1001)
  await assert.rejects(service.sendMessage(1001, 'blocked'), e => e.code === 'FORBIDDEN')
  assert.equal((await service.listBlocks()).items[0].id, 1001)
  await service.unblock(1001)
  assert.equal((await service.searchUsers('林间')).items[0].relationship, 'friends')
  await service.updatePreferences({ messagePolicy: 'friends' })
  assert.equal((await service.getPreferences()).messagePolicy, 'friends')
  await service.sendMessage(1004, '接收偏好不限制主动私信')
  await service.clearHistory(1001)
  assert.equal((await service.listMessages()).length, 1)
  const another = createSocialMock({ ...current, id: 1005 }, 0)
  assert.equal((await another.listMessages()).length, 1, 'instances/accounts must not share mutable state')
})
test('mock refuses self requests and production mode; network errors retain their category', async () => {
  await assert.rejects(createSocialMock(current, 0).requestFriend(current.id), e => e.code === 'FORBIDDEN')
  assert.throws(() => resolveSocialMode('mock', false), e => e.code === 'FEATURE_NOT_READY')
  assert.equal(resolveSocialMode('legacy', false), 'legacy')
  assert.equal(apiErrorMessage({ status: 503 }), '服务暂时不可用，请稍后重试。')
  assert.equal(apiErrorMessage({ status: 429 }), '操作过于频繁，请稍后再试。')
})
