import React, { useMemo, useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { DocIcon } from './DocLink.jsx'
import { search, docTitle } from '../docs.js'

// Highlights each place the query appears.
function Marked({ text, query }) {
  const q = query.trim().toLowerCase()
  if (!q) return text
  const out = []
  let i = 0
  const lower = text.toLowerCase()
  for (let j = lower.indexOf(q); j >= 0; j = lower.indexOf(q, i)) {
    if (j > i) out.push(text.slice(i, j))
    out.push(<mark key={j}>{text.slice(j, j + q.length)}</mark>)
    i = j + q.length
  }
  out.push(text.slice(i))
  return out
}

// ⌘K: one box that finds tasks and docs together.
export default function SearchPalette({ getState, onClose, onOpenDoc, onOpenTask }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const input = useRef(null)
  const state = useMemo(getState, [])
  const results = useMemo(() => search(state, query), [state, query])
  const flat = useMemo(() => [...results.docs, ...results.tasks], [results])

  useEffect(() => setIndex(0), [query])
  useEffect(() => { input.current?.focus() }, [])

  const pick = (r) => {
    if (!r) return
    onClose()
    if (r.kind === 'doc') onOpenDoc(r.item.id)
    else onOpenTask(r.item.id)
  }

  const row = (r, i) => (
    <button
      type="button"
      key={r.kind + r.item.id}
      className={'palette-item' + (i === index ? ' is-selected' : '') + (r.item.done ? ' is-done' : '')}
      onMouseEnter={() => setIndex(i)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => pick(r)}
    >
      <span className="palette-icon">
        {r.kind === 'doc' ? <DocIcon size={16} /> : <span className={'palette-ring' + (r.item.done ? ' is-done' : '')} />}
      </span>
      <span className="palette-text">
        <span className="palette-title"><Marked text={r.kind === 'doc' ? docTitle(r.item) : r.item.title || 'Untitled'} query={query} /></span>
        {r.context && <span className="palette-context"><Marked text={r.context} query={query} /></span>}
      </span>
      {r.item.project && <span className="palette-tag">{r.item.project}</span>}
      {i === index && <kbd>↵</kbd>}
    </button>
  )

  return (
    <>
      <motion.div className="capture-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={onClose} />
      <motion.div
        className="palette"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 600, damping: 40 }}
      >
        <div className="palette-search">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></svg>
          <input
            ref={input}
            value={query}
            placeholder="Search tasks and docs"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, flat.length - 1)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)) }
              else if (e.key === 'Enter') { e.preventDefault(); pick(flat[index]) }
              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
            }}
          />
        </div>
        {query.trim() && (
          <div className="palette-results">
            {results.docs.length > 0 && <div className="palette-label">Docs</div>}
            {results.docs.map((r, i) => row(r, i))}
            {results.tasks.length > 0 && <div className="palette-label">Tasks</div>}
            {results.tasks.map((r, i) => row(r, results.docs.length + i))}
            {!flat.length && <div className="palette-empty">Nothing matches “{query.trim()}”</div>}
          </div>
        )}
      </motion.div>
    </>
  )
}
