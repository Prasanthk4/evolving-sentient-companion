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
  },
  emotionAnalysis: {
    analyzeFrame: (imageData) => {
      return new Promise((resolve) => {
        ipcRenderer.once('emotion-analyzed', (event, result) => {
          resolve(result.result);
        });
        ipcRenderer.send('analyze-emotion', imageData);
      });
    },
    getEmotionHistory: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('emotion-history', (event, history) => {
          resolve(history);
        });
        ipcRenderer.send('get-emotion-history');
      });
    },
    detectGesture: (imageData) => {
      return new Promise((resolve) => {
        ipcRenderer.once('gesture-detected', (event, result) => {
          resolve(result.result);
        });
        ipcRenderer.send('detect-gesture', imageData);
      });
    }
  },
  reinforcementLearning: {
    submitFeedback: (feedback) => {
      return new Promise((resolve) => {
        ipcRenderer.once('feedback-submitted', (event, result) => {
          resolve(result.success);
        });
        ipcRenderer.send('submit-feedback', feedback);
      });
    },
    getFeedbackHistory: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('feedback-history', (event, history) => {
          resolve(history);
        });
        ipcRenderer.send('get-feedback-history');
      });
    },
    getImprovedResponse: (prompt, context) => {
      return new Promise((resolve) => {
        ipcRenderer.once('improved-response', (event, response) => {
          resolve(response);
        });
        ipcRenderer.send('get-improved-response', { prompt, context });
      });
    },
    getPerformanceMetrics: () => {
      return new Promise((resolve) => {
        ipcRenderer.once('performance-metrics', (event, metrics) => {
          resolve(metrics);
        });
        ipcRenderer.send('get-performance-metrics');
      });
    }
  }
});
