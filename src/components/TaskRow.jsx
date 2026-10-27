import React, { useState, useEffect, useRef } from 'react'
import { Reorder, motion, useDragControls } from 'motion/react'
import Checkbox from './Checkbox.jsx'

const spring = { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }

export default function TaskRow({ task, draggable, onToggle, onOpen }) {
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
      onToggle()
    }, 420)
  }

  const hasNotes = !!task.body && JSON.stringify(task.body).includes('"text"')
  const Comp = draggable ? Reorder.Item : motion.li
  const dragProps = draggable
    ? { value: task.id, dragListener: false, dragControls: controls, whileDrag: { scale: 1.02, boxShadow: 'var(--lift)' } }
    : {}

  return (
    <Comp
      {...dragProps}
      layout="position"
      layoutId={task.id}
      className={'row' + (checked ? ' is-done' : '')}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={spring}
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
      <button type="button" className="row-title" onClick={onOpen}>
        <span className={'strike' + (task.title ? '' : ' is-empty')}>{task.title || 'Untitled'}</span>
        {hasNotes && <span className="notes-dot" title="Has notes" />}
      </button>
    </Comp>
  )
}
