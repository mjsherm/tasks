import React, { useEffect, useRef, useMemo } from 'react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import TaskRow from './TaskRow.jsx'

const PROMPTS = [
  'What needs doing?',
  'Write the first thing down',
  'One small thing…',
  'What would make today good?',
  'Start anywhere',
]

export default function TaskList({ tasks, draft, showDone, dispatch, onOpen }) {
  const open = tasks.filter((t) => !t.done)
  const done = tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
  // The half-typed task is part of saved state, so it survives a crash too.
  const setDraft = (value) => dispatch({ type: 'draft', value })
  const input = useRef(null)
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], [])
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  useEffect(() => {
    if (open.length === 0) input.current?.focus()
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        input.current?.focus()
      } else if (!typing && (e.key === 'n' || e.key === 'Enter')) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const title = draft.trim()
    if (!title) return
    dispatch({ type: 'add', title })
  }

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
          values={open.map((t) => t.id)}
          onReorder={(ids) => dispatch({ type: 'reorder', ids })}
        >
          <AnimatePresence initial={false}>
            {open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                draggable
                onToggle={() => dispatch({ type: 'toggle', id: t.id })}
                onOpen={() => onOpen(t.id)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <motion.div layout="position" className="new-row" transition={{ type: 'spring', stiffness: 520, damping: 42 }}>
          <span className="new-plus" aria-hidden>+</span>
          <input
            ref={input}
            className="new-input"
            value={draft}
            placeholder={open.length ? 'Add a task' : prompt}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') e.currentTarget.blur()
            }}
            onBlur={submit}
            spellCheck
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {showDone && done.length > 0 && (
            <motion.section
              key="done"
              layout="position"
              className="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div layout="position" className="section-label">Done</motion.div>
              <ul className="rows">
                <AnimatePresence initial={false}>
                  {done.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onToggle={() => dispatch({ type: 'toggle', id: t.id })}
                      onOpen={() => onOpen(t.id)}
                    />
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
