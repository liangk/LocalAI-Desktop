// Minimal CommonJS preload for Electron (dev)
const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API if needed
contextBridge.exposeInMainWorld('electron', {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  off: (channel, listener) => ipcRenderer.removeListener(channel, listener),
  once: (channel, listener) => ipcRenderer.once(channel, listener),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  detectOllama: () => ipcRenderer.invoke('ollama-detect'),
});
