import React, { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { api, createSaver } from './api.js'
import { reducer, findTask, findDoc, newId } from './state.js'
import { docBridge, docTitle } from './docs.js'
import { listProjects, activeProjects, displayName } from './projects.js'
import { applyTypography } from './typography.js'
import TaskList from './components/TaskList.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import TrashView from './components/TrashView.jsx'
import ArchiveView from './components/ArchiveView.jsx'
import BottomBar from './components/BottomBar.jsx'
import Toast from './components/Toast.jsx'
import DocDetail from './components/DocDetail.jsx'
import DocsView from './components/DocsView.jsx'
import SearchPalette from './components/SearchPalette.jsx'


// Opacity and transform only: both run on the compositor, so page changes
// stay smooth no matter how much is on screen.
const page = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  // Leave instantly: the page underneath is already fading in.
  exit: { opacity: 0, transition: { duration: 0 } },
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null)
  const [view, setView] = useState({ name: 'list' })
  const [toast, setToast] = useState(null)
  const [searching, setSearching] = useState(false)
  const [initialDraft, setInitialDraft] = useState('')
  const saver = useRef(null)
  if (!saver.current) saver.current = createSaver()

  useEffect(() => {
    api.load().then((data) => {
      setInitialDraft(saver.current.init(data))
      dispatch({ type: '@load', data })
    })
  }, [])

  useEffect(() => {
    if (state) saver.current.save(state)
  }, [state])

  useEffect(() => {
    const flush = () => saver.current.flushSync()
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  const settings = state?.settings
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.dataset.theme = settings.theme
    applyTypography(settings, root)
  }, [settings])

  const showToast = useCallback((text, onUndo) => {
    setToast({ key: Date.now(), text, action: 'Undo', onAction: onUndo })
  }, [])

  // Pages remember the page they were opened from, so Back retraces your
  // steps (a doc opened from a task goes back to that task).
  const prev = (v) => (typeof v.from === 'object' ? v.from : { name: v.from || 'list' })

  const deleteTask = useCallback((id) => {
    dispatch({ type: 'delete', id })
    setView((v) => (v.name === 'task' && v.id === id ? prev(v) : v))
    showToast('Deleted', () => dispatch({ type: 'restore', id }))
  }, [showToast])

  const deleteDoc = useCallback((id) => {
    dispatch({ type: 'deleteDoc', id })
    setView((v) => (v.name === 'doc' && v.id === id ? prev(v) : v))
    showToast('Deleted doc', () => dispatch({ type: 'restore', id }))
  }, [showToast])

  const openDoc = useCallback((id) => setView((v) => (v.name === 'doc' && v.id === id ? v : { name: 'doc', id, from: v })), [])
  const openTask = useCallback((id) => setView((v) => (v.name === 'task' && v.id === id ? v : { name: 'task', id, from: v })), [])
  const showDocs = useCallback(() => setView((v) => (v.name === 'docs' ? v : { name: 'docs', from: v })), [])
  const newDoc = useCallback((title = '', project) => {
    const id = newId()
    const into = project === undefined ? stateRef.current.settings.project : project
    dispatch({ type: 'addDoc', id, title, project: into })
    return id
  }, [])
  const createAndOpenDoc = useCallback(() => openDoc(newDoc()), [newDoc, openDoc])

  const archiveDone = useCallback((ids) => {
    dispatch({ type: 'archiveDone' })
    showToast(`Archived ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`, () => dispatch({ type: 'unarchive', ids }))
  }, [showToast])

  const openFromList = useCallback((id) => setView({ name: 'task', id, from: 'list' }), [])
  const openFromArchive = useCallback((id) => setView({ name: 'task', id, from: 'archive' }), [])
  const back = useCallback(() => setView(prev), [])
  const toList = useCallback(() => setView({ name: 'list' }), [])
  const setDraft = useCallback((text) => saver.current.setDraft(text), [])
  const setFilter = useCallback((project) => dispatch({ type: 'setting', key: 'project', value: project }), [])
  const stateRef = useRef(state)
  stateRef.current = state
  const clearProject = useCallback((name) => {
    const { tasks, archive } = stateRef.current
    const ids = [...tasks, ...archive, ...stateRef.current.docs].filter((t) => t.project === name).map((t) => t.id)
    dispatch({ type: 'clearProject', name })
    showToast(`Removed #${name}`, () => dispatch({ type: 'restoreProject', name, ids }))
  }, [showToast])
  // Same array back while the project list is unchanged, so typing in a note
  // doesn't re-render the list or the switcher.
  const projectsRef = useRef([])
  const projects = useMemo(() => {
    const next = state ? listProjects(state.tasks, state.archive, state.docs) : []
    const old = projectsRef.current
    const same = next.length === old.length &&
      next.every((p, i) => p.name === old[i].name && p.open === old[i].open && p.docs === old[i].docs)
    if (!same) projectsRef.current = next
    return projectsRef.current
  }, [state?.tasks, state?.archive, state?.docs])

  // What the editor's [[ menu and doc chips can reach.
  const viewRef = useRef(view)
  viewRef.current = view
  docBridge.list = () => stateRef.current?.docs || []
  docBridge.create = (title, project) => newDoc(title, project)
  docBridge.open = openDoc
  docBridge.current = () => (viewRef.current.name === 'doc' ? viewRef.current.id : null)
  docBridge.project = () => {
    const v = viewRef.current
    const s = stateRef.current
    const item = v.name === 'doc' ? findDoc(s, v.id) : v.name === 'task' ? findTask(s, v.id) : null
    return item ? item.project : s?.settings.project || null
  }

  // ⌘K searches everything from anywhere. D opens the docs list and ⌘⇧N
  // starts a new doc, from the task list.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearching((s) => !s)
        return
      }
      if (viewRef.current.name !== 'list' || document.querySelector('.capture, .palette, .type-panel')) return
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        createAndOpenDoc()
        return
      }
      const el = document.activeElement
      if (e.key !== 'd' || e.metaKey || e.ctrlKey || e.altKey) return
      if (/INPUT|TEXTAREA/.test(el?.tagName) || el?.isContentEditable) return
      e.preventDefault()
      showDocs()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [createAndOpenDoc, showDocs])
  const getState = useCallback(() => stateRef.current, [])
  const closeSearch = useCallback(() => setSearching(false), [])
  const active = useMemo(() => activeProjects(projects), [projects])

  // While another page is open the hidden list doesn't need to follow every
  // keystroke; it catches up in one render when you come back.
  const listTasks = useRef(null)
  const listDocs = useRef(null)

  if (!state) return null

  const shownTask = view.name === 'task' && findTask(state, view.id)
  const shownDoc = view.name === 'doc' && findDoc(state, view.id)
  // Finishing a project's last task drops it from the switcher, and a filter
  // on a project with nothing left to do falls back to All.
  const filter = active.some((p) => p.name === state.settings.project) ? state.settings.project : null
  const current = shownTask ? 'task' : shownDoc ? 'doc' : view.name === 'task' || view.name === 'doc' ? 'list' : view.name
  if (current === 'list' || !listTasks.current) listTasks.current = state.tasks
  if (current === 'list' || !listDocs.current) listDocs.current = state.docs
  const from = view.from ? prev(view) : null
  const backLabel = !from ? 'Tasks'
    : from.name === 'archive' ? 'Archive'
    : from.name === 'docs' ? 'Docs'
    : from.name === 'task' ? findTask(state, from.id)?.title || 'Task'
    : from.name === 'doc' ? docTitle(findDoc(state, from.id))
    : filter ? displayName(filter) : 'Tasks'
  if (state.settings.project && !filter) queueMicrotask(() => dispatch({ type: 'setting', key: 'project', value: null }))
  const toggleView = (name) => setView(view.name === name ? { name: 'list' } : { name })

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <div className="drag-region" />
        <main className="scroll">
          {/* The list stays mounted underneath other pages, so coming back is
              instant and keeps its scroll position. */}
          <div className={'page list-page' + (current === 'list' ? ' is-shown' : '')} hidden={current !== 'list'}>
            <TaskList
              tasks={listTasks.current}
              projects={projects}
              active={active}
              filter={filter}
              onFilter={setFilter}
              onClearProject={clearProject}
              initialDraft={initialDraft}
              onDraft={setDraft}
              showDone={state.settings.showDone}
              dispatch={dispatch}
              onOpen={openFromList}
              docs={listDocs.current}
              onOpenDoc={openDoc}
              onNewDoc={createAndOpenDoc}
              onShowDocs={showDocs}
              onDelete={deleteTask}
              onArchive={archiveDone}
            />
          </div>
          <AnimatePresence initial={false}>
            {current === 'task' ? (
              <motion.div key={'task-' + shownTask.id} className="page" {...page}>
                <TaskDetail task={shownTask} projects={projects} dispatch={dispatch} onBack={back} backLabel={backLabel} />
              </motion.div>
            ) : current === 'doc' ? (
              <motion.div key={'doc-' + shownDoc.id} className="page" {...page}>
                <DocDetail doc={shownDoc} projects={projects} dispatch={dispatch} onBack={back} backLabel={backLabel} />
              </motion.div>
            ) : current === 'docs' ? (
              <motion.div key="docs" className="page" {...page}>
                <DocsView docs={state.docs} filter={filter} onBack={back} onOpen={openDoc} onNew={createAndOpenDoc} onDelete={deleteDoc} />
              </motion.div>
            ) : current === 'trash' ? (
              <motion.div key="trash" className="page" {...page}>
                <TrashView trash={state.trash} dispatch={dispatch} onBack={toList} />
              </motion.div>
            ) : current === 'archive' ? (
              <motion.div key="archive" className="page" {...page}>
                <ArchiveView archive={state.archive} filter={filter} dispatch={dispatch} onBack={toList} onOpen={openFromArchive} onDelete={deleteTask} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
        <AnimatePresence>
          {searching && <SearchPalette key="palette" getState={getState} onClose={closeSearch} onOpenDoc={openDoc} onOpenTask={openTask} />}
        </AnimatePresence>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <BottomBar
          state={state}
          dispatch={dispatch}
          view={current}
          onTrash={() => toggleView('trash')}
          onArchive={() => toggleView('archive')}
          onDelete={shownTask ? () => deleteTask(shownTask.id) : shownDoc ? () => deleteDoc(shownDoc.id) : null}
        />
      </div>
    </MotionConfig>
  )
}
