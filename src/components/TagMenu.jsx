import React from 'react'
import { displayName } from '../projects.js'

// The # suggestion menu, styled like the slash menu. Keyboard handling lives
// with whichever input owns it.
export default function TagMenu({ items, index, onPick, onHover, style }) {
  if (!items.length) return null
  return (
    <div className="slash-menu tag-menu" role="listbox" style={style}>
      {items.map((p, i) => (
        <button
          key={(p.isNew ? 'new:' : '') + p.name}
          type="button"
          role="option"
          aria-selected={i === index}
          className={'slash-item' + (i === index ? ' is-selected' : '')}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => { e.preventDefault(); onPick(p) }}
        >
          <span className="slash-text">
            <span>{p.isNew ? `New project “${p.name}”` : displayName(p.name)}</span>
            <span className="slash-hint">
              {p.isNew ? 'Create' : p.open ? `${p.open} to do` : 'Nothing open'}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

// Moves through the menu with the arrow keys and picks with Enter or Tab.
// Returns true when it handled the key.
export function menuKeys(e, items, index, setIndex, pick) {
  if (!items.length) return false
  if (e.key === 'ArrowDown') { setIndex((index + 1) % items.length); return true }
  if (e.key === 'ArrowUp') { setIndex((index + items.length - 1) % items.length); return true }
  if (e.key === 'Enter' || e.key === 'Tab') { pick(items[index]); return true }
  return false
}
