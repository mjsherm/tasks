// Projects are plain #tags on tasks. A project exists while any task uses it.
const TAG = /(^|\s)#([\p{L}\p{N}_-]+)/u

export const normalize = (name) => (name || '').trim().replace(/^#/, '').toLowerCase() || null

export const displayName = (name) => name.charAt(0).toUpperCase() + name.slice(1)

// "Send deck #launch" -> { title: 'Send deck', project: 'launch' }
export function parseTitle(text) {
  const m = text.match(TAG)
  if (!m) return { title: text.trim(), project: null }
  const title = (text.slice(0, m.index) + m[1] + text.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim()
  return { title, project: normalize(m[2]) }
}

// The "#partial" being typed right before the caret, if any.
export function tagAtCaret(text, caret) {
  const m = text.slice(0, caret).match(/(?:^|\s)#([\p{L}\p{N}_-]*)$/u)
  return m ? { query: m[1].toLowerCase(), start: caret - m[1].length - 1 } : null
}

// Every project in use, most used first, with open-task counts.
export function listProjects(tasks, archive = []) {
  const counts = new Map()
  for (const t of tasks) if (t.project) counts.set(t.project, (counts.get(t.project) || 0) + (t.done ? 0 : 1))
  for (const t of archive) if (t.project && !counts.has(t.project)) counts.set(t.project, 0)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, open]) => ({ name, open }))
}

// Projects worth showing in the switcher: the ones with something left to do.
export const activeProjects = (projects) => projects.filter((p) => p.open > 0)

export function suggest(projects, query) {
  const matches = projects.filter((p) => p.name.startsWith(query)).slice(0, 5)
  const exact = projects.some((p) => p.name === query)
  return query && !exact ? [...matches, { name: query, isNew: true }] : matches
}
