export const DEFAULT_STATE = {
  version: 1,
  tasks: [],
  docs: [],
  archive: [],
  trash: [],
  draft: '',
  settings: { fontSize: 18, font: 'Lato', theme: 'light', showDone: true, project: null, spacing: 'normal', width: 'medium' },
}

const TRASH_DAYS = 30

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export function hydrate(data) {
  const base = data || DEFAULT_STATE
  const cutoff = Date.now() - TRASH_DAYS * 864e5
  return {
    ...DEFAULT_STATE,
    ...base,
    archive: base.archive || [],
    docs: base.docs || [],
    trash: (base.trash || []).filter((t) => (t.deletedAt || 0) > cutoff),
    settings: { ...DEFAULT_STATE.settings, ...(base.settings || {}) },
  }
}

export const findDoc = (state, id) => state.docs.find((d) => d.id === id)

export const findTask = (state, id) =>
  state.tasks.find((t) => t.id === id) || state.archive.find((t) => t.id === id)

const strip = ({ deletedAt, archivedAt, ...task }) => task

export function reducer(state, action) {
  const now = Date.now()
  // Edits apply wherever the task lives, so archived notes stay editable.
  const mapTask = (id, fn) => ({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
    archive: state.archive.map((t) => (t.id === id ? fn(t) : t)),
  })

  switch (action.type) {
    case '@load':
      return hydrate(action.data)
    case 'add': {
      const task = {
        id: action.id || newId(),
        title: action.title,
        project: action.project || null,
        today: !!action.today,
        done: false,
        body: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      const open = state.tasks.filter((t) => !t.done)
      const done = state.tasks.filter((t) => t.done)
      return { ...state, tasks: [...open, task, ...done] }
    }
    case 'toggle': {
      const archived = state.archive.find((t) => t.id === action.id)
      if (archived) {
        // Unticking an archived task brings it back to the list as open.
        return {
          ...state,
          archive: state.archive.filter((t) => t.id !== action.id),
          tasks: [{ ...strip(archived), done: false, completedAt: null, updatedAt: now }, ...state.tasks],
        }
      }
      return mapTask(action.id, (t) => ({
        ...t,
        done: !t.done,
        completedAt: t.done ? null : now,
        updatedAt: now,
      }))
    }
    case 'toggleToday':
      return mapTask(action.id, (t) => (t.done ? t : { ...t, today: !t.today, updatedAt: now }))
    case 'update':
      return mapTask(action.id, (t) => ({ ...t, ...action.patch, updatedAt: now }))
    case 'reorder': {
      // The ids may be a filtered subset (one project); reorder them within
      // the slots they already occupy and leave every other task in place.
      const wanted = new Set(action.ids)
      const byId = new Map(state.tasks.map((t) => [t.id, t]))
      const queue = action.ids.map((id) => byId.get(id)).filter(Boolean)
      const tasks = state.tasks.map((t) => (wanted.has(t.id) ? queue.shift() : t))
      return { ...state, tasks }
    }
    case 'delete': {
      const task = findTask(state, action.id)
      if (!task) return state
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        archive: state.archive.filter((t) => t.id !== action.id),
        trash: [{ ...task, deletedAt: now }, ...state.trash],
      }
    }
    case 'addDoc': {
      const doc = {
        id: action.id || newId(),
        title: action.title || '',
        project: action.project || null,
        body: null,
        createdAt: now,
        updatedAt: now,
      }
      return { ...state, docs: [doc, ...state.docs] }
    }
    case 'updateDoc':
      return { ...state, docs: state.docs.map((d) => (d.id === action.id ? { ...d, ...action.patch, updatedAt: now } : d)) }
    case 'deleteDoc': {
      const doc = findDoc(state, action.id)
      if (!doc) return state
      return {
        ...state,
        docs: state.docs.filter((d) => d.id !== action.id),
        trash: [{ ...doc, kind: 'doc', deletedAt: now }, ...state.trash],
      }
    }
    case 'restore': {
      const task = state.trash.find((t) => t.id === action.id)
      if (!task) return state
      if (task.kind === 'doc') {
        const { kind, deletedAt, ...doc } = task
        return { ...state, trash: state.trash.filter((t) => t.id !== action.id), docs: [doc, ...state.docs] }
      }
      const restored = strip(task)
      if (task.archivedAt) {
        return {
          ...state,
          trash: state.trash.filter((t) => t.id !== action.id),
          archive: [{ ...restored, archivedAt: task.archivedAt }, ...state.archive].sort((a, b) => b.archivedAt - a.archivedAt),
        }
      }
      return {
        ...state,
        trash: state.trash.filter((t) => t.id !== action.id),
        tasks: restored.done ? [...state.tasks, restored] : [restored, ...state.tasks],
      }
    }
    case 'archiveDone': {
      const done = state.tasks.filter((t) => t.done)
      if (!done.length) return state
      return {
        ...state,
        tasks: state.tasks.filter((t) => !t.done),
        archive: [...done.map((t) => ({ ...t, archivedAt: now })), ...state.archive],
      }
    }
    case 'unarchive': {
      const ids = new Set(action.ids)
      const back = state.archive.filter((t) => ids.has(t.id)).map(strip)
      if (!back.length) return state
      return {
        ...state,
        archive: state.archive.filter((t) => !ids.has(t.id)),
        tasks: [...state.tasks, ...back],
      }
    }
    case 'clearProject': {
      const clear = (t) => (t.project === action.name ? { ...t, project: null } : t)
      return {
        ...state,
        tasks: state.tasks.map(clear),
        archive: state.archive.map(clear),
        docs: state.docs.map(clear),
        settings: state.settings.project === action.name ? { ...state.settings, project: null } : state.settings,
      }
    }
    case 'restoreProject': {
      const ids = new Set(action.ids)
      const put = (t) => (ids.has(t.id) ? { ...t, project: action.name } : t)
      return { ...state, tasks: state.tasks.map(put), archive: state.archive.map(put), docs: state.docs.map(put) }
    }
    case 'setting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    default:
      return state
  }
}
