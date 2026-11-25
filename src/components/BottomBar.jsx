import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { api } from '../api.js'
import { fontName } from '../typography.js'
import TypePanel from './TypePanel.jsx'

// Freewrite-style footer: quiet text buttons that fade away while you type
// and come back when the mouse moves.
export default function BottomBar({ state, dispatch, view, onTrash, onArchive, onDelete }) {
  const { settings, tasks, trash, archive } = state
  const [hidden, setHidden] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const closeType = useCallback(() => setTypeOpen(false), [])
  const [fullscreen, setFullscreen] = useState(false)
  useEffect(() => api.onFullscreen(setFullscreen), [])

  useEffect(() => {
    const hide = (e) => {
      if (e.metaKey || e.ctrlKey || e.key.length !== 1) return
      if (e.target.closest?.('.type-panel')) return
      setHidden(true)
    }
    const show = () => setHidden(false)
    window.addEventListener('keydown', hide)
    window.addEventListener('mousemove', show)
    return () => {
      window.removeEventListener('keydown', hide)
      window.removeEventListener('mousemove', show)
    }
  }, [])

  const set = (key, value) => dispatch({ type: 'setting', key, value })
  const doneCount = tasks.filter((t) => t.done).length
  const Dot = () => <span className="dot">•</span>

  return (
    <>
    <AnimatePresence>
      {typeOpen && <TypePanel settings={settings} set={set} onClose={closeType} />}
    </AnimatePresence>
    <footer className={'bar' + (hidden && !typeOpen ? ' is-hidden' : '')}>
      <div className="bar-group">
        <button type="button" className={'type-toggle' + (typeOpen ? ' is-active' : '')} onClick={() => setTypeOpen((o) => !o)}>
          {fontName(settings.font)} · {settings.fontSize}
        </button>
      </div>
      <div className="bar-group">
        {view === 'list' && doneCount > 0 && (
          <>
            <button type="button" onClick={() => set('showDone', !settings.showDone)}>
              {settings.showDone ? 'Hide done' : `Show done (${doneCount})`}
            </button>
            <Dot />
          </>
        )}
        {(view === 'task' || view === 'doc') && onDelete && (
          <>
            <button type="button" onClick={onDelete}>Delete</button>
            <Dot />
          </>
        )}
        {view !== 'task' && view !== 'doc' && (archive.length > 0 || view === 'archive') && (
          <>
            <button type="button" className={view === 'archive' ? 'is-active' : ''} onClick={onArchive}>Archive</button>
            <Dot />
          </>
        )}
        {view !== 'task' && view !== 'doc' && (trash.length > 0 || view === 'trash') && (
          <>
            <button type="button" className={view === 'trash' ? 'is-active' : ''} onClick={onTrash}>Trash</button>
            <Dot />
          </>
        )}
        <button type="button" onClick={() => api.toggleFullscreen()}>{fullscreen ? 'Windowed' : 'Fullscreen'}</button>
        <Dot />
        <button type="button" onClick={() => set('theme', settings.theme === 'dark' ? 'light' : 'dark')}>
          {settings.theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </footer>
    </>
  )
}
