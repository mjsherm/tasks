// Thin wrapper over the preload bridge. Falls back to localStorage so the UI
// can also run in a plain browser during development.
const KEY = 'tasks-data'

const browserApi = {
  load: async () => JSON.parse(localStorage.getItem(KEY) || 'null'),
  save: async (data) => localStorage.setItem(KEY, JSON.stringify(data)),
  saveSync: (data) => localStorage.setItem(KEY, JSON.stringify(data)),
  toggleFullscreen: async () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  },
  openDataFolder: async () => {},
  platform: 'web',
}

export const api = window.api || browserApi

// Saves every change as it happens. Only one write is in flight at a time and
// only the newest state is written next, so a burst of keystrokes never queues
// stale copies or lands out of order.
export function createSaver() {
  let inFlight = false
  let pending = null
  let latest = null

  async function pump() {
    if (inFlight) return
    inFlight = true
    while (pending) {
      const data = pending
      pending = null
      try {
        await api.save(data)
      } catch (err) {
        console.error('save failed, retrying', err)
        pending = pending || data
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    inFlight = false
  }

  return {
    save(data) {
      latest = data
      pending = data
      pump()
    },
    flushSync() {
      if (latest) api.saveSync(latest)
    },
  }
}
