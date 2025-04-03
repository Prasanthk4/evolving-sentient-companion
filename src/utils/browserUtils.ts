
/**
 * Utility functions for browser environment
 * These simulate the Electron API for web browsers
 */

// Mock implementations for when running in browser
const mockElectronAPI = {
  sendMessage: (channel: string, data: any) => {
    console.log(`Mock sendMessage: ${channel}`, data);
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    console.log(`Mock receive registered for channel: ${channel}`);
    
    // For automation commands, simulate a response after 1 second
    if (channel === 'automation-response') {
      window.setTimeout(() => {
        func(null, {
          success: false,
          action: 'browser-mock',
          error: 'This feature requires the desktop application'
        });
      }, 1000);
    }
  },
  ollama: {
    query: async () => {
      return { response: "This is a mock response. I'm running in browser mode without access to Ollama." };
    },
    on: () => {},
    off: () => {}
  },
  gemini: {
    query: async (request: { prompt: string }) => {
      return { text: `This is a mock response for: "${request.prompt}". I'm running in browser mode without Gemini access.` };
    },
    on: () => {},
    off: () => {}
  },
  systemStats: {
    subscribe: () => {
      return () => {};  // Return unsubscribe function
    }
  },
  speak: (text: string) => {
    console.log('Mock speak:', text);
    // Try to use browser's speech synthesis API
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  },
  memory: {
    save: async (data: any) => {
      console.log('Mock memory save:', data);
      try {
        localStorage.setItem('karna-memory', JSON.stringify(data));
        return { success: true };
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        return { success: false, error };
      }
    },
    load: async () => {
      console.log('Mock memory load');
      try {
        const data = localStorage.getItem('karna-memory');
        return { success: true, data: data ? JSON.parse(data) : null };
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        return { success: false, error };
      }
    }
  }
};

/**
 * Checks if the app is running in Electron environment
 */
export const isElectron = (): boolean => {
  return window?.electron !== undefined;
};

/**
 * Initialize browser environment fallback
 */
export const initBrowserEnvironment = (): void => {
  if (!isElectron()) {
    console.log('Running in browser mode - using fallback implementations');
    window.electron = mockElectronAPI as any;
  }
};
