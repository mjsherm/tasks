import React, { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import LinkChip from './LinkChip.jsx'
import { serviceLinks } from '../links.js'

const day = (ms) => new Date(ms).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export default function ArchiveView({ archive: all, filter, dispatch, onBack, onOpen, onDelete }) {
  const archive = useMemo(() => (filter ? all.filter((t) => t.project === filter) : all), [all, filter])
  // Grouped by the day each batch was archived, newest first.
  const groups = useMemo(() => {
    const map = new Map()
    for (const t of archive) {
      const k = day(t.archivedAt)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    }
    return [...map]
  }, [archive])

  return (
    <div className="detail">
      <button type="button" className="back" onClick={onBack}>
        <span aria-hidden>←</span> Tasks
      </button>
      <h1 className="trash-title">Archive{filter ? <span className="muted"> · #{filter}</span> : null}</h1>
      <p className="meta">{archive.length ? `${archive.length} finished ${archive.length === 1 ? 'task' : 'tasks'}` : 'Finished tasks you archive land here.'}</p>
      {groups.map(([label, tasks]) => (
        <section key={label} className="archive-group">
          <div className="section-label flush">{label}</div>
          <ul className="rows">
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <motion.li key={t.id} layout="position" className="row is-done" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                  <div className="row-title" role="button" tabIndex={0} onClick={() => onOpen(t.id)}>
                    <span className="strike">{t.title || 'Untitled'}</span>
                    {serviceLinks(t.body).map((l) => <LinkChip key={l.href} {...l} />)}
                  </div>
                  <button type="button" className="link reveal" onClick={() => dispatch({ type: 'unarchive', ids: [t.id] })}>Restore</button>
                  <button type="button" className="row-delete" title="Delete" aria-label="Delete task" onClick={() => onDelete(t.id)}>
                    <svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  )
}
