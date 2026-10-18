import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computed, ref } from 'vue'
import { loadTs } from './helpers/load-ts.mjs'

test('authentication preserves HTTP failures and does not mislabel server outages as bad passwords', async () => {
  const failure = Object.assign(new Error('server'), { response: { status: 503 } })
  const states = new Map()
  const app = loadTs('app/composables/useAuth.ts', {
    useNuxtApp: () => ({}), computed,
    useState: (key, factory) => { if (!states.has(key)) states.set(key, ref(factory())); return states.get(key) },
    useApiFetch: () => ({ apiFetch: async () => { throw failure } }),
    navigateTo() {}, createError: value => value,
  }).useAuth()
  await assert.rejects(app.login('user@example.com', 'password1'), error => error === failure)
  await assert.rejects(app.register({ name: '成员', email: 'user@example.com', code: '123456', password: 'password1', confirmPassword: 'password1' }), error => error === failure)
  assert.equal(app.status.value, 'anonymous')
  await assert.rejects(app.syncCurrentUser(true), error => error === failure)
  assert.equal(app.status.value, 'idle')
  assert.equal(app.isResolving.value, false)
})

test('API field errors apply only known form fields and preserve the original error', () => {
  const { applyApiFieldErrors, getHttpStatus } = loadTs('app/utils/apiError.ts')
  const error = { response: { status: 422 }, data: { error: { fieldErrors: { email: '邮箱格式不正确', password: 42, unexpected: 'ignored' } } } }
  const fields = { email: '', password: '' }
  assert.equal(applyApiFieldErrors(error, fields), true)
  assert.deepEqual(fields, { email: '邮箱格式不正确', password: '' })
  assert.equal(getHttpStatus(error), 422)
})

function recovery(mode, development = false, apiFetch = async () => { throw new Error('unexpected network call') }) {
  return loadTs('app/composables/useAccountRecovery.ts', {
    useRuntimeConfig: () => ({ public: { accountRecoveryMode: mode } }), useApiFetch: () => ({ apiFetch }),
  }, { development }).useAccountRecovery()
}
test('disabled and production mock recovery never call the backend', async () => {
  for (const mode of ['disabled', 'mock']) {
    const service = recovery(mode)
    assert.equal(service.enabled, false)
    await assert.rejects(service.sendCode('a@example.com'), e => e.code === 'FEATURE_NOT_READY')
    await assert.rejects(service.confirm('a@example.com', '123456', 'password1'), e => e.code === 'FEATURE_NOT_READY')
  }
})
test('recovery mock validates its code entirely in memory', async () => {
  const service = recovery('mock', true)
  const result = await service.sendCode('a@example.com')
  assert.equal(result.retryAfterSeconds, 60)
  assert.equal(result.developmentCode, '123456')
  await assert.rejects(service.confirm('a@example.com', '000000', 'password1'), e => e.code === 'INVALID_CODE')
  await service.confirm('a@example.com', '123456', 'password1')
})
test('V2 recovery preserves server timing and errors, with no mock fallback', async () => {
  const calls = [], failure = Object.assign(new Error('rate limit'), { status: 429 })
  const service = recovery('v2', false, async (path, options) => {
    calls.push([path, options])
    if (path.endsWith('/code')) return { message: '受理', retryAfterSeconds: 90, expiresInSeconds: 300 }
    throw failure
  })
  assert.equal((await service.sendCode(' a@example.com ')).retryAfterSeconds, 90)
  await assert.rejects(service.confirm(' a@example.com ', '123456', 'password1'), e => e === failure)
  assert.equal(calls.length, 2)
  assert.equal(calls[0][1].body.email, 'a@example.com')
  assert.equal(calls[1][0], '/v2/account/password-reset/confirm')
})
test('countdown respects the server interval and cancels timers on restart and unmount', () => {
  const timers = new Map(), unmounts = []; let sequence = 0
  const service = loadTs('app/composables/useCountdown.ts', {
    ref, setInterval: fn => { timers.set(++sequence, fn); return sequence }, clearInterval: id => timers.delete(id), onBeforeUnmount: fn => unmounts.push(fn),
  }).useCountdown()
  service.start(90); assert.equal(service.remaining.value, 90)
  service.start(2); assert.equal(timers.size, 1)
  timers.get(sequence)(); assert.equal(service.remaining.value, 1)
  timers.get(sequence)(); assert.equal(service.remaining.value, 0); assert.equal(timers.size, 0)
  service.start(60); unmounts.forEach(fn => fn()); assert.equal(timers.size, 0)
})

test('relative dates reuse the SSR clock, then share one live timer and release it on unmount', () => {
  const serialized = Date.parse('2026-10-17T08:00:00Z'), now = ref(serialized), app = {}, mounts = [], unmounts = [], timers = new Map()
  let current = serialized + 120_000
  class Clock extends Date { static now() { return current } }
  const { useRelativeTime } = loadTs('app/composables/useRelativeTime.ts', {
    Date: Clock, useNuxtApp: () => app, useState: () => now,
    onMounted: fn => mounts.push(fn), onBeforeUnmount: fn => unmounts.push(fn),
    setInterval: fn => { timers.set(1, fn); return 1 }, clearInterval: id => timers.delete(id),
  })
  const first = useRelativeTime(), second = useRelativeTime(), date = new Date(serialized).toISOString()
  assert.equal(first(date), '刚刚', 'hydration uses the serialized timestamp')
  mounts.forEach(fn => fn()); assert.equal(first(date), '2 分钟前'); assert.equal(timers.size, 1)
  current += 60_000; timers.get(1)(); assert.equal(second(date), '3 分钟前')
  unmounts[0](); assert.equal(timers.size, 1)
  unmounts[1](); assert.equal(timers.size, 0)
})
