// Crash-safe JSON store.
//
// Every save writes the whole document to a temp file and fsyncs it, moves
// the previous good copy to .bak, then atomically renames the temp file into
// place. A crash at any point leaves at least one complete, valid copy on
// disk, and load() falls back through them in order of freshness.
//
// Writes run off the main thread (fs.promises) and are coalesced: while one
// write is in flight, further saves just replace the pending document, so the
// window never waits on the disk however fast you type.
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')

const DEFAULT_DATA = {
  version: 1,
  tasks: [],
  archive: [],
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
    this.syncTmp = this.file + '.tmp-sync'
    this.seq = 0
    this.committed = 0
    this.backupDir = path.join(dir, 'backups')
    fs.mkdirSync(dir, { recursive: true })
  }

  load() {
    for (const candidate of [this.file, this.tmp, this.syncTmp, this.bak]) {
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

  // Synchronous save, used when the window is closing.
  save(data) {
    const json = typeof data === 'string' ? data : JSON.stringify(data)
    this.pending = null
    // Its own temp file and sequence number, so an async write that is still
    // in flight can neither clobber it nor land on top of it afterwards.
    this.committed = ++this.seq
    const fd = fs.openSync(this.syncTmp, 'w')
    try {
      fs.writeSync(fd, json)
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    if (fs.existsSync(this.file)) fs.renameSync(this.file, this.bak)
    fs.renameSync(this.syncTmp, this.file)
    fsyncDir(this.dir)
  }

  // Resolves once this document (or a newer one) is safely on disk.
  saveAsync(data) {
    this.pending = typeof data === 'string' ? data : JSON.stringify(data)
    if (!this.writing) this.writing = this._drain()
    return this.writing
  }

  async _drain() {
    try {
      while (this.pending != null) {
        const json = this.pending
        const seq = ++this.seq
        this.pending = null
        const fh = await fsp.open(this.tmp, 'w')
        try {
          await fh.writeFile(json)
          await fh.sync()
        } finally {
          await fh.close()
        }
        if (this.committed > seq) {
          await fsp.rm(this.tmp, { force: true })
          continue
        }
        await fsp.rename(this.file, this.bak).catch(() => {})
        if (this.committed > seq) {
          await fsp.rm(this.tmp, { force: true })
          continue
        }
        await fsp.rename(this.tmp, this.file)
        this.committed = seq
        await fsyncDirAsync(this.dir)
      }
    } finally {
      this.writing = null
    }
  }

  // Waits for any in-flight write so a synchronous save can't interleave.
  async idle() {
    while (this.writing) await this.writing.catch(() => {})
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
    archive: data.archive || [],
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

async function fsyncDirAsync(dir) {
  if (process.platform === 'win32') return
  try {
    const fh = await fsp.open(dir, 'r')
    await fh.sync()
    await fh.close()
  } catch {}
}

module.exports = { Store, DEFAULT_DATA }
