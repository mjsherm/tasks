// Thin wrapper over the preload bridge. Falls back to localStorage so the UI
// can also run in a plain browser during development.
const KEY = 'tasks-data'

const browserApi = {
  load: async () => JSON.parse(localStorage.getItem(KEY) || 'null'),
  save: async (json) => localStorage.setItem(KEY, json),
  saveSync: (json) => localStorage.setItem(KEY, json),
  toggleFullscreen: async () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  },
  onFullscreen: (cb) => {
    const listener = () => cb(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', listener)
    return () => document.removeEventListener('fullscreenchange', listener)
  },
  platform: 'web',
}

export const api = window.api || browserApi

// Saves every change as it happens. Only one write is in flight at a time and
// only the newest state is written next, so a burst of keystrokes never queues
// stale copies or lands out of order. The half-typed task in the add box is
// saved here too, without going through React, so typing it stays cheap.
export function createSaver() {
  let inFlight = false
  let dirty = false
  let state = null
  let draft = ''

  const snapshot = () => JSON.stringify({ ...state, draft })

  async function pump() {
    if (inFlight) return
    inFlight = true
    while (dirty) {
      dirty = false
      try {
        await api.save(snapshot())
      } catch (err) {
        console.error('save failed, retrying', err)
        dirty = true
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    inFlight = false
  }

  return {
    init(data) {
      draft = data?.draft || ''
      return draft
    },
    save(next) {
      state = next
      dirty = true
      pump()
    },
    setDraft(text) {
      if (text === draft) return
      draft = text
      if (state) { dirty = true; pump() }
    },
    flushSync() {
      if (state) api.saveSync(snapshot())
    },
  }
}
