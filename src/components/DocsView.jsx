import React, { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DocIcon } from './DocLink.jsx'
import { displayName } from '../projects.js'
import { snippet, when, docTitle, byEdited } from '../docs.js'

// Every doc, or every doc in the current project. Opened from the DOCS label
// or the "N docs" count above the task list, or with D.
export default function DocsView({ docs: all, filter, onBack, onOpen, onNew, onDelete }) {
  const docs = useMemo(() => (filter ? all.filter((d) => d.project === filter) : all).slice().sort(byEdited), [all, filter])

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey && (e.key === '[' || e.key === 'ArrowLeft')) { e.preventDefault(); onBack(); return }
      if (e.key !== 'Escape' || document.querySelector('.type-panel, .palette')) return
      e.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onBack])

  return (
    <div className="detail">
      <button type="button" className="back" onClick={onBack}>
        <span aria-hidden>←</span> {filter ? displayName(filter) : 'Tasks'}
      </button>
      <h1 className="trash-title">Docs{filter ? <span className="muted"> · #{filter}</span> : null}</h1>
      <p className="meta">{docs.length ? `${docs.length} ${docs.length === 1 ? 'doc' : 'docs'}` : 'Nothing written yet.'}</p>
      <button type="button" className="new-row new-doc-row" onClick={onNew}>
        <span className="new-plus" aria-hidden>+</span>
        <span className="muted">New doc</span>
      </button>
      <ul className="rows">
        <AnimatePresence initial={false}>
          {docs.map((d) => (
            <motion.li key={d.id} layout="position" className="row doc-row" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <span className="doc-row-icon"><DocIcon size={18} /></span>
              <div className="row-title doc-row-text" role="button" tabIndex={0} onClick={() => onOpen(d.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(d.id)}>
                <span className={d.title ? '' : 'muted'}>{docTitle(d)}</span>
                <span className="doc-snippet">{snippet(d.body) || 'Empty'}</span>
              </div>
              {!filter && d.project && <span className="row-tag"><span className="row-tag-name">{d.project}</span></span>}
              <span className="doc-when">{when(d.updatedAt)}</span>
              <button type="button" className="row-delete" title="Delete" aria-label="Delete doc" onClick={() => onDelete(d.id)}>
                <svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" /></svg>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
