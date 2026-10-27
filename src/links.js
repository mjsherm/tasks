// Recognises links to Slack, Gmail and Google Drive so they can be shown as a
// small monochrome logo. Paths are from Simple Icons (CC0).
export const ICONS = {
  slack: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
  gmail: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
  drive: 'M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z',
}

export const URL_RE = /\b(?:https?:\/\/|slack:\/\/)[^\s<>"')]+/gi

export function linkService(href) {
  let url
  try { url = new URL(href) } catch { return null }
  const host = url.hostname.replace(/^www\./, '')
  if (url.protocol === 'slack:' || host === 'slack.com' || host.endsWith('.slack.com'))
    return { service: 'slack', label: /\/archives\/[^/]+\/p\d/.test(url.pathname) ? 'Slack message' : 'Slack' }
  if (host === 'mail.google.com') return { service: 'gmail', label: 'Email' }
  if (host === 'docs.google.com') {
    const kind = url.pathname.split('/')[1]
    const label = { document: 'Doc', spreadsheets: 'Sheet', presentation: 'Slides', forms: 'Form' }[kind] || 'Drive'
    return { service: 'drive', label }
  }
  if (host === 'drive.google.com') return { service: 'drive', label: 'Drive' }
  return null
}

export const iconSvg = (service, size = 13) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${ICONS[service]}"/></svg>`

// Every recognised link in a TipTap JSON body, deduped, in document order.
export function serviceLinks(body) {
  const out = []
  const seen = new Set()
  const walk = (node) => {
    if (!node) return
    for (const mark of node.marks || []) {
      const href = mark.type === 'link' && mark.attrs?.href
      const svc = href && !seen.has(href) && linkService(href)
      if (svc) { seen.add(href); out.push({ href, ...svc }) }
    }
    node.content?.forEach(walk)
  }
  walk(body)
  return out
}

// Splits a task title into text and link parts for display.
export function splitTitle(title) {
  const parts = []
  let last = 0
  for (const m of title.matchAll(URL_RE)) {
    if (m.index > last) parts.push({ text: title.slice(last, m.index) })
    const href = m[0]
    let host = href
    try { host = new URL(href).hostname.replace(/^www\./, '') } catch {}
    parts.push({ href, ...(linkService(href) || { label: host }) })
    last = m.index + href.length
  }
  if (last < title.length) parts.push({ text: title.slice(last) })
  return parts
}

export const openLink = (href) => window.open(href, '_blank', 'noopener')
