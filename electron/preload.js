
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
  ollama: {
    query: (prompt, model) => {
      return new Promise((resolve, reject) => {
        const requestId = Date.now().toString();
        
        const responseHandler = (event, { id, response, error }) => {
          if (id === requestId) {
            ipcRenderer.removeListener('ollama-response', responseHandler);
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        };
        
        ipcRenderer.on('ollama-response', responseHandler);
        ipcRenderer.send('ollama-query', { id: requestId, prompt, model });
      });
    }
  },
  gemini: {
    query: (prompt) => {
      return new Promise((resolve, reject) => {
        const requestId = Date.now().toString();
        
        const responseHandler = (event, { id, response, error }) => {
          if (id === requestId) {
            ipcRenderer.removeListener('gemini-response', responseHandler);
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        };
        
        ipcRenderer.on('gemini-response', responseHandler);
        ipcRenderer.send('gemini-query', { id: requestId, prompt });
      });
    }
  }
});
