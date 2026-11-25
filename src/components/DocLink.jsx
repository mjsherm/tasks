import React from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { docBridge, docTitle } from '../docs.js'

export const DOC_ICON =
  '<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true" class="doc-icon"><path d="M5 2.5h6.5L15.5 6.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"/><path d="M11.5 2.5v4h4"/><path d="M7.5 10h5M7.5 13h5"/></svg>'

export const DocIcon = ({ size = 13 }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" className="doc-icon">
    <path d="M5 2.5h6.5L15.5 6.5V17a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z" />
    <path d="M11.5 2.5v4h4" />
    <path d="M7.5 10h5M7.5 13h5" />
  </svg>
)

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
})
