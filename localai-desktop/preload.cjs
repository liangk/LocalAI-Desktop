// Minimal CommonJS preload for Electron (dev)
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API if needed
contextBridge.exposeInMainWorld('electron', {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener)
});
