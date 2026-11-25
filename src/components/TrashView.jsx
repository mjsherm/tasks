import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DocIcon } from './DocLink.jsx'

const ago = (ms) => {
  const days = Math.floor((Date.now() - ms) / 864e5)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

export default function TrashView({ trash, dispatch, onBack }) {
  return (
    <div className="detail">
      <button type="button" className="back" onClick={onBack}>
        <span aria-hidden>←</span> Tasks
      </button>
      <h1 className="trash-title">Trash</h1>
      <p className="meta">Deleted tasks and docs stay here for 30 days.</p>
      {trash.length === 0 && <p className="muted">Nothing here.</p>}
      <ul className="rows">
        <AnimatePresence initial={false}>
          {trash.map((t) => (
            <motion.li
              key={t.id}
              layout
              className="row trash-row"
              exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
            >
              <span className="row-title static">{t.kind === 'doc' && <DocIcon size={14} />}{t.title || 'Untitled'}</span>
              <span className="muted small">{ago(t.deletedAt)}</span>
              <button type="button" className="link" onClick={() => dispatch({ type: 'restore', id: t.id })}>
                Restore
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
