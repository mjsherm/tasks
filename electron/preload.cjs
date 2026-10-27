const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  saveSync: (data) => ipcRenderer.sendSync('store:save-sync', data),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggle-fullscreen'),
  platform: process.platform,
})
