import React, { memo, useState, useEffect, useMemo, useRef } from 'react'
import { Reorder, motion, useDragControls } from 'motion/react'
import Checkbox from './Checkbox.jsx'
import LinkChip from './LinkChip.jsx'
import { serviceLinks, splitTitle } from '../links.js'

// The row under the pointer, so T can star it without a click.
export const hovered = { id: null }

export const StarIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
    <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
  </svg>
)

const spring = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 }

function TaskRow({ task, draggable, showProject, dispatch, onOpen, onDelete, onFilter }) {
  const controls = useDragControls()
  // Show the check landing before the row moves to the done section.
  const [pending, setPending] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const checked = pending ?? task.done
  const toggle = () => {
    if (pending !== null) return
    setPending(!task.done)
    timer.current = setTimeout(() => {
      setPending(null)
      dispatch({ type: 'toggle', id: task.id })
    }, 300)
  }

  const parts = useMemo(() => splitTitle(task.title || ''), [task.title])
  const links = useMemo(() => serviceLinks(task.body), [task.body])
  const hasNotes = useMemo(() => !!task.body && JSON.stringify(task.body).includes('"text"'), [task.body])

  const Comp = draggable ? Reorder.Item : motion.li
  const dragProps = draggable
    ? { value: task.id, dragListener: false, dragControls: controls, whileDrag: { scale: 1.015, boxShadow: 'var(--lift)', zIndex: 2 } }
    : {}

  return (
    <Comp
      {...dragProps}
      layout="position"
      layoutId={task.id}
      className={'row' + (checked ? ' is-done' : '')}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={spring}
      onPointerEnter={() => { hovered.id = task.id }}
      onPointerLeave={() => { if (hovered.id === task.id) hovered.id = null }}
    >
      {draggable && (
        <span
          className="handle"
          aria-hidden
          onPointerDown={(e) => {
            e.preventDefault()
            controls.start(e)
          }}
        >
          <svg viewBox="0 0 10 16" width="8" height="14">
            {[3, 8, 13].map((y) => [<circle key={'a' + y} cx="2.5" cy={y} r="1.3" />, <circle key={'b' + y} cx="7.5" cy={y} r="1.3" />])}
          </svg>
        </span>
      )}
      <Checkbox checked={checked} onToggle={toggle} />
      <div className="row-title" role="button" tabIndex={0} onClick={() => onOpen(task.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(task.id)}>
        <span className={'strike' + (task.title ? '' : ' is-empty')}>
          {task.title
            ? parts.map((p, i) => (p.href ? <LinkChip key={i} {...p} showLabel /> : <React.Fragment key={i}>{p.text}</React.Fragment>))
            : 'Untitled'}
        </span>
        {links.map((l) => <LinkChip key={l.href} {...l} />)}
        {hasNotes && !links.length && <span className="notes-dot" title="Has notes" />}
      </div>
      {showProject && task.project && (
        <span className="row-tag">
          <button type="button" className="row-tag-name" title={`Show #${task.project}`} onClick={() => onFilter(task.project)}>{task.project}</button>
          <button type="button" className="tag-clear" title="Remove from project" aria-label="Remove from project" onClick={() => dispatch({ type: 'update', id: task.id, patch: { project: null } })}>
            <svg viewBox="0 0 12 12" width="7" height="7"><path d="M2 2l8 8M10 2l-8 8" /></svg>
          </button>
        </span>
      )}
      {!task.done && (
        <button
          type="button"
          className={'row-star' + (task.today ? ' is-on' : '')}
          title={task.today ? 'Remove from Today (T)' : 'Add to Today (T)'}
          aria-label={task.today ? 'Remove from Today' : 'Add to Today'}
          onClick={() => dispatch({ type: 'update', id: task.id, patch: { today: !task.today } })}
        >
          <StarIcon />
        </button>
      )}
      <button type="button" className="row-delete" title="Delete" aria-label="Delete task" onClick={() => onDelete(task.id)}>
        <svg viewBox="0 0 12 12" width="10" height="10"><path d="M2 2l8 8M10 2l-8 8" /></svg>
      </button>
    </Comp>
  )
}

export default memo(TaskRow)
