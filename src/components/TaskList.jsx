import React, { memo, useEffect, useRef, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, Reorder, motion } from 'motion/react'
import TaskRow, { hovered } from './TaskRow.jsx'
import ProjectSwitcher from './ProjectSwitcher.jsx'
import DocShelf from './DocShelf.jsx'
import TagMenu, { menuKeys } from './TagMenu.jsx'
import { api } from '../api.js'
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

function TaskList({ tasks, docs, projects, active, filter, initialDraft, onDraft, showDone, dispatch, onOpen, onOpenDoc, onNewDoc, onShowDocs, onDelete, onArchive, onFilter, onClearProject }) {
  const visible = useMemo(() => (filter ? tasks.filter((t) => t.project === filter) : tasks), [tasks, filter])
  const open = useMemo(() => visible.filter((t) => !t.done), [visible])
  const done = useMemo(
    () => visible.filter((t) => t.done).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [visible],
  )
  const todays = useMemo(() => open.filter((t) => t.today), [open])
  const later = useMemo(() => (todays.length ? open.filter((t) => !t.today) : open), [open, todays])
  const todayIds = useMemo(() => todays.map((t) => t.id), [todays])
  const laterIds = useMemo(() => later.map((t) => t.id), [later])

  // T stars (or unstars) the task under the pointer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 't' || e.metaKey || e.ctrlKey || e.altKey || !hovered.id) return
      const el = document.activeElement
      if (/INPUT|TEXTAREA/.test(el?.tagName) || el?.isContentEditable) return
      if (!document.querySelector('.list-page:not([hidden])') || document.querySelector('.capture')) return
      e.preventDefault()
      dispatch({ type: 'toggleToday', id: hovered.id })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])
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
        <DocShelf docs={docs} filter={filter} onNew={onNewDoc} onOpen={onOpenDoc} onShowAll={onShowDocs} />
        <AnimatePresence initial={false}>
          {todays.length > 0 && (
            <motion.div key="today-label" layout="position" transition={layoutSpring} className="section-label today-label"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <span>Today</span>
              <span className="label-count">{todays.length} left</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Reorder.Group as="ul" axis="y" className="rows" values={todayIds} onReorder={(ids) => dispatch({ type: 'reorder', ids })}>
          <AnimatePresence initial={false}>
            {todays.map((t) => (
              <TaskRow key={t.id} task={t} draggable showProject={!filter} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} onFilter={onFilter} docs={docs} onOpenDoc={onOpenDoc} />
            ))}
          </AnimatePresence>
        </Reorder.Group>
        <AnimatePresence initial={false}>
          {todays.length > 0 && later.length > 0 && (
            <motion.div key="later-label" layout="position" transition={layoutSpring} className="section-label later-label"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
              <span>Later</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Reorder.Group as="ul" axis="y" className="rows" values={laterIds} onReorder={(ids) => dispatch({ type: 'reorder', ids })}>
          <AnimatePresence initial={false}>
            {later.map((t) => (
              <TaskRow key={t.id} task={t} draggable showProject={!filter} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} onFilter={onFilter} docs={docs} onOpenDoc={onOpenDoc} />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        <NewTask dispatch={dispatch} initialDraft={initialDraft} onDraft={onDraft} empty={open.length === 0} projects={projects} filter={filter} />
        <CaptureBar dispatch={dispatch} projects={projects} filter={filter} />

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
                    <TaskRow key={t.id} task={t} showProject={!filter} dispatch={dispatch} onOpen={onOpen} onDelete={onDelete} onFilter={onFilter} docs={docs} onOpenDoc={onOpenDoc} />
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
const NewTask = memo(function NewTask({ dispatch, initialDraft, onDraft, empty, projects, filter }) {
  const [draft, setDraft] = useState(initialDraft)
  const input = useRef(null)
  const prompt = useMemo(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)], [])

  useEffect(() => {
    if (empty) input.current?.focus()
    const onKey = (e) => {
      if (!input.current?.offsetParent) return
      // Escape on the list hides the app, same as pressing ⌥Space again.
      if (e.key === 'Escape') {
        if (e.defaultPrevented || document.querySelector('.type-panel, .tag-menu, .capture, .palette')) return
        document.activeElement?.blur?.()
        api.hide()
        return
      }
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
    // Coming back to the window with an empty add box focused would swallow
    // Space/Enter, which should open the capture bar instead.
    const onFocus = () => {
      if (document.activeElement === input.current && !input.current.value) input.current.blur()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const change = (value) => { setDraft(value); onDraft(value) }
  const submit = (text, today) => {
    const { title, project } = parseTitle(text)
    if (!title) return
    dispatch({ type: 'add', title, project: project || filter, today })
    change('')
  }

  return (
    <motion.div layout="position" className="new-row" transition={layoutSpring}>
      <span className="new-plus" aria-hidden>+</span>
      <TaskField
        inputRef={input}
        value={draft}
        onChange={change}
        onSubmit={submit}
        projects={projects}
        placeholder={filter ? `Add to ${displayName(filter)}` : empty ? prompt : 'Add a task'}
      />
    </motion.div>
  )
})

// Space or Enter on the list (when nothing is being typed) opens a floating
// bar to add a task, then gets out of the way.
const CaptureBar = memo(function CaptureBar({ dispatch, projects, filter }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [added, setAdded] = useState(null)
  const anchor = useRef(null)
  const input = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (open || !anchor.current?.offsetParent) return
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const el = document.activeElement
      if (/INPUT|TEXTAREA|SELECT/.test(el?.tagName) || el?.isContentEditable) return
      if (document.querySelector('.type-panel')) return
      e.preventDefault()
      el?.blur?.()
      setAdded(null)
      setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(null), 1400)
    return () => clearTimeout(t)
  }, [added])

  const submit = (value, today) => {
    const { title, project } = parseTitle(value)
    if (!title) return
    const into = project || filter
    dispatch({ type: 'add', title, project: into, today })
    setText('')
    setOpen(false)
    setAdded({ key: Date.now(), label: today ? 'Added to Today' : into ? `Added to ${displayName(into)}` : 'Added' })
  }

  return (
    <>
      <span ref={anchor} className="capture-anchor" aria-hidden />
      <AnimatePresence>
        {open && (
          <motion.div
            key="scrim"
            className="capture-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={() => setOpen(false)}
          />
        )}
        {open && (
          <motion.div
            key="bar"
            className="capture"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 600, damping: 40 }}
            onAnimationStart={() => input.current?.focus()}
          >
            <span className="new-plus" aria-hidden>+</span>
            <TaskField
              inputRef={input}
              autoFocus
              value={text}
              onChange={setText}
              onSubmit={submit}
              onEscape={() => setOpen(false)}
              projects={projects}
              placeholder={filter ? `Add to ${displayName(filter)}` : 'Add a task'}
            />
            <span className="capture-hint">↵ save · ⌘↵ today · esc close</span>
          </motion.div>
        )}
        {added && (
          <motion.div
            key={added.key}
            className="capture-pill"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden>
              <circle cx="10" cy="10" r="9" fill="currentColor" />
              <path d="M6.2 10.4l2.6 2.6 5-5.4" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {added.label}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

// One line of task text with #project suggestions. Enter finishes a tag and
// adds the task in one go; Tab only completes the tag so you can keep typing.
function TaskField({ inputRef, value, onChange, onSubmit, onEscape, projects, placeholder, autoFocus }) {
  const [tag, setTag] = useState(null)
  const [index, setIndex] = useState(0)
  const items = tag ? suggest(projects, tag.query) : []

  const change = (next, caret = next.length) => {
    onChange(next)
    const t = tagAtCaret(next, caret)
    setTag(t)
    if (!t) setIndex(0)
  }

  const pick = (p) => {
    const before = value.slice(0, tag.start) + '#' + p.name + ' '
    const next = before + value.slice(tag.start + 1 + tag.query.length).replace(/^\s+/, '')
    change(next, before.length)
    setTag(null)
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(before.length, before.length))
  }

  const submit = (text, today) => {
    onSubmit(text, today)
    setTag(null)
  }

  // Line the menu up under the "#" being typed.
  const menuLeft = useMemo(() => {
    if (!tag || !inputRef.current) return 0
    const ctx = (measure ||= document.createElement('canvas')).getContext('2d')
    ctx.font = getComputedStyle(inputRef.current).font
    return Math.round(ctx.measureText(value.slice(0, tag.start)).width)
  }, [tag?.start, value])

  return (
    <div className="new-field">
      <input
        ref={inputRef}
        className="new-input"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => change(e.target.value, e.target.selectionStart)}
        onKeyDown={(e) => {
          if (tag && e.key === 'Escape') { e.preventDefault(); setTag(null); return }
          if (tag && e.key === 'Enter' && items.length) {
            e.preventDefault()
            const p = items[index]
            submit(value.slice(0, tag.start) + '#' + p.name + ' ' + value.slice(tag.start + 1 + tag.query.length), e.metaKey || e.ctrlKey)
            return
          }
          if (tag && menuKeys(e, items, index, setIndex, pick)) { e.preventDefault(); return }
          if (e.key === 'Enter') { e.preventDefault(); submit(value, e.metaKey || e.ctrlKey) }
          if (e.key === 'Escape' && onEscape) { e.preventDefault(); onEscape() }
        }}
        onBlur={() => setTag(null)}
        spellCheck
      />
      {tag && <TagMenu items={items} index={index} onHover={setIndex} onPick={pick} style={{ position: 'absolute', left: menuLeft, top: '2em' }} />}
    </div>
  )
}

export default memo(TaskList)
