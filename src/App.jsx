import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api, createSaver } from './api.js'
import { reducer, hydrate } from './state.js'
import TaskList from './components/TaskList.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import TrashView from './components/TrashView.jsx'
import BottomBar from './components/BottomBar.jsx'
import Toast from './components/Toast.jsx'

const FONTS = {
  Lato: "'Lato', -apple-system, sans-serif",
  Arial: 'Arial, Helvetica, sans-serif',
  System: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  Serif: "'Times New Roman', Georgia, serif",
}

const page = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null)
  const [view, setView] = useState({ name: 'list' })
  const [toast, setToast] = useState(null)
  const saver = useRef(null)
  if (!saver.current) saver.current = createSaver()

  useEffect(() => {
    api.load().then((data) => dispatch({ type: '@load', data }))
  }, [])

  useEffect(() => {
    if (state) saver.current.save(state)
  }, [state])

  useEffect(() => {
    const flush = () => saver.current.flushSync()
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  const settings = state?.settings
  useEffect(() => {
    if (!settings) return
    const root = document.documentElement
    root.dataset.theme = settings.theme
    root.style.setProperty('--font', FONTS[settings.font] || FONTS.Lato)
    root.style.setProperty('--size', settings.fontSize + 'px')
  }, [settings])

  const deleteTask = useCallback((id) => {
    dispatch({ type: 'delete', id })
    setView({ name: 'list' })
    setToast({ key: Date.now(), text: 'Moved to trash', action: 'Undo', onAction: () => dispatch({ type: 'restore', id }) })
  }, [])

  if (!state) return null

  const openTask = view.name === 'task' && state.tasks.find((t) => t.id === view.id)

  return (
    <div className="app">
      <div className="drag-region" />
      <main className="scroll">
        <AnimatePresence mode="wait" initial={false}>
          {openTask ? (
            <motion.div key={'task-' + openTask.id} className="page" {...page}>
              <TaskDetail
                task={openTask}
                dispatch={dispatch}
                onBack={() => setView({ name: 'list' })}
              />
            </motion.div>
          ) : view.name === 'trash' ? (
            <motion.div key="trash" className="page" {...page}>
              <TrashView trash={state.trash} dispatch={dispatch} onBack={() => setView({ name: 'list' })} />
            </motion.div>
          ) : (
            <motion.div key="list" className="page" {...page}>
              <TaskList
                tasks={state.tasks}
                draft={state.draft}
                showDone={state.settings.showDone}
                dispatch={dispatch}
                onOpen={(id) => setView({ name: 'task', id })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <BottomBar
        state={state}
        dispatch={dispatch}
        fonts={Object.keys(FONTS)}
        view={openTask ? 'task' : view.name}
        onTrash={() => setView(view.name === 'trash' ? { name: 'list' } : { name: 'trash' })}
        onDelete={openTask ? () => deleteTask(openTask.id) : null}
      />
    </div>
  )
}
