import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import { docBridge, docTitle, byEdited } from '../docs.js'
import { displayName } from '../projects.js'

export const DOC_ICON =
  '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true" class="doc-icon"><path d="M5 2.5h6.5L15.5 6.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"/><path d="M11.5 2.5v4h4"/><path d="M7.5 10h5M7.5 13h5"/></svg>'

export const DocIcon = ({ size = 13 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="doc-icon">
    <path d="M5 2.5h6.5L15.5 6.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z" />
    <path d="M11.5 2.5v4h4" />
    <path d="M7.5 10h5M7.5 13h5" />
  </svg>
)

const DocMenu = forwardRef(function DocMenu({ items, command }, ref) {
  const [index, setIndex] = useState(0)
  useEffect(() => setIndex(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') { setIndex((i) => (i + 1) % items.length); return true }
      if (event.key === 'ArrowUp') { setIndex((i) => (i + items.length - 1) % items.length); return true }
      if (event.key === 'Enter') { command(items[index]); return true }
      // Tab makes a new doc from what you typed, like it does for #projects.
      if (event.key === 'Tab') { command(items.find((i) => i.isNew) || items[index]); return true }
      return false
    },
  }))

  if (!items.length) return null
  return (
    <div className="slash-menu doc-menu" role="listbox">
      {items.map((item, i) => (
        <button
          key={item.isNew ? 'new' : item.id}
          type="button"
          role="option"
          aria-selected={i === index}
          className={'slash-item' + (i === index ? ' is-selected' : '')}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
        >
          {!item.isNew && <span className="doc-menu-icon"><DocIcon size={14} /></span>}
          <span className="slash-text">
            <span>{item.isNew ? `New doc “${item.title}”` : docTitle(item)}</span>
            <span className="slash-hint">{item.isNew ? 'Tab' : item.project ? displayName(item.project) : 'No project'}</span>
          </span>
        </button>
      ))}
    </div>
  )
})

// An inline chip that points at a doc. It shows the doc's current title, so
// renaming a doc updates every link to it.
export const DocLink = Node.create({
  name: 'docLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return { id: { default: null }, title: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'a[data-doc-id]', getAttrs: (el) => ({ id: el.getAttribute('data-doc-id'), title: el.textContent }) }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { 'data-doc-id': node.attrs.id, class: 'doc-chip' }), node.attrs.title]
  },

  renderText({ node }) {
    return node.attrs.title
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('a')
      dom.className = 'doc-chip'
      dom.contentEditable = 'false'
      const doc = docBridge.list().find((d) => d.id === node.attrs.id)
      if (!doc) dom.classList.add('is-missing')
      dom.innerHTML = DOC_ICON
      const label = document.createElement('span')
      label.textContent = doc ? docTitle(doc) : node.attrs.title || 'Deleted doc'
      dom.appendChild(label)
      dom.title = doc ? 'Open doc' : 'This doc was deleted'
      dom.addEventListener('mousedown', (e) => e.preventDefault())
      dom.addEventListener('click', (e) => {
        e.preventDefault()
        if (doc) docBridge.open(node.attrs.id)
      })
      return { dom }
    }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('docLinkSuggestion'),
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        placement: 'bottom-start',
        items: ({ query }) => {
          const q = query.replace(/\]+$/, '').trim()
          const self = docBridge.current?.()
          const docs = docBridge.list().filter((d) => d.id !== self)
          const matches = docs
            .filter((d) => docTitle(d).toLowerCase().includes(q.toLowerCase()))
            .sort((a, b) => {
              const here = docBridge.project()
              return (b.project === here) - (a.project === here) || byEdited(a, b)
            })
            .slice(0, 6)
          const exact = docs.some((d) => docTitle(d).toLowerCase() === q.toLowerCase())
          return q && !exact ? [...matches, { isNew: true, title: q }] : matches
        },
        command: ({ editor, range, props }) => {
          let { id, title } = props
          if (props.isNew) id = docBridge.create(title, docBridge.project())
          else title = docTitle(props)
          if (!id) return
          editor.chain().focus().deleteRange(range)
            .insertContent([{ type: 'docLink', attrs: { id, title } }, { type: 'text', text: ' ' }])
            .run()
        },
        render: () => {
          let component
          let unmount
          return {
            onStart: (props) => {
              component = new ReactRenderer(DocMenu, { props, editor: props.editor })
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
