import React, { useEffect, useState } from 'react'
import { api } from '../api.js'

const SIZES = [16, 18, 20, 22, 24, 26]

// Freewrite-style footer: quiet text buttons that fade away while you type
// and come back when the mouse moves.
export default function BottomBar({ state, dispatch, fonts, view, onTrash, onDelete }) {
  const { settings, tasks, trash } = state
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const hide = (e) => { if (!e.metaKey && !e.ctrlKey && e.key.length === 1) setHidden(true) }
    const show = () => setHidden(false)
    window.addEventListener('keydown', hide)
    window.addEventListener('mousemove', show)
    return () => {
      window.removeEventListener('keydown', hide)
      window.removeEventListener('mousemove', show)
    }
  }, [])

  const set = (key, value) => dispatch({ type: 'setting', key, value })
  const nextSize = SIZES[(SIZES.indexOf(settings.fontSize) + 1) % SIZES.length] || 18
  const doneCount = tasks.filter((t) => t.done).length
  const Dot = () => <span className="dot">•</span>

  return (
    <footer className={'bar' + (hidden ? ' is-hidden' : '')}>
      <div className="bar-group">
        <button type="button" onClick={() => set('fontSize', nextSize)}>{settings.fontSize}px</button>
        {fonts.map((f) => (
          <React.Fragment key={f}>
            <Dot />
            <button type="button" className={settings.font === f ? 'is-active' : ''} onClick={() => set('font', f)}>{f}</button>
          </React.Fragment>
        ))}
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
        {view === 'task' && onDelete && (
          <>
            <button type="button" onClick={onDelete}>Delete</button>
            <Dot />
          </>
        )}
        {view !== 'task' && (trash.length > 0 || view === 'trash') && (
          <>
            <button type="button" className={view === 'trash' ? 'is-active' : ''} onClick={onTrash}>Trash</button>
            <Dot />
          </>
        )}
        <button type="button" onClick={() => api.toggleFullscreen()}>Fullscreen</button>
        <Dot />
        <button type="button" onClick={() => set('theme', settings.theme === 'dark' ? 'light' : 'dark')}>
          {settings.theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </footer>
  )
}
