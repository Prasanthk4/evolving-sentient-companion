
/**
 * This file provides a compatibility layer for Electron's API when running in a browser environment
 */

// Mock implementation of the Electron API for browser environments
const createMockElectronAPI = (): Window['electron'] => {
  return {
    ollama: {
      query: (request) => {
        console.log('Mock Ollama query:', request);
      },
      on: (channel, callback) => {
        console.log(`Mock registered listener for Ollama channel: ${channel}`);
      },
      off: (channel, callback) => {
        console.log(`Mock removed listener for Ollama channel: ${channel}`);
      }
    },
    gemini: {
      query: (request) => {
        console.log('Mock Gemini query:', request);
      },
      on: (channel, callback) => {
        console.log(`Mock registered listener for Gemini channel: ${channel}`);
      },
      off: (channel, callback) => {
        console.log(`Mock removed listener for Gemini channel: ${channel}`);
      }
    },
    systemStats: {
      subscribe: (callback) => {
        console.log('Mock subscribed to system stats');
        // Return a function to unsubscribe
        return () => {
          console.log('Mock unsubscribed from system stats');
        };
      }
    },
    sendMessage: (channel, data) => {
      console.log(`Mock send message to channel ${channel}:`, data);
    },
    receive: (channel, func) => {
      console.log(`Mock receive from channel ${channel}`);
    },
    speak: (text) => {
      console.log('Mock speak:', text);
      // Use browser's speech synthesis if available
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    },
    memory: {
      save: (data) => {
        console.log('Mock save to memory:', data);
        try {
          localStorage.setItem('karna-memory', JSON.stringify(data));
          return Promise.resolve({ success: true });
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          return Promise.resolve({ success: false, error: String(error) });
        }
      },
      load: () => {
        console.log('Mock load from memory');
        try {
          const data = localStorage.getItem('karna-memory');
          return Promise.resolve({ 
            success: true, 
            data: data ? JSON.parse(data) : null 
          });
        } catch (error) {
          console.error('Error loading from localStorage:', error);
          return Promise.resolve({ success: false, error: String(error) });
        }
      }
    }
  };
};

// Initialize the Electron API or use a mock in browser environments
export const initializeElectronBridge = () => {
  if (typeof window !== 'undefined' && !window.electron) {
    console.log('Running in browser environment. Using mock Electron API.');
    window.electron = createMockElectronAPI();
  }
};
