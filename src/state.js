export const DEFAULT_STATE = {
  version: 1,
  tasks: [],
  trash: [],
  draft: '',
  settings: { fontSize: 18, font: 'Lato', theme: 'light', showDone: true },
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
    trash: (base.trash || []).filter((t) => (t.deletedAt || 0) > cutoff),
    settings: { ...DEFAULT_STATE.settings, ...(base.settings || {}) },
  }
}

export function reducer(state, action) {
  const now = Date.now()
  const mapTask = (id, fn) => ({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
  })

  switch (action.type) {
    case '@load':
      return hydrate(action.data)
    case 'add': {
      const task = {
        id: action.id || newId(),
        title: action.title,
        done: false,
        body: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      const open = state.tasks.filter((t) => !t.done)
      const done = state.tasks.filter((t) => t.done)
      return { ...state, draft: '', tasks: [...open, task, ...done] }
    }
    case 'toggle':
      return mapTask(action.id, (t) => ({
        ...t,
        done: !t.done,
        completedAt: t.done ? null : now,
        updatedAt: now,
      }))
    case 'update':
      return mapTask(action.id, (t) => ({ ...t, ...action.patch, updatedAt: now }))
    case 'reorder': {
      const byId = new Map(state.tasks.map((t) => [t.id, t]))
      const open = action.ids.map((id) => byId.get(id)).filter(Boolean)
      const rest = state.tasks.filter((t) => !action.ids.includes(t.id))
      return { ...state, tasks: [...open, ...rest] }
    }
    case 'delete': {
      const task = state.tasks.find((t) => t.id === action.id)
      if (!task) return state
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        trash: [{ ...task, deletedAt: now }, ...state.trash],
      }
    }
    case 'restore': {
      const task = state.trash.find((t) => t.id === action.id)
      if (!task) return state
      const { deletedAt, ...restored } = task
      return {
        ...state,
        trash: state.trash.filter((t) => t.id !== action.id),
        tasks: restored.done ? [...state.tasks, restored] : [restored, ...state.tasks],
      }
    }
    case 'draft':
      return { ...state, draft: action.value }
    case 'setting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }
    default:
      return state
  }
}
