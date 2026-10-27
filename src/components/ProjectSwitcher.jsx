import React from 'react'
import { displayName } from '../projects.js'

const Dot = () => <span className="dot">•</span>

export default function ProjectSwitcher({ projects, current, onPick, onClear }) {
  return (
    <nav className="switcher">
      <button type="button" className={current ? '' : 'is-active'} onClick={() => onPick(null)}>All</button>
      {projects.map((p) => (
        <React.Fragment key={p.name}>
          <Dot />
          <span className="switch-item">
            <button type="button" className={current === p.name ? 'is-active' : ''} onClick={() => onPick(p.name)}>
              {displayName(p.name)}
            </button>
            <button type="button" className="switch-clear" title={`Remove #${p.name} from every task`} aria-label={`Remove project ${p.name}`} onClick={() => onClear(p.name)}>
              <svg viewBox="0 0 12 12" width="7" height="7"><path d="M2 2l8 8M10 2l-8 8" /></svg>
            </button>
          </span>
        </React.Fragment>
      ))}
    </nav>
  )
}
