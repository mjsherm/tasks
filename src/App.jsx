import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { api, createSaver } from './api.js'
import { reducer, findTask } from './state.js'
import TaskList from './components/TaskList.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import TrashView from './components/TrashView.jsx'
import ArchiveView from './components/ArchiveView.jsx'
import BottomBar from './components/BottomBar.jsx'
import Toast from './components/Toast.jsx'

const FONTS = {
  Lato: "'Lato', -apple-system, sans-serif",
  Arial: 'Arial, Helvetica, sans-serif',
  System: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  Serif: "'Times New Roman', Georgia, serif",
}

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
    root.style.setProperty('--font', FONTS[settings.font] || FONTS.Lato)
    root.style.setProperty('--size', settings.fontSize + 'px')
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

  // While another page is open the hidden list doesn't need to follow every
  // keystroke; it catches up in one render when you come back.
  const listTasks = useRef(null)

  if (!state) return null

  const openTask = view.name === 'task' && findTask(state, view.id)
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
                <TaskDetail task={openTask} dispatch={dispatch} onBack={back} backLabel={view.from === 'archive' ? 'Archive' : 'Tasks'} />
              </motion.div>
            ) : current === 'trash' ? (
              <motion.div key="trash" className="page" {...page}>
                <TrashView trash={state.trash} dispatch={dispatch} onBack={toList} />
              </motion.div>
            ) : current === 'archive' ? (
              <motion.div key="archive" className="page" {...page}>
                <ArchiveView archive={state.archive} dispatch={dispatch} onBack={toList} onOpen={openFromArchive} onDelete={deleteTask} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <BottomBar
          state={state}
          dispatch={dispatch}
          fonts={Object.keys(FONTS)}
          view={current}
          onTrash={() => toggleView('trash')}
          onArchive={() => toggleView('archive')}
          onDelete={openTask ? () => deleteTask(openTask.id) : null}
        />
      </div>
    </MotionConfig>
  )
}
