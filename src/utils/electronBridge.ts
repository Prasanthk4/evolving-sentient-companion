/**
 * This file provides a compatibility layer for Electron's API when running in a browser environment
 */
import { FeedbackData } from '@/types/electron';

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
      },
      getAvailableModels: async () => {
        console.log('Mock get available Ollama models');
        // Return some example models
        return ['llama3', 'mistral', 'deepseek-llm', 'phi-2'];
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
    },
    selfModify: {
      analyzeCode: async (filePath) => {
        console.log(`Mock analyze code: ${filePath}`);
        return 'Mock code analysis results. This would analyze the code structure and complexity.';
      },
      suggestImprovement: async (code, requirements) => {
        console.log(`Mock suggest code improvement based on: ${requirements}`);
        return 'Mock code improvement suggestions. This would provide AI-generated improvements.';
      },
      applyChange: async (modification) => {
        console.log('Mock apply code modification:', modification);
        // In the mock, just save the modification history
        try {
          const history = JSON.parse(localStorage.getItem('code-modifications') || '[]');
          // Ensure the mock modification has all required properties
          const completeModification = {
            ...modification,
            appliedBy: modification.appliedBy || 'ai',
            approved: modification.approved !== undefined ? modification.approved : true
          };
          history.push(completeModification);
          localStorage.setItem('code-modifications', JSON.stringify(history));
          return true;
        } catch (error) {
          console.error('Error storing modification:', error);
          return false;
        }
      },
      getModificationHistory: async () => {
        console.log('Mock get modification history');
        try {
          // Ensure the loaded modifications have all required properties
          const history = JSON.parse(localStorage.getItem('code-modifications') || '[]');
          return history.map((mod: any) => ({
            ...mod,
            appliedBy: mod.appliedBy || 'ai',
            approved: mod.approved !== undefined ? mod.approved : true
          }));
        } catch (error) {
          console.error('Error retrieving modification history:', error);
          return [];
        }
      }
    },
    emotionAnalysis: {
      analyzeFrame: async (imageData) => {
        console.log('Mock analyze emotion from frame');
        // Simulate emotion analysis result
        return {
          dominant: ['neutral', 'happy', 'surprised'][Math.floor(Math.random() * 3)],
          emotions: {
            happy: Math.random() * 0.5,
            sad: Math.random() * 0.2,
            angry: Math.random() * 0.1,
            surprised: Math.random() * 0.3,
            neutral: Math.random() * 0.6,
            fearful: Math.random() * 0.1,
            disgusted: Math.random() * 0.05
          },
          confidence: 0.7 + (Math.random() * 0.3),
          timestamp: Date.now()
        };
      },
      getEmotionHistory: async () => {
        console.log('Mock get emotion history');
        try {
          return JSON.parse(localStorage.getItem('emotion-history') || '[]');
        } catch (error) {
          console.error('Error retrieving emotion history:', error);
          return [];
        }
      },
      detectGesture: async (imageData) => {
        console.log('Mock detect gesture from frame');
        const gestures = ['wave', 'thumbs_up', 'thumbs_down', 'peace', 'none'];
        return {
          gesture: gestures[Math.floor(Math.random() * gestures.length)],
          confidence: 0.6 + (Math.random() * 0.4),
          timestamp: Date.now()
        };
      }
    },
    reinforcementLearning: {
      submitFeedback: async (feedback) => {
        console.log('Mock submit feedback:', feedback);
        try {
          // Store feedback in localStorage
          const history = JSON.parse(localStorage.getItem('feedback-history') || '[]');
          history.push(feedback);
          localStorage.setItem('feedback-history', JSON.stringify(history));
          return true;
        } catch (error) {
          console.error('Error storing feedback:', error);
          return false;
        }
      },
      getFeedbackHistory: async () => {
        console.log('Mock get feedback history');
        try {
          return JSON.parse(localStorage.getItem('feedback-history') || '[]');
        } catch (error) {
          console.error('Error retrieving feedback history:', error);
          return [];
        }
      },
      getImprovedResponse: async (prompt, context) => {
        console.log('Mock get improved response based on RLHF');
        return `This is an improved response for "${prompt}" based on past feedback and reinforcement learning.`;
      },
      getPerformanceMetrics: async () => {
        console.log('Mock get performance metrics');
        // Get feedback history
        const history = JSON.parse(localStorage.getItem('feedback-history') || '[]');
        
        // Calculate metrics if there's any feedback
        if (history.length > 0) {
          const scores = history.map((item: FeedbackData) => item.score);
          const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
          return {
            averageScore,
            totalFeedback: history.length,
            improvementRate: Math.min(0.95, averageScore / 5 + (history.length / 100))
          };
        }
        
        // Default metrics if no feedback
        return {
          averageScore: 0,
          totalFeedback: 0,
          improvementRate: 0
        };
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
