# Tasks

A very simple, fluid task list for the desktop, in the spirit of [freewrite](https://github.com/farzaa/freewrite).
Click any task to open it and write notes in a Notion-style editor.

## Run it

```bash
npm install
npm run dev      # hot-reloading dev mode
npm start        # build once and open the app
npm run dist     # build an installable app into release/ (.dmg on macOS)
npm test         # storage tests
```

## Using it

- Press **⌥Space** anywhere to bring Tasks up, and again (or `Esc` on the list) to put it away. If another app already uses ⌥Space, Tasks uses **⌃⌥Space** instead.
- Type in **Add a task** and press Enter. Press `n` or `⌘N` anywhere on the list to jump there. A half-typed task is saved too.
- Click the circle to finish a task. Drag the dots on the left of a row to reorder. Hover a row and click × to delete it.
- Type **#project** in a task to tag it (a menu suggests existing projects; Enter adds the task, Tab just completes the tag). The projects appear at the top: click one to see only its tasks, and new tasks you add there join it. Hover a tag for × to remove it, or hover a project at the top to clear it from every task (with Undo). Inside a task, click its #tag to move it.
- Hover **Done** and click **Archive all** to clear finished tasks away. **Archive** in the bottom bar shows them, grouped by day; you can open, restore or delete any of them.
- Paste a Slack, Gmail or Google Drive link (in a title or in the notes) and it shows as a small grey logo you can click. `⌘`-click opens any other link in the notes.
- Click a task's title to open it. Type `/` in the notes for headings, to-do lists, quotes, code and dividers; select text for bold, italic, strike, code and links. Markdown shortcuts (`#`, `-`, `[]`, `>`) work too. `Esc` goes back.
- Deleted tasks go to Trash for 30 days, and the toast offers Undo.
- The bottom bar's font control (e.g. "Lato · 18") opens a Type panel: size slider, fonts (including any font installed on your Mac), line spacing and column width, all live. It also has light or dark, and fullscreen. It fades while you type and returns when you move the mouse.

## Your data

Everything stays on your machine, in `tasks.json` inside the app's data folder
(`~/Library/Application Support/Tasks` on macOS).

Every change is written to disk as it happens, including half-typed tasks:

1. The whole list is written to `tasks.json.tmp` and flushed to disk (`fsync`).
2. The previous good copy is moved to `tasks.json.bak`.
3. The temp file is renamed to `tasks.json`, which is atomic.

Writes happen off the main thread and are coalesced, so the window never waits on the disk.

A crash or power cut at any point leaves at least one complete copy, and the app
loads the newest valid one. If a file is ever unreadable it is set aside as
`*.corrupt-<time>` rather than overwritten. A daily snapshot goes to `backups/`
(the last 14 days are kept), and only one copy of the app can run at a time so two
windows can never overwrite each other.
