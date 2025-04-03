
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
      ipcRenderer.send('ollama-query', request);
    },
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    off: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    },
    getAvailableModels: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('ollama-models', (event, models) => {
          resolve(models);
        });
        ipcRenderer.send('get-ollama-models');
      });
    }
  },
  gemini: {
    query: (request) => {
      ipcRenderer.send('gemini-query', request);
    },
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback);
    },
    off: (channel, callback) => {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  selfModify: {
    analyzeCode: (filePath) => {
      return new Promise((resolve) => {
        ipcRenderer.once('code-analyzed', (event, analysis) => {
          resolve(analysis);
        });
        ipcRenderer.send('analyze-code', filePath);
      });
    },
    suggestImprovement: (code, requirements) => {
      return new Promise((resolve) => {
        ipcRenderer.once('improvement-suggested', (event, improvedCode) => {
          resolve(improvedCode);
        });
        ipcRenderer.send('suggest-improvement', { code, requirements });
      });
    },
    applyChange: (modification) => {
      return new Promise((resolve) => {
        ipcRenderer.once('change-applied', (event, result) => {
          resolve(result);
        });
        ipcRenderer.send('apply-change', modification);
      });
    },
    getModificationHistory: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('modification-history', (event, history) => {
          resolve(history);
        });
        ipcRenderer.send('get-modification-history');
      });
    }
  }
});
