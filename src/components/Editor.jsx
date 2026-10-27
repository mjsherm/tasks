import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Extension } from '@tiptap/core'
import { SlashCommand } from './SlashMenu.jsx'

export default function Editor({ content, onChange, editorRef, onExitTop }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === 'heading' ? `Heading ${node.attrs.level}` : "Write anything. Type '/' for blocks…",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      SlashCommand,
      // Arrow up / backspace at the very top hands focus back to the title.
      Extension.create({
        name: 'exitTop',
        addKeyboardShortcuts: () => ({
          ArrowUp: ({ editor }) => {
            const { from, empty } = editor.state.selection
            if (empty && from <= 1) { onExitTop?.(); return true }
            return false
          },
          Backspace: ({ editor }) => {
            const { from, empty } = editor.state.selection
            if (empty && from <= 1 && editor.isEmpty) { onExitTop?.(); return true }
            return false
          },
        }),
      }),
    ],
    content: content || '',
    editorProps: { attributes: { class: 'prose', spellcheck: 'true' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  useEffect(() => {
    if (editorRef) editorRef.current = editor
  }, [editor, editorRef])

  const [linking, setLinking] = useState(false)

  if (!editor) return null

  const mark = (name, label, run) => (
    <button
      type="button"
      className={editor.isActive(name) ? 'is-active' : ''}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(editor.chain().focus()).run()}
    >
      {label}
    </button>
  )

  return (
    <div className="editor" onClick={(e) => { if (e.target === e.currentTarget) editor.commands.focus('end') }}>
      <BubbleMenu editor={editor} className="bubble">
        {mark('bold', <b>B</b>, (c) => c.toggleBold())}
        {mark('italic', <i>i</i>, (c) => c.toggleItalic())}
        {mark('strike', <s>S</s>, (c) => c.toggleStrike())}
        {mark('code', <code>{'<>'}</code>, (c) => c.toggleCode())}
        <span className="bubble-sep" />
        {linking ? (
          <input
            autoFocus
            className="bubble-input"
            placeholder="Paste a link…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const href = e.currentTarget.value.trim()
                if (href) editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
                setLinking(false)
              }
              if (e.key === 'Escape') { e.preventDefault(); setLinking(false); editor.commands.focus() }
            }}
            onBlur={() => setLinking(false)}
          />
        ) : (
          <button
            type="button"
            className={editor.isActive('link') ? 'is-active' : ''}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => (editor.isActive('link') ? editor.chain().focus().unsetLink().run() : setLinking(true))}
          >
            Link
          </button>
        )}
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  )
}
