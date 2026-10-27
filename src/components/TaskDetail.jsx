import React, { useEffect, useRef } from 'react'
import Checkbox from './Checkbox.jsx'
import Editor from './Editor.jsx'

const fmt = (ms) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function TaskDetail({ task, dispatch, onBack, backLabel = 'Tasks' }) {
  const title = useRef(null)
  const editor = useRef(null)

  useEffect(() => {
    // Capture phase: the editor swallows Escape, so listen before it does.
    // Escape still closes an open slash menu or link box first.
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('.slash-menu') || document.activeElement?.classList.contains('bubble-input')) return
      onBack()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onBack])

  // Grow the title field with its text.
  useEffect(() => {
    const el = title.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [task.title])

  useEffect(() => {
    if (!task.title) title.current?.focus()
  }, [])

  return (
    <div className="detail">
      <button type="button" className="back" onClick={onBack}>
        <span aria-hidden>←</span> {backLabel}
      </button>

      <div className="detail-head">
        <Checkbox size={24} checked={task.done} onToggle={() => dispatch({ type: 'toggle', id: task.id })} />
        <textarea
          ref={title}
          rows={1}
          className={'detail-title' + (task.done ? ' is-done' : '')}
          value={task.title}
          placeholder="Untitled"
          onChange={(e) => dispatch({ type: 'update', id: task.id, patch: { title: e.target.value.replace(/\n/g, ' ') } })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || (e.key === 'ArrowDown' && e.currentTarget.selectionStart === task.title.length)) {
              e.preventDefault()
              editor.current?.commands.focus('start')
            }
          }}
        />
      </div>

      <div className="meta">
        Created {fmt(task.createdAt)}
        {task.done && task.completedAt ? ` · Done ${fmt(task.completedAt)}` : ''}
      </div>

      <Editor
        key={task.id}
        content={task.body}
        editorRef={editor}
        onChange={(body) => dispatch({ type: 'update', id: task.id, patch: { body } })}
        onExitTop={() => title.current?.focus()}
      />
    </div>
  )
}
