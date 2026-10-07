import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const exports = {}
const compiled = ts.transpileModule(readFileSync(new URL('../app/utils/infoPanel.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
runInNewContext(compiled, { exports })
const { placeInfoPanel, infoPanelContains } = exports

test('panel stays inside a phone viewport at either horizontal edge', () => {
  for (const right of [44, 390]) {
    const box = placeInfoPanel({ left: right - 44, right, top: 100, bottom: 144 }, { width: 390, height: 844 }, 220)
    assert.equal(box.width, 360)
    assert.ok(box.left >= 12)
    assert.ok(box.left + box.width <= 378)
    assert.equal(box.top, 152)
  }
  assert.equal(placeInfoPanel({ left: 0, right: 44, top: 100, bottom: 144 }, { width: 320, height: 844 }, 220).width, 296)
})

test('a panel near the bottom opens above its trigger and tall content scrolls', () => {
  const anchor = { left: 800, right: 940, top: 740, bottom: 784 }
  const short = placeInfoPanel(anchor, { width: 1440, height: 900 }, 260)
  assert.equal(short.top, 472)
  const tall = placeInfoPanel(anchor, { width: 1440, height: 900 }, 1600)
  assert.equal(tall.top, 12)
  assert.equal(tall.maxHeight, 720)
})

test('short viewports and offscreen anchors cannot push the panel outside the viewport', () => {
  for (const anchor of [
    { left: -40, right: 4, top: -100, bottom: -56 },
    { left: 500, right: 544, top: 600, bottom: 644 },
    { left: 0, right: 44, top: 0, bottom: 170 },
  ]) {
    const box = placeInfoPanel(anchor, { width: 320, height: 180 }, 1000)
    assert.ok(box.left >= 12 && box.left + box.width <= 308)
    assert.ok(box.top >= 12 && box.top + box.maxHeight <= 168)
  }
})

test('outside dismissal treats trigger and teleported descendants as inside', () => {
  const triggerChild = {}, panelChild = {}, outside = {}
  const trigger = { contains: node => node === triggerChild }
  const panel = { contains: node => node === panelChild }
  assert.equal(infoPanelContains(triggerChild, trigger, panel), true)
  assert.equal(infoPanelContains(panelChild, trigger, panel), true)
  assert.equal(infoPanelContains(outside, trigger, panel), false)
  assert.equal(infoPanelContains(null, trigger, panel), false)
  assert.equal(infoPanelContains(outside), false)
})
