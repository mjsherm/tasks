const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { Store } = require('../electron/store.cjs')

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-store-'))
const sample = (title) => ({ version: 1, tasks: [{ id: '1', title }], trash: [], settings: {} })

test('round-trips data', () => {
  const s = new Store(tmpDir())
  s.save(sample('hello'))
  assert.equal(s.load().tasks[0].title, 'hello')
})

test('returns defaults when nothing is saved', () => {
  const s = new Store(tmpDir())
  assert.deepEqual(s.load().tasks, [])
  assert.equal(s.load().settings.font, 'Lato')
})

test('keeps the previous version as .bak', () => {
  const s = new Store(tmpDir())
  s.save(sample('one'))
  s.save(sample('two'))
  assert.equal(JSON.parse(fs.readFileSync(s.bak, 'utf8')).tasks[0].title, 'one')
})

test('falls back to .bak and preserves a corrupt main file', () => {
  const s = new Store(tmpDir())
  s.save(sample('one'))
  s.save(sample('two'))
  fs.writeFileSync(s.file, '{"tasks": [ truncated')
  assert.equal(s.load().tasks[0].title, 'one')
  assert.ok(fs.readdirSync(s.dir).some((f) => f.includes('.corrupt-')))
})

test('recovers a fully written temp file when the rename never happened', () => {
  const s = new Store(tmpDir())
  fs.writeFileSync(s.tmp, JSON.stringify(sample('in flight')))
  assert.equal(s.load().tasks[0].title, 'in flight')
})

test('keeps one snapshot per day, pruned to 14', () => {
  const s = new Store(tmpDir())
  s.save(sample('x'))
  for (let i = 1; i <= 20; i++) s.snapshot(new Date(2026, 0, i, 12))
  const files = fs.readdirSync(s.backupDir)
  assert.equal(files.length, 14)
  assert.ok(files.includes('tasks-2026-01-20.json'))
})
