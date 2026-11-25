// Helpers shared by the docs shelf, the docs list, [[doc links]] and ⌘K search.

// All the text in a TipTap JSON body, one line per block.
export function plainText(body) {
  if (!body) return ''
  const out = []
  let line = ''
  const walk = (node) => {
    if (!node) return
    if (node.type === 'text') line += node.text
    else if (node.type === 'docLink') line += node.attrs?.title || ''
    else if (node.type === 'hardBreak') line += ' '
    node.content?.forEach(walk)
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'codeBlock') {
      if (line.trim()) out.push(line.trim())
      line = ''
    }
  }
  walk(body)
  if (line.trim()) out.push(line.trim())
  return out.join('\n')
}

// First bit of a doc, for the list under its title.
export const snippet = (body, max = 90) => {
  const text = plainText(body).replace(/\n+/g, ' · ')
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

// Ids of the docs a task (or doc) links to with [[ ]], in order, deduped.
export function docLinks(body) {
  const out = []
  const walk = (node) => {
    if (!node) return
    if (node.type === 'docLink' && node.attrs?.id && !out.includes(node.attrs.id)) out.push(node.attrs.id)
    node.content?.forEach(walk)
  }
  walk(body)
  return out
}

// "today", "Mon", "Nov 18"
export function when(ms) {
  const d = new Date(ms)
  const now = new Date()
  const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const docTitle = (doc) => doc?.title?.trim() || 'Untitled'

// Most recently edited first.
export const byEdited = (a, b) => b.updatedAt - a.updatedAt

// Search tasks and docs together. Titles count for more than body text, and
// a match at the start of a word beats one in the middle.
export function search(state, query, limit = 6) {
  const q = query.trim().toLowerCase()
  if (!q) return { docs: [], tasks: [] }
  const score = (title, text) => {
    const t = title.toLowerCase()
    const i = t.indexOf(q)
    if (i === 0) return 100
    if (i > 0) return /\s/.test(t[i - 1]) ? 80 : 60
    const b = text.toLowerCase()
    const j = b.indexOf(q)
    if (j < 0) return 0
    return j === 0 || /\s/.test(b[j - 1]) ? 40 : 20
  }
  const hit = (item, kind) => {
    const text = plainText(item.body)
    const s = score(item.title || '', text)
    if (!s) return null
    // Where the match is in the body, with a little context around it.
    let context = ''
    const j = text.toLowerCase().indexOf(q)
    if (j >= 0) {
      const start = Math.max(0, j - 30)
      context = (start ? '…' : '') + text.slice(start, j + q.length + 50).replace(/\n+/g, ' · ')
    }
    return { kind, item, score: s, context }
  }
  const rank = (a, b) => b.score - a.score || (b.item.updatedAt || 0) - (a.item.updatedAt || 0)
  const docs = state.docs.map((d) => hit(d, 'doc')).filter(Boolean).sort(rank).slice(0, limit)
  const tasks = [...state.tasks, ...state.archive]
    .map((t) => hit(t, 'task'))
    .filter(Boolean)
    // Open tasks before finished ones at the same score.
    .sort((a, b) => rank(a, b) || (a.item.done ? 1 : 0) - (b.item.done ? 1 : 0))
    .slice(0, limit)
  return { docs, tasks }
}

// The editor's [[ menu and doc-link chips live outside React's tree, so the
// app hands them what they need here.
export const docBridge = {
  list: () => [],
  create: (title, project) => null,
  open: (id) => {},
  project: () => null,
}
