const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { Store } = require('./store.cjs')
const { watchDoubleShift } = require('./hotkey.cjs')

// Two copies writing the same file is the easiest way to lose data.
if (!app.requestSingleInstanceLock()) app.quit()

let win
let store
let quitting = false
let stopHotkey = () => {}

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

  // Closing just hides the window so it comes back instantly on double-Shift.
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

function showWindow() {
  if (!win) return createWindow()
  if (win.isMinimized()) win.restore()
  // Appear on the current Space, even over a full-screen app.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.show()
  win.setVisibleOnAllWorkspaces(false)
  if (process.platform === 'darwin') app.focus({ steal: true })
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
  else showWindow()
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
  if (!process.env.TASKS_E2E || process.env.TASKS_HOTKEY) stopHotkey = watchDoubleShift(toggleWindow)
  app.on('activate', showWindow)
})

app.on('second-instance', showWindow)
app.on('before-quit', () => { quitting = true })
app.on('will-quit', () => stopHotkey())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
