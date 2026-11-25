import React, { memo, useMemo } from 'react'
import { motion } from 'motion/react'
import { DocIcon } from './DocLink.jsx'
import { when, docTitle, byEdited } from '../docs.js'

const SHOWN = 3
const layoutSpring = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 }

// The row of doc tiles above a project's tasks. "+ New doc" comes first; the
// DOCS label and the count both open the full list.
function DocShelf({ docs: all, filter, onNew, onOpen, onShowAll }) {
  const docs = useMemo(() => (filter ? all.filter((d) => d.project === filter) : all).slice().sort(byEdited), [all, filter])
  // In "All" the shelf only shows up once there's a doc to show.
  if (!filter && !docs.length) return null
  const count = `${docs.length} ${docs.length === 1 ? 'doc' : 'docs'}`

  return (
    <motion.section layout="position" transition={layoutSpring} className="shelf">
      <div className="section-label shelf-label">
        <button type="button" className="shelf-link" title="Show all docs (D)" onClick={onShowAll}>Docs</button>
        {docs.length > 0 && <button type="button" className="shelf-link shelf-count" onClick={onShowAll}>{count}</button>}
      </div>
      <div className="tiles">
        <button type="button" className="tile tile-new" onClick={onNew}>+ New doc</button>
        {docs.slice(0, SHOWN).map((d) => (
          <button type="button" key={d.id} className="tile" onClick={() => onOpen(d.id)}>
            <DocIcon size={15} />
            <span className={'tile-title' + (d.title ? '' : ' muted')}>{docTitle(d)}</span>
            <span className="tile-when">Edited {when(d.updatedAt)}</span>
          </button>
        ))}
      </div>
    </motion.section>
  )
}

export default memo(DocShelf)
