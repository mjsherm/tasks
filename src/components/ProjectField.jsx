import React, { useState } from 'react'
import TagMenu, { menuKeys } from './TagMenu.jsx'
import { normalize, suggest } from '../projects.js'

const X = () => <svg viewBox="0 0 12 12" width="7" height="7"><path d="M2 2l8 8M10 2l-8 8" /></svg>

// "#launch ×" under a task's title. Click the tag to change it.
export default function ProjectField({ project, projects, onChange }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [index, setIndex] = useState(0)
  const items = editing ? suggest(projects, normalize(text) || '') : []

  const start = () => { setText(project || ''); setIndex(0); setEditing(true) }
  const finish = (name) => {
    setEditing(false)
    onChange(normalize(name))
  }

  if (editing) {
    return (
      <span className="project-field is-editing">
        {'\u00a0· #'}
        <input
          autoFocus
          className="project-input"
          value={text}
          placeholder="project"
          size={Math.max(7, text.length + 1)}
          onChange={(e) => { setText(e.target.value.replace(/[\s#]/g, '')); setIndex(0) }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEditing(false); return }
            if (menuKeys(e, items, index, setIndex, (p) => finish(p.name))) { e.preventDefault(); return }
            if (e.key === 'Enter') { e.preventDefault(); finish(text) }
          }}
          onBlur={() => setEditing(false)}
        />
        <TagMenu items={items} index={index} onHover={setIndex} onPick={(p) => finish(p.name)} style={{ position: 'absolute', left: 0, top: '1.8em' }} />
      </span>
    )
  }

  if (!project) {
    return <button type="button" className="project-field add" onClick={start}>{'\u00a0· Add to a project'}</button>
  }
  return (
    <span className="project-field">
      {'\u00a0· '}
      <button type="button" className="project-tag" onClick={start}>#{project}</button>
      <button type="button" className="tag-clear" title="Remove from project" aria-label="Remove from project" onClick={() => onChange(null)}><X /></button>
    </span>
  )
}
