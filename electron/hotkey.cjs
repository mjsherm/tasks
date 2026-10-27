// Global shortcut to show or hide the window. Uses ⌥Space, or ⌃⌥Space when
// another app already owns that. Regular shortcuts need no macOS permissions.
const { globalShortcut } = require('electron')

const CANDIDATES = ['Alt+Space', 'Control+Alt+Space']

function registerToggle(onToggle) {
  for (const accel of CANDIDATES) {
    try {
      if (globalShortcut.register(accel, onToggle)) return accel
    } catch (err) {
      console.error('could not register', accel, err)
    }
  }
  return null
}

module.exports = { registerToggle, CANDIDATES }
