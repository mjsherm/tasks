import test from 'node:test'
import assert from 'node:assert'
import { parseTitle, tagAtCaret, listProjects, suggest } from '../src/projects.js'
import { reducer, hydrate } from '../src/state.js'

test('parses a #tag out of a title', () => {
  assert.deepEqual(parseTitle('Send deck #launch'), { title: 'Send deck', project: 'launch' })
  assert.deepEqual(parseTitle('#Home fix gutter'), { title: 'fix gutter', project: 'home' })
  assert.deepEqual(parseTitle('Pay invoice'), { title: 'Pay invoice', project: null })
  assert.deepEqual(parseTitle('Ticket C#5 thing'), { title: 'Ticket C#5 thing', project: null })
})

test('finds the tag being typed at the caret', () => {
  assert.deepEqual(tagAtCaret('Book venue #la', 14), { query: 'la', start: 11 })
  assert.deepEqual(tagAtCaret('Book #', 6), { query: '', start: 5 })
  assert.equal(tagAtCaret('Book venue', 10), null)
})

test('lists and suggests projects', () => {
  const tasks = [{ project: 'launch' }, { project: 'launch' }, { project: 'home', done: true }, {}]
  const projects = listProjects(tasks)
  assert.deepEqual(projects.map((p) => p.name), ['launch', 'home'])
  assert.deepEqual(suggest(projects, 'la').map((p) => p.name), ['launch', 'la'])
  assert.deepEqual(suggest(projects, 'launch').map((p) => p.name), ['launch'])
})

test('reordering a filtered subset keeps other tasks in place', () => {
  let s = hydrate({ tasks: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, title: id, project: i % 2 ? 'x' : null })) })
  s = reducer(s, { type: 'reorder', ids: ['d', 'b'] })
  assert.deepEqual(s.tasks.map((t) => t.id), ['a', 'd', 'c', 'b'])
})

test('clearing a project can be undone', () => {
  let s = hydrate({ tasks: [{ id: '1', project: 'x' }, { id: '2', project: 'y' }], archive: [{ id: '3', project: 'x' }], settings: { project: 'x' } })
  s = reducer(s, { type: 'clearProject', name: 'x' })
  assert.equal(s.tasks[0].project, null)
  assert.equal(s.archive[0].project, null)
  assert.equal(s.settings.project, null)
  s = reducer(s, { type: 'restoreProject', name: 'x', ids: ['1', '3'] })
  assert.equal(s.tasks[0].project, 'x')
  assert.equal(s.archive[0].project, 'x')
})
