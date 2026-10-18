import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadTs } from './helpers/load-ts.mjs'
const { formatRelativeTime } = loadTs('app/utils/forum.ts')
const { stripMarkdown } = loadTs('app/utils/stripMarkdown.ts')
const { selectRecentPosts } = loadTs('app/utils/recentPosts.ts')
const { waitForGameCanvas } = loadTs('app/utils/gameLoading.ts')
test('Chinese time boundaries, invalid/future values and Shanghai absolute dates', () => {
  const now = Date.parse('2026-10-17T00:00:00Z')
  const before = ms => new Date(now - ms).toISOString()
  assert.equal(formatRelativeTime('invalid', now), '')
  assert.equal(formatRelativeTime(new Date(now + 60000).toISOString(), now), '刚刚')
  assert.equal(formatRelativeTime(before(60000), now), '1 分钟前')
  assert.equal(formatRelativeTime(before(3600000), now), '1 小时前')
  assert.equal(formatRelativeTime(before(86400000), now), '1 天前')
  assert.equal(formatRelativeTime(before(29 * 86400000), now), '29 天前')
  assert.equal(formatRelativeTime('2026-09-01T16:30:00Z', now), '2026-09-02')
})
test('excerpt preserves meaningful text and avoids raw markup, code blocks and formula noise', () => {
  const result = stripMarkdown('# 一个问题\n**答案** [参考](https://example.com) `x_y`\n$E=mc^2$\n```js\nsecret()\n```\n<script>alert(1)</script>\n![图形实验](image.png)')
  for (const value of ['一个问题', '答案', '参考', 'x_y', '〔公式〕', '图形实验']) assert.ok(result.includes(value), value)
  for (const value of ['**', '<script>', 'alert(1)', 'secret()', 'https://']) assert.ok(!result.includes(value), value)
  assert.equal(stripMarkdown('```js\nonlyCode()\n```'), '查看完整内容')
  assert.equal(stripMarkdown('😀😀😀', 2), '😀😀…')
})
test('recent posts sort deterministically without mutating the source', () => {
  const posts = [{ id: 1, createdAt: '2026-10-16' }, { id: 2, createdAt: '2026-10-17' }, { id: 3, createdAt: '2026-10-17' }, { id: 4, createdAt: 'invalid' }]
  assert.equal(selectRecentPosts(posts).map(p => p.id).join(','), '3,2,1')
  assert.equal(posts.map(p => p.id).join(','), '1,2,3,4')
  assert.equal(selectRecentPosts([]).length, 0)
})
test('game initialization does not complete before a canvas exists and fails within its bound', async () => {
  const canvas = {}, found = await waitForGameCanvas(() => canvas)
  assert.equal(found, canvas)
  let reads = 0
  assert.equal(await waitForGameCanvas(() => ++reads >= 2 ? canvas : null, 100), canvas)
  await assert.rejects(waitForGameCanvas(() => null, 5), /画布初始化失败/)
})
