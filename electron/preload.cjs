const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  saveSync: (data) => ipcRenderer.sendSync('store:save-sync', data),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggle-fullscreen'),
  onFullscreen: (cb) => {
    const listener = (_e, on) => cb(on)
    ipcRenderer.on('app:fullscreen', listener)
    return () => ipcRenderer.removeListener('app:fullscreen', listener)
  },
  platform: process.platform,
})
