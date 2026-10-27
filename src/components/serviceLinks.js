import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { linkService, iconSvg, openLink } from '../links.js'

const key = new PluginKey('serviceLinks')

const linkOf = (node) => node?.marks.find((m) => m.type.name === 'link')

// A clickable logo in front of every Slack / Gmail / Drive link.
function decorate(doc) {
  const decos = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const link = linkOf(node)
    const svc = link && linkService(link.attrs.href)
    if (!svc) return
    const prev = linkOf(doc.resolve(pos).nodeBefore)
    if (prev && prev.attrs.href === link.attrs.href) return
    const href = link.attrs.href
    decos.push(
      Decoration.widget(
        pos,
        () => {
          const el = document.createElement('span')
          el.className = 'link-logo'
          el.title = href
          el.contentEditable = 'false'
          el.innerHTML = iconSvg(svc.service)
          el.addEventListener('mousedown', (e) => {
            e.preventDefault()
            openLink(href)
          })
          return el
        },
        { side: -1, key: svc.service + href, ignoreSelection: true },
      ),
    )
  })
  return DecorationSet.create(doc, decos)
}

export const ServiceLinks = Extension.create({
  name: 'serviceLinks',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => decorate(doc),
          apply: (tr, old) => (tr.docChanged ? decorate(tr.doc) : old),
        },
        props: {
          decorations: (state) => key.getState(state),
          // Pasting a bare Slack / Gmail / Drive URL inserts a short labelled
          // link ("Slack message", "Doc") instead of the long address.
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')?.trim()
            if (!text || /\s/.test(text) || !view.state.selection.empty) return false
            const svc = linkService(text)
            if (!svc) return false
            const { schema, tr } = view.state
            tr.replaceSelectionWith(schema.text(svc.label, [schema.marks.link.create({ href: text })]), false)
            tr.insert(tr.selection.from, schema.text(' '))
            tr.removeStoredMark(schema.marks.link)
            view.dispatch(tr.scrollIntoView())
            return true
          },
          // Cmd/Ctrl-click opens any link.
          handleClick(view, pos, event) {
            if (!(event.metaKey || event.ctrlKey)) return false
            const link = linkOf(view.state.doc.resolve(pos).nodeAfter) || linkOf(view.state.doc.resolve(pos).nodeBefore)
            if (!link) return false
            openLink(link.attrs.href)
            return true
          },
        },
      }),
    ]
  },
})
