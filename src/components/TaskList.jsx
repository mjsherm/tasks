import React, { memo, useEffect, useRef, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import TaskRow from './TaskRow.jsx'

const PROMPTS = [
  'What needs doing?',
  'Write the first thing down',
  'One small thing…',
  'What would make today good?',
  'Start anywhere',
]

const layoutSpring = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 }

function TaskList({ tasks, initialDraft, onDraft, showDone, dispatch, onOpen, onDelete, onArchive }) {
  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks])
  const done = useMemo(
    () => tasks.filter((t) => t.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [tasks],
  )
  const openIds = useMemo(() => open.map((t) => t.id), [open])
  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), [])

  return (
    <div className="list">
      <header className="list-head">
        <span>{today}</span>
        <span className="muted">{open.length ? `${open.length} to do` : ''}</span>
      </header>

      <LayoutGroup>
        <Reorder.Group
          as="ul"
          axis="y"
          className="rows"
          values={openIds}
          onReorder={(ids) => dispatch({ type: 'reorder', ids })}
        >
          <AnimatePresence initial={false}>
            {open.map((t) => (
              <TaskRow key={t.id} task={t} draggable dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <NewTask dispatch={dispatch} initialDraft={initialDraft} onDraft={onDraft} empty={open.length === 0} />

        <AnimatePresence initial={false}>
          {showDone && done.length > 0 && (
            <motion.section
              key="done"
              layout="position"
              transition={layoutSpring}
              className="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div layout="position" transition={layoutSpring} className="section-label">
                <span>Done</span>
                <button type="button" className="label-action" onClick={() => onArchive(done.map((t) => t.id))}>
                  Archive all
                </button>
              </motion.div>
              <ul className="rows">
                <AnimatePresence initial={false}>
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} />
                  ))}
                </AnimatePresence>
              </ul>
            </motion.section>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  )
}

// The add box keeps its own text, so typing re-renders only this input.
const NewTask = memo(function NewTask({ dispatch, initialDraft, onDraft, empty }) {
  const [draft, setDraft] = useState(initialDraft)
  const input = useRef(null)
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], [])

  useEffect(() => {
    if (empty) input.current?.focus()
    const onKey = (e) => {
      if (!input.current?.offsetParent) return
      const el = document.activeElement
      const typing = /INPUT|TEXTAREA/.test(el?.tagName) || el?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        input.current?.focus()
      } else if (!typing && e.key === 'n') {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const change = (value) => {
    setDraft(value)
    onDraft(value)
  }

  const submit = () => {
    const title = draft.trim()
    if (!title) return
    dispatch({ type: 'add', title })
    change('')
  }

  return (
    <motion.div layout="position" className="new-row" transition={layoutSpring}>
      <span className="new-plus" aria-hidden>+</span>
      <input
        ref={input}
        className="new-input"
        value={draft}
        placeholder={empty ? prompt : 'Add a task'}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') e.currentTarget.blur()
        }}
        spellCheck
      />
    </motion.div>
  )
})

export default memo(TaskList)
