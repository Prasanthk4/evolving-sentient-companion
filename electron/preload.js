
const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC functions to the renderer process
contextBridge.exposeInMainWorld('electron', {
  sendMessage: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  systemStats: {
    subscribe: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('system-stats', subscription);
      return () => {
        ipcRenderer.removeListener('system-stats', subscription);
      };
    },
  },
  speak: (text) => {
    ipcRenderer.send('speak-text', text);
  },
});
