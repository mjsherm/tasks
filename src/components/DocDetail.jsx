import React, { useEffect, useRef } from 'react'
import Editor from './Editor.jsx'
import ProjectField from './ProjectField.jsx'
import { when } from '../docs.js'

function atLineStart(editor) {
  const el = document.activeElement
  if (el && /INPUT|TEXTAREA/.test(el.tagName)) return el.selectionStart === 0 && el.selectionEnd === 0
  if (el?.isContentEditable && editor) {
    const { empty, $from } = editor.state.selection
    return empty && $from.parentOffset === 0
  }
  return true
}

// A doc reads like a task page without the checkbox: title, a quiet meta
// line, then the same editor.
export default function DocDetail({ doc, projects, dispatch, onBack, backLabel }) {
  const title = useRef(null)
  const editor = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey && !e.shiftKey && !e.altKey && (e.key === '[' || e.key === 'ArrowLeft')) {
        if (e.key === 'ArrowLeft' && !atLineStart(editor.current)) return
        e.preventDefault()
        onBack()
        return
      }
      if (e.key !== 'Escape') return
      const el = document.activeElement
      if (document.querySelector('.slash-menu, .type-panel, .palette') || el?.classList.contains('bubble-input') || el?.classList.contains('project-input')) return
      e.preventDefault()
      onBack()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onBack])

  useEffect(() => {
    const el = title.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [doc.title])

  useEffect(() => {
    if (!doc.title) title.current?.focus()
  }, [])

  return (
    <div className="detail doc-detail">
      <button type="button" className="back" onClick={onBack}>
        <span aria-hidden>←</span> {backLabel}
      </button>

      <textarea
        ref={title}
        rows={1}
        className="detail-title"
        value={doc.title}
        placeholder="Untitled doc"
        onChange={(e) => dispatch({ type: 'updateDoc', id: doc.id, patch: { title: e.target.value.replace(/\n/g, ' ') } })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === 'ArrowDown' && e.currentTarget.selectionStart === doc.title.length)) {
            e.preventDefault()
            // Focus now, not on the next frame, so a fast first keystroke
            // lands in the body instead of the title.
            editor.current?.view.dom.focus()
            editor.current?.commands.focus('start')
          }
        }}
      />

      <div className="meta">
        Edited {when(doc.updatedAt)}
        <ProjectField
          project={doc.project}
          projects={projects}
          onChange={(project) => dispatch({ type: 'updateDoc', id: doc.id, patch: { project } })}
        />
      </div>

      <Editor
        key={doc.id}
        content={doc.body}
        editorRef={editor}
        onChange={(body) => dispatch({ type: 'updateDoc', id: doc.id, patch: { body } })}
        onExitTop={() => title.current?.focus()}
      />
    </div>
  )
}
