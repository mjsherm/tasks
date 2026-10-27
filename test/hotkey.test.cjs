const test = require('node:test')
const assert = require('node:assert')
const { createTapDetector } = require('../electron/hotkey.cjs')

function setup() {
  let t = 1000
  let fired = 0
  const d = createTapDetector(() => fired++, () => t)
  const at = (ms) => { t = ms }
  const tap = (start, len = 60) => { at(start); d.keydown(true); at(start + len); d.keyup(true) }
  return { d, at, tap, fired: () => fired }
}

test('two quick Shift taps fire once', () => {
  const s = setup()
  s.tap(1000); s.tap(1200)
  assert.equal(s.fired(), 1)
})

test('taps too far apart do not fire', () => {
  const s = setup()
  s.tap(1000); s.tap(1600)
  assert.equal(s.fired(), 0)
})

test('typing a capital in between does not fire', () => {
  const s = setup()
  s.tap(1000)
  s.at(1100); s.d.keydown(true); s.d.keydown(false); s.at(1150); s.d.keyup(true)
  assert.equal(s.fired(), 0)
})

test('holding Shift is not a tap', () => {
  const s = setup()
  s.tap(1000); s.tap(1150, 600)
  assert.equal(s.fired(), 0)
})

test('key repeat while Shift is held is ignored', () => {
  const s = setup()
  s.tap(1000)
  s.at(1150); s.d.keydown(true); s.at(1170); s.d.keydown(true); s.at(1200); s.d.keyup(true)
  assert.equal(s.fired(), 1)
})

test('a triple tap fires only once', () => {
  const s = setup()
  s.tap(1000); s.tap(1150); s.tap(1300)
  assert.equal(s.fired(), 1)
})

test('a click between taps cancels', () => {
  const s = setup()
  s.tap(1000); s.d.interrupt(); s.tap(1150)
  assert.equal(s.fired(), 0)
})
