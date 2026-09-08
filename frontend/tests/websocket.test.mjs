import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../app/composables/useWebSocket.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(
  source.replaceAll('import.meta.server', 'false').replaceAll('import.meta.dev', 'false'),
  {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  },
).outputText

function setup() {
  let now = 0
  let heartbeat
  let reconnect
  const sockets = []
  class FakeSocket {
    static OPEN = 1
    static CONNECTING = 0
    readyState = 0
    sent = []
    constructor() {
      sockets.push(this)
    }
    open() {
      this.readyState = 1
      this.onopen()
    }
    receive(message) {
      this.onmessage({ data: JSON.stringify(message) })
    }
    send(message) {
      this.sent.push(JSON.parse(message))
    }
    // A blackholed connection never completes the close handshake.
    close(code) {
      this.readyState = 2
      this.closeCode = code
    }
  }
  const exports = {}
  runInNewContext(compiled, {
    exports,
    WebSocket: FakeSocket,
    URL,
    Date: { now: () => now },
    window: { location: { protocol: 'https:', host: 'example.test' } },
    useRuntimeConfig: () => ({ public: { wsUrl: '' } }),
    useState: (_, initialize) => ({ value: initialize() }),
    setInterval: (callback) => {
      heartbeat = callback
      return 1
    },
    clearInterval: () => {
      heartbeat = undefined
    },
    setTimeout: (callback) => {
      reconnect = callback
      return 2
    },
    clearTimeout: () => {
      reconnect = undefined
    },
  })
  const ws = exports.useWebSocket()
  ws.connect()
  sockets[0].open()
  sockets[0].receive({ type: 'auth_ok', user_id: 1 })
  return {
    ws,
    sockets,
    tick(time) {
      now = time
      heartbeat?.()
    },
    reconnect() {
      const callback = reconnect
      reconnect = undefined
      callback?.()
    },
  }
}

test('silent network loss reconnects without waiting for close and ignores stale events', () => {
  const app = setup()
  const old = app.sockets[0]
  old.receive({ type: 'user_online', user_id: 2 })
  app.tick(25000)
  assert.equal(old.sent[0].type, 'ping')
  app.tick(75000)
  assert.equal(old.closeCode, 4000)
  assert.equal(app.ws.status.value, 'reconnecting')
  assert.equal(app.ws.onlineUsers.value.size, 0)
  app.reconnect()
  assert.equal(app.sockets.length, 2)
  app.sockets[1].open()
  app.sockets[1].receive({ type: 'auth_ok', user_id: 1 })
  old.onclose()
  old.receive({ type: 'user_online', user_id: 3 })
  assert.equal(app.ws.status.value, 'connected')
  assert.equal(app.ws.onlineUsers.value.size, 0)
})

test('valid heartbeat responses keep a healthy connection alive', () => {
  const app = setup()
  for (const time of [25000, 50000, 75000, 100000]) {
    app.tick(time)
    app.sockets[0].receive({ type: 'pong' })
  }
  assert.equal(app.ws.status.value, 'connected')
  assert.equal(app.sockets[0].closeCode, undefined)
})

test('logout cancels a scheduled reconnect after network loss', () => {
  const app = setup()
  app.tick(75000)
  app.ws.disconnect()
  app.reconnect()
  assert.equal(app.ws.status.value, 'disconnected')
  assert.equal(app.sockets.length, 1)
})
