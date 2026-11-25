import test from 'node:test'
import assert from 'node:assert'
import { reducer, hydrate } from '../src/state.js'
import { listProjects, activeProjects } from '../src/projects.js'
import { plainText, snippet, docLinks, search } from '../src/docs.js'

const body = (...lines) => ({ type: 'doc', content: lines.map((l) => ({ type: 'paragraph', content: typeof l === 'string' ? [{ type: 'text', text: l }] : l })) })

test('old saves load with an empty doc list', () => {
  assert.deepEqual(hydrate({ tasks: [] }).docs, [])
})

test('docs can be added, edited, deleted and restored', () => {
  let s = hydrate({})
  s = reducer(s, { type: 'addDoc', id: 'd1', title: 'Plan', project: 'launch' })
  assert.equal(s.docs[0].title, 'Plan')
  s = reducer(s, { type: 'updateDoc', id: 'd1', patch: { body: body('hello') } })
  assert.equal(plainText(s.docs[0].body), 'hello')
  s = reducer(s, { type: 'deleteDoc', id: 'd1' })
  assert.equal(s.docs.length, 0)
  assert.equal(s.trash[0].kind, 'doc')
  s = reducer(s, { type: 'restore', id: 'd1' })
  assert.equal(s.docs[0].id, 'd1')
  assert.equal(s.docs[0].kind, undefined)
  assert.equal(s.tasks.length, 0)
})

test('a project with only docs stays in the switcher', () => {
  const projects = listProjects([], [], [{ project: 'notes' }, { project: 'notes' }])
  assert.deepEqual(activeProjects(projects), [{ name: 'notes', open: 0, docs: 2 }])
})

test('clearing a project clears it from docs too, with undo', () => {
  let s = hydrate({ docs: [{ id: 'd', project: 'x' }] })
  s = reducer(s, { type: 'clearProject', name: 'x' })
  assert.equal(s.docs[0].project, null)
  s = reducer(s, { type: 'restoreProject', name: 'x', ids: ['d'] })
  assert.equal(s.docs[0].project, 'x')
})

test('finds [[doc links]] in a task body', () => {
  const b = body(['See ', { type: 'docLink', attrs: { id: 'a', title: 'A' } }, { type: 'docLink', attrs: { id: 'a', title: 'A' } }], [{ type: 'docLink', attrs: { id: 'b' } }])
  assert.deepEqual(docLinks(b), ['a', 'b'])
  assert.equal(snippet(body('one', 'two')), 'one · two')
})

test('search finds tasks and docs together, titles first', () => {
  const s = hydrate({
    tasks: [{ id: 't1', title: 'Decide on pricing tiers', updatedAt: 1 }, { id: 't2', title: 'Other', body: body('ask about pricing'), updatedAt: 2 }],
    docs: [{ id: 'd1', title: 'Launch plan', body: body('Lock pricing first'), updatedAt: 3 }, { id: 'd2', title: 'Pricing', updatedAt: 1 }],
  })
  const r = search(s, 'pricing')
  assert.deepEqual(r.docs.map((x) => x.item.id), ['d2', 'd1'])
  assert.deepEqual(r.tasks.map((x) => x.item.id), ['t1', 't2'])
  assert.match(r.docs[1].context, /Lock pricing first/)
  assert.deepEqual(search(s, '  '), { docs: [], tasks: [] })
})
