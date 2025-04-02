
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
  memory: {
    save: (data) => {
      return new Promise((resolve) => {
        ipcRenderer.once('memory-saved', (event, result) => {
          resolve(result);
        });
        ipcRenderer.send('save-memory', data);
      });
    },
    load: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('memory-loaded', (event, result) => {
          resolve(result);
        });
        ipcRenderer.send('load-memory');
      });
    }
  },
  ollama: {
    query: (request) => {
      return new Promise((resolve, reject) => {
        const responseHandler = (event, { id, response, error }) => {
          if (id === request.id) {
            ipcRenderer.removeListener('ollama-response', responseHandler);
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        };
        
        ipcRenderer.on('ollama-response', responseHandler);
        ipcRenderer.send('ollama-query', request);
      });
    },
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    off: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  gemini: {
    query: (request) => {
      return new Promise((resolve, reject) => {
        const responseHandler = (event, { id, response, error }) => {
          if (id === request.id) {
            ipcRenderer.removeListener('gemini-response', responseHandler);
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        };
        
        ipcRenderer.on('gemini-response', responseHandler);
        ipcRenderer.send('gemini-query', request);
      });
    },
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    off: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    }
  }
});
