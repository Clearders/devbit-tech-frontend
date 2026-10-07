import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const exports = {}
runInNewContext(ts.transpileModule(readFileSync(new URL('../app/utils/disclosureMotion.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports })

function setup() {
  const details = { open: false }, rendered = [], animations = []
  let height = 0, opacity = 0, natural = 120, reduced = false
  const style = { removeProperty(key) { delete this[key] } }
  const clip = {
    style, getBoundingClientRect: () => ({ height }),
    ownerDocument: { defaultView: { getComputedStyle: () => ({ opacity: String(opacity) }) } },
    animate(frames, timing) {
      const animation = { frames, timing, cancelled: false, onfinish: null, cancel() { this.cancelled = true } }
      animations.push(animation)
      return animation
    },
  }
  const motion = exports.createDisclosureMotion(details, clip, { getBoundingClientRect: () => ({ height: natural }) }, {
    rendered: open => rendered.push(open), reduced: () => reduced,
  })
  return { motion, details, clip, rendered, animations, frame(h, alpha) { height = h; opacity = alpha },
    resize(h) { natural = h }, reduce() { reduced = true } }
}

test('opening animates natural height and restores auto height after completion', () => {
  const app = setup()
  app.motion.setOpen(true)
  assert.equal(app.details.open, true)
  const animation = app.animations[0]
  assert.equal(animation.frames[0].height, '0px')
  assert.equal(animation.frames[1].height, '120px')
  assert.equal(animation.frames[1].opacity, 1)
  animation.onfinish()
  assert.equal(app.clip.style.height, undefined)
  assert.equal(app.clip.style.overflow, undefined)
  assert.equal(app.details.open, true)
})

test('closing retains native open content until animation completes', () => {
  const app = setup()
  app.motion.setOpen(true, false)
  app.frame(120, 1)
  app.motion.setOpen(false)
  assert.equal(app.details.open, true)
  assert.equal(app.animations[0].frames[1].height, '0px')
  app.animations[0].onfinish()
  assert.equal(app.details.open, false)
  assert.equal(app.rendered.at(-1), false)
})

test('rapid reversal starts at the visible intermediate frame and ignores stale completion', () => {
  const app = setup()
  app.motion.setOpen(true)
  const stale = app.animations[0].onfinish
  app.frame(48, .4)
  app.motion.setOpen(false)
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(app.animations[1].frames[0].height, '48px')
  assert.equal(app.animations[1].frames[0].opacity, .4)
  app.frame(24, .2)
  app.motion.setOpen(true)
  stale()
  assert.equal(app.animations[2].cancelled, false)
  assert.equal(app.animations[2].frames[0].height, '24px')
  app.animations[2].onfinish()
  assert.equal(app.details.open, true)
})

test('nested content and viewport changes retarget an opening height', () => {
  const app = setup()
  app.motion.setOpen(true)
  app.frame(60, .5)
  app.resize(240)
  app.motion.resize()
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(app.animations[1].frames[0].height, '60px')
  assert.equal(app.animations[1].frames[1].height, '240px')
})

test('reduced motion finishes current motion and subsequent toggles are immediate', () => {
  const app = setup()
  app.motion.setOpen(true)
  app.reduce()
  app.motion.finish()
  assert.equal(app.animations[0].cancelled, true)
  assert.equal(app.details.open, true)
  app.motion.setOpen(false)
  assert.equal(app.details.open, false)
  assert.equal(app.animations.length, 1)
})

test('unsupported animation and disposal leave native details usable with no inline clipping', () => {
  const app = setup()
  app.clip.animate = undefined
  app.motion.setOpen(true)
  assert.equal(app.details.open, true)
  assert.equal(app.clip.style.height, undefined)
  app.motion.dispose()
  app.motion.setOpen(false)
  assert.equal(app.details.open, true)
  assert.equal(app.animations.length, 0)
})
