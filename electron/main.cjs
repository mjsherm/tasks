const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { Store } = require('./store.cjs')

// Two copies writing the same file is the easiest way to lose data.
if (!app.requestSingleInstanceLock()) app.quit()

let win
let store

function createWindow() {
  const { theme } = store.load().settings
  win = new BrowserWindow({
    width: 860,
    height: 760,
    minWidth: 460,
    minHeight: 420,
    show: false,
    title: 'Tasks',
    backgroundColor: theme === 'dark' ? '#1c1c1c' : '#ffffff',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Links inside notes open in the browser, never inside the app window.
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

app.whenReady().then(() => {
  store = new Store(process.env.TASKS_DATA_DIR || app.getPath('userData'))
  try { store.snapshot() } catch (err) { console.error('snapshot failed', err) }

  ipcMain.handle('store:load', () => store.load())
  ipcMain.handle('store:save', (_e, data) => store.save(data))
  ipcMain.on('store:save-sync', (e, data) => {
    try { store.save(data); e.returnValue = true } catch (err) { console.error(err); e.returnValue = false }
  })
  ipcMain.handle('app:toggle-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()))
  ipcMain.handle('app:open-data-folder', () => shell.openPath(store.dir))

  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.focus()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
