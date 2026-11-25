import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { DocIcon } from './DocLink.jsx'
import { docBridge, docTitle, byEdited } from '../docs.js'
import { displayName } from '../projects.js'

const COMMANDS = [
  { title: 'Text', icon: 'T', hint: 'Plain writing', run: (c) => c.setParagraph() },
  { title: 'Heading 1', icon: 'H1', hint: 'Large heading', run: (c) => c.setNode('heading', { level: 1 }) },
  { title: 'Heading 2', icon: 'H2', hint: 'Medium heading', run: (c) => c.setNode('heading', { level: 2 }) },
  { title: 'Heading 3', icon: 'H3', hint: 'Small heading', run: (c) => c.setNode('heading', { level: 3 }) },
  { title: 'To-do list', icon: '☐', hint: 'Checklist of subtasks', alias: 'todo checkbox subtask', run: (c) => c.toggleTaskList() },
  { title: 'Bulleted list', icon: '•', hint: 'Simple list', alias: 'bullet ul', run: (c) => c.toggleBulletList() },
  { title: 'Numbered list', icon: '1.', hint: 'Ordered list', alias: 'ordered ol', run: (c) => c.toggleOrderedList() },
  { title: 'Quote', icon: '❝', hint: 'Call something out', alias: 'blockquote', run: (c) => c.toggleBlockquote() },
  { title: 'Code', icon: '{}', hint: 'Code block', alias: 'pre', run: (c) => c.toggleCodeBlock() },
  { title: 'Divider', icon: '—', hint: 'Horizontal line', alias: 'hr rule line', run: (c) => c.setHorizontalRule() },
]

const SlashList = forwardRef(function SlashList({ items, command }, ref) {
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') { setIndex((i) => (i + 1) % items.length); return true }
      if (event.key === 'ArrowUp') { setIndex((i) => (i + items.length - 1) % items.length); return true }
      if (event.key === 'Enter' || event.key === 'Tab') { command(items[index]); return true }
      return false
    },
  }))

  if (!items.length) return <div className="slash-menu"><div className="slash-empty">No matches</div></div>

  return (
    <div className="slash-menu" role="listbox">
      {items.map((item, i) => (
        <React.Fragment key={(item.kind || 'cmd') + (item.id || item.title)}>
        {item.kind && !items[i - 1]?.kind && <div className="slash-section">Link a doc</div>}
        <button
          type="button"
          role="option"
          aria-selected={i === index}
          className={'slash-item' + (i === index ? ' is-selected' : '')}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
        >
          <span className="slash-icon">{item.kind ? <DocIcon size={15} /> : item.icon}</span>
          <span className="slash-text">
            <span>{item.kind === 'newDoc' ? `New doc “${item.title}”` : item.title}</span>
            <span className="slash-hint">{item.hint}</span>
          </span>
        </button>
        </React.Fragment>
      ))}
    </div>
  )
})

// Docs in the / menu: the latest few when nothing (or "doc"/"link") is typed,
// otherwise the ones whose name matches, then "New doc" for a name that
// isn't a doc yet.
function docItems(q, blockCount, raw) {
  const self = docBridge.current?.()
  const here = docBridge.project()
  const docs = docBridge.list().filter((d) => d.id !== self)
  const browsing = !q || 'doc'.startsWith(q) || 'docs'.startsWith(q) || 'link'.startsWith(q)
  const matches = docs
    .filter((d) => browsing || docTitle(d).toLowerCase().includes(q))
    .sort((a, b) => (b.project === here) - (a.project === here) || byEdited(a, b))
    .slice(0, browsing ? 3 : 6)
    .map((d) => ({ kind: 'doc', id: d.id, title: docTitle(d), hint: d.project ? displayName(d.project) : 'No project' }))
  const exact = docs.some((d) => docTitle(d).toLowerCase() === q)
  const offerNew = q && !browsing && !exact && !blockCount
  return offerNew ? [...matches, { kind: 'newDoc', title: raw.trim(), hint: 'Make a doc and link it' }] : matches
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        // Spaces are allowed so a doc's full name can be typed ("/launch plan").
        allowSpaces: true,
        placement: 'bottom-start',
        items: ({ query }) => {
          const q = query.toLowerCase().trim()
          const blocks = q.includes(' ') ? [] : COMMANDS.filter((c) => (c.title + ' ' + (c.alias || '')).toLowerCase().includes(q))
          return [...blocks, ...docItems(q, blocks.length, query)]
        },
        command: ({ editor, range, props }) => {
          if (props.kind) {
            const id = props.kind === 'newDoc' ? docBridge.create(props.title, docBridge.project()) : props.id
            if (!id) return
            editor.chain().focus().deleteRange(range)
              .insertContent([{ type: 'docLink', attrs: { id, title: props.title } }, { type: 'text', text: ' ' }])
              .run()
            return
          }
          props.run(editor.chain().focus().deleteRange(range)).run()
        },
        render: () => {
          let component
          let unmount
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashList, { props, editor: props.editor })
              unmount = props.mount(component.element)
            },
            onUpdate: (props) => component?.updateProps(props),
            onKeyDown: (props) => component?.ref?.onKeyDown(props) ?? false,
            onExit: () => {
              unmount?.()
              component?.destroy()
              component = null
            },
          }
        },
      }),
    ]
  },
})
