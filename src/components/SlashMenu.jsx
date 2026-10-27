import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'

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
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === index}
          className={'slash-item' + (i === index ? ' is-selected' : '')}
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => command(item)}
        >
          <span className="slash-icon">{item.icon}</span>
          <span className="slash-text">
            <span>{item.title}</span>
            <span className="slash-hint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
})

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        placement: 'bottom-start',
        items: ({ query }) => {
          const q = query.toLowerCase()
          return COMMANDS.filter((c) => (c.title + ' ' + (c.alias || '')).toLowerCase().includes(q))
        },
        command: ({ editor, range, props }) => {
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
