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

// Writes a short trace to hotkey.log in the data folder so a broken hotkey
// can be diagnosed on a real Mac. Only Shift presses are recorded; other keys
// are counted, never logged.
function createLog(file) {
  const fs = require('fs')
  const lines = []
  let other = 0
  let shiftEvents = 0
  const write = () => { try { fs.writeFileSync(file, lines.join('\n') + `\nother keys seen: ${other}\n`) } catch {} }
  return {
    line(msg) { lines.push(`${new Date().toISOString()} ${msg}`); write() },
    shift(kind, code) {
      if (shiftEvents++ < 40) { lines.push(`${new Date().toISOString()} shift ${kind} (code ${code})`); write() }
    },
    other() { other++; if (other % 50 === 1) write() },
  }
}

function watchDoubleShift(onDouble, logFile) {
  const log = logFile ? createLog(logFile) : { line() {}, shift() {}, other() {} }
  log.line(`start: electron ${process.versions.electron}, ${process.platform}-${process.arch}`)
  let hook
  try {
    hook = require('uiohook-napi')
    log.line('uiohook-napi loaded')
  } catch (err) {
    log.line('uiohook-napi FAILED to load: ' + (err && err.stack || err))
    console.error('double-shift hotkey unavailable', err)
    return () => {}
  }
  const { uIOhook, UiohookKey } = hook
  const isShift = (k) => k === UiohookKey.Shift || k === UiohookKey.ShiftRight
  const taps = createTapDetector(() => { log.line('double-shift detected'); onDouble() })
  uIOhook.on('keydown', (e) => {
    const shift = isShift(e.keycode)
    if (shift) log.shift('down', e.keycode); else log.other()
    taps.keydown(shift)
  })
  uIOhook.on('keyup', (e) => {
    const shift = isShift(e.keycode)
    if (shift) log.shift('up', e.keycode)
    taps.keyup(shift)
  })
  uIOhook.on('mousedown', () => taps.interrupt())

  const { systemPreferences } = require('electron')
  // macOS only delivers keys to apps the user has allowed under
  // Privacy & Security > Accessibility. Ask once, then wait for the grant.
  let timer
  const start = () => {
    try {
      uIOhook.start()
      log.line('key hook started')
    } catch (err) {
      log.line('key hook FAILED to start: ' + (err && err.stack || err))
      console.error('could not start key hook', err)
    }
  }
  const trusted = process.platform !== 'darwin' || systemPreferences.isTrustedAccessibilityClient(false)
  log.line('accessibility trusted: ' + trusted)
  if (!trusted) {
    systemPreferences.isTrustedAccessibilityClient(true)
    timer = setInterval(() => {
      if (systemPreferences.isTrustedAccessibilityClient(false)) {
        clearInterval(timer)
        log.line('accessibility granted')
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
