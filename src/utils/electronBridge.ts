
/**
 * This file provides a compatibility layer for Electron's API when running in a browser environment
 */
import { FeedbackData, KnowledgeEntry } from '@/types/electron';
import { getTTSHistory } from '@/utils/textToSpeech';

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
      save: async (data) => {
        console.log('Mock save to memory:', data);
        try {
          localStorage.setItem('karna-memory', JSON.stringify(data));
          return { success: true };
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          return { success: false, error: String(error) };
        }
      },
      load: async () => {
        console.log('Mock load from memory');
        try {
          const data = localStorage.getItem('karna-memory');
          return { 
            success: true, 
            data: data ? JSON.parse(data) : null 
          };
        } catch (error) {
          console.error('Error loading from localStorage:', error);
          return { success: false, error: String(error) };
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
        // Generate random emotion data with face detection confidence
        const faceDetected = Math.random() > 0.3; // 70% chance of detecting a face
        const confidence = faceDetected ? 0.7 + (Math.random() * 0.3) : 0.2 + (Math.random() * 0.3);
        
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
          confidence: confidence,
          faceDetected: faceDetected,
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
    },
    speechToText: {
      transcribeAudio: async (audioData) => {
        console.log('Mock transcribe audio with Whisper');
        // Simulate transcription
        return {
          transcript: "This is a mock transcription of the audio data.",
          confidence: 0.85
        };
      },
      startListening: async () => {
        console.log('Mock start listening');
        return true;
      },
      stopListening: async () => {
        console.log('Mock stop listening');
        return true;
      }
    },
    textToSpeech: {
      speak: async (text, options) => {
        console.log('Mock TTS speak:', text, options);
        
        // Use browser's speech synthesis if available
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          
          if (options) {
            if (options.rate) utterance.rate = options.rate;
            if (options.pitch) utterance.pitch = options.pitch;
            if (options.volume) utterance.volume = options.volume;
          }
          
          window.speechSynthesis.speak(utterance);
          
          // Add to TTS history
          const ttsHistory = getTTSHistory();
          ttsHistory.unshift({
            text,
            duration: text.length * 60, // Rough estimate: 60ms per character
            timestamp: Date.now()
          });
          localStorage.setItem('karna-tts-history', JSON.stringify(ttsHistory.slice(0, 50)));
        }
        
        return true;
      },
      getVoices: async () => {
        console.log('Mock get TTS voices');
        return ['Daniel', 'Karen', 'Samantha', 'Thomas'];
      }
    },
    elevenlabs: {
      textToSpeech: async (text, options) => {
        console.log('Mock ElevenLabs TTS:', text, options);
        // Return a data URL that would normally be an audio file
        return 'data:audio/wav;base64,MOCK_AUDIO_DATA';
      },
      getAvailableVoices: async () => {
        console.log('Mock get ElevenLabs voices');
        return [
          { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },
          { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi" },
          { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },
          { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni" }
        ];
      },
      setApiKey: async (key) => {
        console.log('Mock set ElevenLabs API key');
        // Store in localStorage for mock persistence
        localStorage.setItem('elevenlabs-api-key', key);
        return true;
      }
    },
    knowledgeExpansion: {
      searchWikipedia: async (topic) => {
        console.log('Mock fetch from Wikipedia:', topic);
        
        // Simulate a Wikipedia response
        const entry: KnowledgeEntry = {
          id: `wiki-${Date.now()}`,
          title: topic,
          content: `This is mock Wikipedia content about ${topic}. In a real implementation, this would be actual content from Wikipedia.`,
          source: 'Wikipedia',
          source_url: `https://en.wikipedia.org/wiki/${topic.replace(' ', '_')}`,
          tags: [topic],
          confidence: 0.9,
          timestamp: Date.now()
        };
        
        return entry;
      },
      searchWeb: async (query) => {
        console.log('Mock fetch news:', query);
        
        // Simulate news articles
        return [
          {
            title: `Latest news about ${query}`,
            content: `This is mock news content about ${query}.`,
            source: 'Mock News API',
            url: 'https://example.com/news',
            publishedAt: new Date().toISOString()
          }
        ];
      },
      saveKnowledgeEntry: async (entry) => {
        console.log('Mock save knowledge entry:', entry);
        return true;
      }
    },
    gestureRecognition: {
      detectGesture: async (imageData) => {
        console.log('Mock detect gesture from frame');
        const gestures = ['wave', 'thumbs_up', 'thumbs_down', 'peace', 'none'];
        return {
          gesture: gestures[Math.floor(Math.random() * gestures.length)],
          confidence: 0.6 + (Math.random() * 0.4),
          timestamp: Date.now()
        };
      },
      trainGesture: async (name, samples) => {
        console.log(`Mock train gesture: ${name} with ${samples.length} samples`);
        return true;
      },
      getSupportedGestures: async () => {
        return ['wave', 'thumbs_up', 'thumbs_down', 'peace'];
      }
    },
    multiAgent: {
      processWithAgents: async (message, context) => {
        console.log('Mock process with multiple agents:', message);
        return `This is a response from the multi-agent system processing: "${message}"`;
      },
      getAgentStatus: async () => {
        return {
          active: true,
          agents: [
            { id: 'thinker', status: 'active' },
            { id: 'personality', status: 'active' },
            { id: 'memory', status: 'active' },
            { id: 'knowledge', status: 'active' }
          ]
        };
      },
      configureAgents: async (config) => {
        console.log('Mock configure agents:', config);
        return true;
      }
    },
    whisperAI: {
      transcribeFile: async (filePath, options) => {
        console.log('Mock transcribe file with Whisper:', filePath, options);
        return {
          text: "This is a mock Whisper AI transcription from a file.",
          segments: [
            { id: 0, start: 0, end: 2.5, text: "This is a mock", confidence: 0.95 },
            { id: 1, start: 2.5, end: 5.0, text: "Whisper AI transcription from a file.", confidence: 0.92 }
          ],
          language: options?.language || 'en'
        };
      },
      transcribeAudio: async (audioData, options) => {
        console.log('Mock transcribe audio with Whisper');
        return {
          text: "This is a mock Whisper AI transcription from audio data.",
          segments: [
            { id: 0, start: 0, end: 2.5, text: "This is a mock", confidence: 0.95 },
            { id: 1, start: 2.5, end: 5.0, text: "Whisper AI transcription from audio data.", confidence: 0.92 }
          ],
          language: options?.language || 'en'
        };
      },
      isAvailable: async () => {
        return true; // Mock that Whisper is available
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
