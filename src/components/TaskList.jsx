import React, { memo, useEffect, useRef, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import TaskRow from './TaskRow.jsx'
import ProjectSwitcher from './ProjectSwitcher.jsx'
import TagMenu, { menuKeys } from './TagMenu.jsx'
import { parseTitle, tagAtCaret, suggest, displayName } from '../projects.js'

const PROMPTS = [
  'What needs doing?',
  'Write the first thing down',
  'One small thing…',
  'What would make today good?',
  'Start anywhere',
]

let measure = null

const layoutSpring = { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 }

function TaskList({ tasks, projects, active, filter, initialDraft, onDraft, showDone, dispatch, onOpen, onDelete, onArchive, onFilter, onClearProject }) {
  const visible = useMemo(() => (filter ? tasks.filter((t) => t.project === filter) : tasks), [tasks, filter])
  const open = useMemo(() => visible.filter((t) => !t.done), [visible])
  const done = useMemo(
    () => visible.filter((t) => t.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [visible],
  )
  const openIds = useMemo(() => open.map((t) => t.id), [open])
  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), [])

  return (
    <div className="list">
      <header className="list-head">
        {active.length ? (
          <ProjectSwitcher projects={active} current={filter} onPick={onFilter} onClear={onClearProject} />
        ) : (
          <span>{today}</span>
        )}
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
              <TaskRow key={t.id} task={t} draggable showProject={!filter} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} onFilter={onFilter} />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <NewTask dispatch={dispatch} initialDraft={initialDraft} onDraft={onDraft} empty={open.length === 0} projects={projects} filter={filter} />

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
                    <TaskRow key={t.id} task={t} showProject={!filter} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} onFilter={onFilter} />
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
// Typing #name tags the task with a project; a menu suggests existing ones.
const NewTask = memo(function NewTask({ dispatch, initialDraft, onDraft, empty, projects, filter }) {
  const [draft, setDraft] = useState(initialDraft)
  const [tag, setTag] = useState(null)
  const [index, setIndex] = useState(0)
  const input = useRef(null)
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], [])
  const items = tag ? suggest(projects, tag.query) : []

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

  const change = (value, caret = value.length) => {
    setDraft(value)
    onDraft(value)
    const next = tagAtCaret(value, caret)
    setTag(next)
    if (!next) setIndex(0)
  }

  const pick = (p) => {
    const before = draft.slice(0, tag.start) + '#' + p.name + ' '
    const value = before + draft.slice(tag.start + 1 + tag.query.length).replace(/^\s+/, '')
    change(value, before.length)
    setTag(null)
    requestAnimationFrame(() => input.current?.setSelectionRange(before.length, before.length))
  }

  const submit = (text = draft) => {
    const { title, project } = parseTitle(text)
    if (!title) return
    dispatch({ type: 'add', title, project: project || filter })
    change('')
  }

  // Line the menu up under the "#" being typed.
  const menuLeft = useMemo(() => {
    if (!tag || !input.current) return 0
    const ctx = (measure ||= document.createElement('canvas')).getContext('2d')
    ctx.font = getComputedStyle(input.current).font
    return Math.round(ctx.measureText(draft.slice(0, tag.start)).width)
  }, [tag?.start, draft])

  return (
    <motion.div layout="position" className="new-row" transition={layoutSpring}>
      <span className="new-plus" aria-hidden>+</span>
      <div className="new-field">
        <input
          ref={input}
          className="new-input"
          value={draft}
          placeholder={filter ? `Add to ${displayName(filter)}` : empty ? prompt : 'Add a task'}
          onChange={(e) => change(e.target.value, e.target.selectionStart)}
          onKeyDown={(e) => {
            if (tag && e.key === 'Escape') { setTag(null); return }
            // Enter finishes the tag and adds the task in one go; Tab only
            // completes the tag so you can keep typing.
            if (tag && e.key === 'Enter' && items.length) {
              e.preventDefault()
              const p = items[index]
              submit(draft.slice(0, tag.start) + '#' + p.name + ' ' + draft.slice(tag.start + 1 + tag.query.length))
              setTag(null)
              return
            }
            if (tag && menuKeys(e, items, index, setIndex, pick)) { e.preventDefault(); return }
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          onBlur={() => setTag(null)}
          spellCheck
        />
        {tag && <TagMenu items={items} index={index} onHover={setIndex} onPick={pick} style={{ position: 'absolute', left: menuLeft, top: '2em' }} />}
      </div>
    </motion.div>
  )
})

export default memo(TaskList)
