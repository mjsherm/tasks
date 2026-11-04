// Letter-level effects for completing (Drift) and deleting (Dissolve) a task.
// Everything runs on the Web Animations API, so the compositor does the work
// and React never re-renders mid-animation. Text nodes are split into
// per-letter spans only for the length of an effect and then put back, so
// React's own DOM is untouched afterwards.

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function gradient(stops) {
  return (t) => {
    const n = stops.length - 1
    const seg = Math.min(n - 1, Math.floor(t * n))
    const k = t * n - seg
    const a = stops[seg], b = stops[seg + 1]
    return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(',')})`
  }
}
const GREEN = gradient([[21, 128, 61], [13, 148, 136], [14, 116, 144]])
const FIRE = gradient([[176, 18, 52], [208, 46, 20], [222, 104, 12]])

const OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SCATTER = 'cubic-bezier(0.4, 0, 0.7, 0.4)'
const GATHER = 'cubic-bezier(0.2, 0.6, 0.3, 1)'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const play = (el, frames, opts) => el.animate(frames, { fill: 'both', ...opts }).finished.catch(() => {})

// Wrap every letter of the title (skipping link chips) in a span.
function split(root) {
  const swaps = []
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3 && child.textContent) {
        const frag = document.createDocumentFragment()
        const spans = [...child.textContent].map((c) => {
          const s = document.createElement('span')
          s.className = 'fx-ch'
          s.textContent = c
          frag.append(s)
          return s
        })
        swaps.push({ text: child, first: spans[0], spans })
        child.replaceWith(frag)
      } else if (child.nodeType === 1 && !child.classList.contains('chip')) {
        walk(child)
      }
    }
  }
  walk(root)
  const chars = swaps.flatMap((s) => s.spans)
  const restore = () => {
    for (const s of swaps) {
      if (!s.first.isConnected) continue
      s.first.replaceWith(s.text)
      s.spans.slice(1).forEach((sp) => sp.remove())
    }
  }
  return { chars, restore }
}

const stagger = (n, max) => Math.min(max, 320 / Math.max(n, 1))
const colourAt = (pick, i, n) => pick(n > 1 ? i / (n - 1) : 0)

async function scatterOut(row, pick) {
  const title = row.querySelector('.strike')
  const { chars } = split(title)
  const n = chars.length
  const per = stagger(n, 14)
  for (const el of row.querySelectorAll('.check, .row-star, .row-tag, .row-delete, .link-logo, .chip, .notes-dot')) {
    play(el, [{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 200, easing: OUT })
  }
  chars.forEach((c, i) => play(c, [{ color: getComputedStyle(c).color }, { color: colourAt(pick, i, n) }], { duration: 200, delay: i * Math.min(per, 7), easing: OUT }))
  await wait(80)
  // Wait for every letter to finish: cutting this short is what made short
  // titles vanish mid-flight (the row is removed as soon as this resolves).
  await Promise.all(chars.map((c, i) => {
    const x = 6 + Math.random() * 14, y = -8 - Math.random() * 16, r = (Math.random() - 0.3) * 40
    return play(c, [
      { transform: 'none', opacity: 1, filter: 'blur(0px)' },
      { transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(0.8)`, opacity: 0, filter: 'blur(1.5px)' },
    ], { duration: 460, delay: i * per, easing: SCATTER })
  }))
}

// Completing: the letters turn green and blow away out of the open list.
export async function driftOut(row) {
  if (!row || reduce()) return
  row.classList.add('fx-busy')
  await scatterOut(row, GREEN)
}

// ...and drift back together in Done, then cool to grey as the line draws.
// Unchecking a done task runs the same thing in reverse: it blows out of Done
// and drifts back into the open list, settling to normal ink.
export async function driftIn(row, { done = true } = {}) {
  if (!row || reduce()) return
  row.classList.add('fx-busy')
  if (done) row.classList.add('fx-arriving')
  const title = row.querySelector('.strike')
  const { chars, restore } = split(title)
  const n = chars.length
  const per = stagger(n, 12)
  const check = row.querySelector('.check')
  if (check) play(check, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { duration: 360, delay: 120, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })
  const anims = chars.map((c, i) => {
    const x = -6 - Math.random() * 14, y = 8 + Math.random() * 14, r = (Math.random() - 0.7) * 40
    const col = colourAt(GREEN, i, n)
    return c.animate([
      { transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(0.8)`, opacity: 0, filter: 'blur(1.5px)', color: col },
      { transform: 'none', opacity: 1, filter: 'blur(0px)', color: col },
    ], { duration: 420, delay: 80 + i * per, easing: GATHER, fill: 'both' })
  })
  await wait(80 + n * per + 380)
  row.classList.remove('fx-arriving') // the strike line draws via its CSS transition
  chars.forEach((c, i) => {
    const col = colourAt(GREEN, i, n)
    anims[i].cancel()
    play(c, [{ color: col }, { color: done ? 'var(--faint)' : 'var(--ink)' }], { duration: 450, delay: i * Math.min(per, 5), easing: OUT })
  })
  await wait(n * Math.min(per, 5) + 460)
  chars.forEach((c) => c.getAnimations().forEach((a) => a.cancel()))
  if (check) check.getAnimations().forEach((a) => a.cancel())
  restore()
  row.classList.remove('fx-busy')
}

// Deleting: the letters heat up red-to-orange and blow away like embers.
export async function dissolve(row) {
  if (!row || reduce()) return
  row.classList.add('fx-busy')
  await scatterOut(row, FIRE)
}
