// Double-tap Shift, from anywhere, to show or hide the window.
//
// A "tap" is Shift pressed and released on its own within 250ms. Two taps
// within 400ms count, as long as no other key or click happened in between,
// so typing capitals or Shift-selecting never triggers it.

const TAP_MS = 250
const GAP_MS = 400

function createTapDetector(onDouble, now = Date.now) {
  let downAt = 0
  let dirty = false
  let lastTap = 0
  return {
    keydown(shift) {
      if (shift) {
        if (!downAt) { downAt = now(); dirty = false }
      } else {
        dirty = true
        lastTap = 0
      }
    },
    keyup(shift) {
      if (!shift) return
      const t = now()
      const clean = downAt && !dirty && t - downAt < TAP_MS
      downAt = 0
      if (!clean) { lastTap = 0; return }
      if (t - lastTap < GAP_MS) {
        lastTap = 0
        onDouble()
      } else {
        lastTap = t
      }
    },
    interrupt() {
      lastTap = 0
      dirty = true
    },
  }
}

function watchDoubleShift(onDouble) {
  let hook
  try {
    hook = require('uiohook-napi')
  } catch (err) {
    console.error('double-shift hotkey unavailable', err)
    return () => {}
  }
  const { uIOhook, UiohookKey } = hook
  const isShift = (k) => k === UiohookKey.Shift || k === UiohookKey.ShiftRight
  const taps = createTapDetector(onDouble)
  uIOhook.on('keydown', (e) => taps.keydown(isShift(e.keycode)))
  uIOhook.on('keyup', (e) => taps.keyup(isShift(e.keycode)))
  uIOhook.on('mousedown', () => taps.interrupt())

  const { systemPreferences } = require('electron')
  // macOS only delivers keys to apps the user has allowed under
  // Privacy & Security > Accessibility. Ask once, then wait for the grant.
  let timer
  const start = () => {
    try { uIOhook.start() } catch (err) { console.error('could not start key hook', err) }
  }
  if (process.platform === 'darwin' && !systemPreferences.isTrustedAccessibilityClient(false)) {
    systemPreferences.isTrustedAccessibilityClient(true)
    timer = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        clearInterval(timer)
        start()
      }
    }, 2000)
  } else {
    start()
  }

  return () => {
    clearInterval(timer)
    try { uIOhook.stop() } catch {}
  }
}

module.exports = { watchDoubleShift, createTapDetector }
