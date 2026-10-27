import React, { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { api, createSaver } from './api.js'
import { reducer, findTask } from './state.js'
import { listProjects } from './projects.js'
import { applyTypography } from './typography.js'
import TaskList from './components/TaskList.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import TrashView from './components/TrashView.jsx'
import ArchiveView from './components/ArchiveView.jsx'
import BottomBar from './components/BottomBar.jsx'
import Toast from './components/Toast.jsx'


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

  const deleteTask = useCallback((id) => {
    dispatch({ type: 'delete', id })
    setView((v) => (v.name === 'task' ? { name: v.from || 'list' } : v))
    showToast('Deleted', () => dispatch({ type: 'restore', id }))
  }, [showToast])

  const archiveDone = useCallback((ids) => {
    dispatch({ type: 'archiveDone' })
    showToast(`Archived ${ids.length} ${ids.length === 1 ? 'task' : 'tasks'}`, () => dispatch({ type: 'unarchive', ids }))
  }, [showToast])

  const openFromList = useCallback((id) => setView({ name: 'task', id, from: 'list' }), [])
  const openFromArchive = useCallback((id) => setView({ name: 'task', id, from: 'archive' }), [])
  const back = useCallback(() => setView((v) => ({ name: v.from || 'list' })), [])
  const toList = useCallback(() => setView({ name: 'list' }), [])
  const setDraft = useCallback((text) => saver.current.setDraft(text), [])
  const setFilter = useCallback((project) => dispatch({ type: 'setting', key: 'project', value: project }), [])
  const stateRef = useRef(state)
  stateRef.current = state
  const clearProject = useCallback((name) => {
    const { tasks, archive } = stateRef.current
    const ids = [...tasks, ...archive].filter((t) => t.project === name).map((t) => t.id)
    dispatch({ type: 'clearProject', name })
    showToast(`Removed #${name}`, () => dispatch({ type: 'restoreProject', name, ids }))
  }, [showToast])
  // Same array back while the project list is unchanged, so typing in a note
  // doesn't re-render the list or the switcher.
  const projectsRef = useRef([])
  const projects = useMemo(() => {
    const next = state ? listProjects(state.tasks, state.archive) : []
    const same = next.length === projectsRef.current.length &&
      next.every((p, i) => p.name === projectsRef.current[i].name && p.open === projectsRef.current[i].open)
    if (!same) projectsRef.current = next
    return projectsRef.current
  }, [state?.tasks, state?.archive])

  // While another page is open the hidden list doesn't need to follow every
  // keystroke; it catches up in one render when you come back.
  const listTasks = useRef(null)

  if (!state) return null

  const openTask = view.name === 'task' && findTask(state, view.id)
  // A filter whose project no longer exists falls back to All.
  const filter = projects.some((p) => p.name === state.settings.project) ? state.settings.project : null
  const current = openTask ? 'task' : view.name === 'task' ? 'list' : view.name
  if (current === 'list' || !listTasks.current) listTasks.current = state.tasks
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
              filter={filter}
              onFilter={setFilter}
              onClearProject={clearProject}
              initialDraft={initialDraft}
              onDraft={setDraft}
              showDone={state.settings.showDone}
              dispatch={dispatch}
              onOpen={openFromList}
              onDelete={deleteTask}
              onArchive={archiveDone}
            />
          </div>
          <AnimatePresence initial={false}>
            {current === 'task' ? (
              <motion.div key={'task-' + openTask.id} className="page" {...page}>
                <TaskDetail task={openTask} projects={projects} dispatch={dispatch} onBack={back} backLabel={view.from === 'archive' ? 'Archive' : 'Tasks'} />
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
        <Toast toast={toast} onClose={() => setToast(null)} />
        <BottomBar
          state={state}
          dispatch={dispatch}
          view={current}
          onTrash={() => toggleView('trash')}
          onArchive={() => toggleView('archive')}
          onDelete={openTask ? () => deleteTask(openTask.id) : null}
        />
      </div>
    </MotionConfig>
  )
}
