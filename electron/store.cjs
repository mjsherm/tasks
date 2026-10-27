// Crash-safe JSON store.
//
// Every save writes the whole document to a temp file, fsyncs it, keeps the
// previous good copy as .bak, then atomically renames the temp file over the
// real one. A crash at any point leaves at least one complete, valid copy on
// disk, and load() falls back through them in order of freshness.
const fs = require('fs')
const path = require('path')

const DEFAULT_DATA = {
  version: 1,
  tasks: [],
  trash: [],
  draft: '',
  settings: { fontSize: 18, font: 'Lato', theme: 'light', showDone: true },
}

const SNAPSHOTS_TO_KEEP = 14

class Store {
  constructor(dir) {
    this.dir = dir
    this.file = path.join(dir, 'tasks.json')
    this.tmp = this.file + '.tmp'
    this.bak = this.file + '.bak'
    this.backupDir = path.join(dir, 'backups')
    fs.mkdirSync(dir, { recursive: true })
  }

  load() {
    for (const candidate of [this.file, this.tmp, this.bak]) {
      const data = readJson(candidate)
      if (data) return withDefaults(data)
      if (fs.existsSync(candidate)) {
        // Keep anything unreadable around rather than silently overwriting it.
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        try { fs.copyFileSync(candidate, `${candidate}.corrupt-${stamp}`) } catch {}
      }
    }
    return structuredClone(DEFAULT_DATA)
  }

  save(data) {
    const json = JSON.stringify(data)
    const fd = fs.openSync(this.tmp, 'w')
    try {
      fs.writeSync(fd, json)
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.bak)
    fs.renameSync(this.tmp, this.file)
    fsyncDir(this.dir)
  }

  // One snapshot per day in backups/, pruned to the most recent few.
  snapshot(now = new Date()) {
    if (!fs.existsSync(this.file)) return
    fs.mkdirSync(this.backupDir, { recursive: true })
    const day = now.toISOString().slice(0, 10)
    const target = path.join(this.backupDir, `tasks-${day}.json`)
    if (!fs.existsSync(target)) fs.copyFileSync(this.file, target)
    const old = fs.readdirSync(this.backupDir)
      .filter((f) => /^tasks-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(0, -SNAPSHOTS_TO_KEEP)
    for (const f of old) fs.rmSync(path.join(this.backupDir, f), { force: true })
  }
}

function readJson(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return data && Array.isArray(data.tasks) ? data : null
  } catch {
    return null
  }
}

function withDefaults(data) {
  return {
    ...DEFAULT_DATA,
    ...data,
    trash: data.trash || [],
    settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) },
  }
}

function fsyncDir(dir) {
  if (process.platform === 'win32') return
  try {
    const fd = fs.openSync(dir, 'r')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
  } catch {}
}

module.exports = { Store, DEFAULT_DATA }
