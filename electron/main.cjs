const { app, BrowserWindow, globalShortcut, ipcMain, shell } = require('electron')
const path = require('path')
const { Store } = require('./store.cjs')
const { registerToggle } = require('./hotkey.cjs')

// Two copies writing the same file is the easiest way to lose data.
if (!app.requestSingleInstanceLock()) app.quit()

let win
let store
let quitting = false


function createWindow() {
  const { theme } = store.load().settings
  win = new BrowserWindow({
    width: 860,
    height: 760,
    minWidth: 460,
    minHeight: 420,
    show: false,
    title: 'Tasks',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: theme === 'dark' ? '#1c1c1c' : '#ffffff',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      // Keep animating at full speed right after the window is summoned.
      backgroundThrottling: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Closing just hides the window so it comes back instantly on the shortcut.
  win.on('close', (e) => {
    if (quitting || process.env.TASKS_E2E) return
    e.preventDefault()
    hideWindow()
  })
  win.on('closed', () => { win = null })

  // Links inside notes open in the browser (or Slack), never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) win.loadURL(process.env.VITE_DEV_SERVER_URL)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

function showWindow({ summon = false } = {}) {
  if (!win) return createWindow()
  if (win.isMinimized()) win.restore()
  if (summon) {
    // Appear on the current Space, even over a full-screen app. Skipping the
    // process-type switch matters: without it macOS briefly turns Tasks into
    // a background app, which kicks the window straight back out.
    const opts = { visibleOnFullScreen: true, skipTransformProcessType: true }
    win.setVisibleOnAllWorkspaces(true, opts)
    win.show()
    win.setVisibleOnAllWorkspaces(false, opts)
    if (process.platform === 'darwin') app.focus({ steal: true })
  } else {
    win.show()
  }
  win.focus()
}

function hideWindow() {
  if (!win) return
  // Hiding the app hands focus straight back to whatever you were using.
  if (process.platform === 'darwin') app.hide()
  else win.minimize()
}

function toggleWindow() {
  if (win && win.isVisible() && win.isFocused() && !win.isMinimized()) hideWindow()
  else showWindow({ summon: true })
}

app.whenReady().then(() => {
  store = new Store(process.env.TASKS_DATA_DIR || app.getPath('userData'))
  try { store.snapshot() } catch (err) { console.error('snapshot failed', err) }

  ipcMain.handle('store:load', () => store.load())
  ipcMain.handle('store:save', (_e, json) => store.saveAsync(json))
  ipcMain.on('store:save-sync', (e, json) => {
    try { store.save(json); e.returnValue = true } catch (err) { console.error(err); e.returnValue = false }
  })
  ipcMain.handle('app:toggle-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()))

  createWindow()
  registerToggle(toggleWindow)
  // Dock click: macOS already brings the app forward; just make sure the
  // window is showing.
  app.on('activate', () => showWindow())
})

app.on('second-instance', () => showWindow())
app.on('before-quit', () => { quitting = true })
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
