
export interface ElectronBridge {
  // System monitoring
  systemStats?: {
    getCpuUsage: () => Promise<number>;
    getMemoryUsage: () => Promise<number>;
    getSystemUptime: () => Promise<number>;
    getBatteryLevel: () => Promise<number>;
    subscribe: (callback: (data: any) => void) => () => void;
  };
  
  // File operations
  fileSystem?: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    selectFile: (options?: any) => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
  };
  
  // LLM models
  ollama?: {
    query: (request: any) => void;
    on: (channel: string, callback: Function) => void;
    off: (channel: string, callback: Function) => void;
    getAvailableModels: () => Promise<string[]>;
  };
  
  gemini?: {
    query: (request: any) => void;
    on: (channel: string, callback: Function) => void;
    off: (channel: string, callback: Function) => void;
  };
  
  // Speech recognition and synthesis
  speak?: (text: string) => void;
  speechToText?: {
    startListening: () => Promise<boolean>;
    stopListening: () => Promise<boolean>;
    transcribeAudio: (audioData: Blob, options?: any) => Promise<any>;
  };
  
  // AI and ML features
  aiProcessor?: {
    processWithLLM: (prompt: string, options?: any) => Promise<string>;
    generateImage: (prompt: string, options?: any) => Promise<string>;
    summarizeText: (text: string) => Promise<string>;
  };
  
  // Emotion and face analysis
  emotionAnalysis?: {
    analyzeFrame: (imageData: string) => Promise<any>;
    detectGesture: (imageData: string) => Promise<any>;
    getEmotionHistory: () => Promise<any[]>;
  };
  
  // Reinforcement learning and feedback
  reinforcementLearning?: {
    submitFeedback: (feedback: FeedbackData) => Promise<boolean>;
    getFeedbackHistory: () => Promise<FeedbackData[]>;
    getPerformanceMetrics: () => Promise<{
      averageScore: number;
      totalFeedback: number;
      improvementRate: number;
    }>;
    getImprovedResponse: (prompt: string, context: string) => Promise<string>;
  };
  
  // Self modification and improvement
  selfModify?: {
    getModificationHistory: () => Promise<any[]>;
    applyChange: (modification: any) => Promise<boolean>;
    suggestImprovement: (code: string, requirements: string) => Promise<string>;
    analyzeCode?: (filePath: string) => Promise<string>;
  };
  
  // NEW FEATURES
  
  // ElevenLabs integration
  elevenlabs?: {
    textToSpeech: (text: string, options?: any) => Promise<string>;
    getAvailableVoices: () => Promise<any[]>;
    setApiKey: (key: string) => Promise<boolean>;
  };
  
  // Whisper AI integration
  whisperAI?: {
    transcribeFile: (filePath: string, options?: any) => Promise<any>;
    transcribeAudio: (audioData: Blob, options?: any) => Promise<any>;
    isAvailable: () => Promise<boolean>;
  };
  
  // Knowledge expansion
  knowledgeExpansion?: {
    searchWikipedia: (topic: string) => Promise<any>;
    searchWeb: (query: string) => Promise<any>;
    saveKnowledgeEntry: (entry: any) => Promise<boolean>;
  };
  
  // Gesture recognition
  gestureRecognition?: {
    detectGesture: (imageData: string) => Promise<any>;
    trainGesture: (name: string, samples: string[]) => Promise<boolean>;
    getSupportedGestures: () => Promise<string[]>;
  };
  
  // Multi-agent system
  multiAgent?: {
    processWithAgents: (message: string, context?: any) => Promise<string>;
    getAgentStatus: () => Promise<any>;
    configureAgents: (config: any) => Promise<boolean>;
  };
}

export interface FeedbackData {
  id?: string;
  prompt: string;
  response: string;
  responseId?: string;
  score: number;
  feedback?: string;
  context?: string;
  emotion?: string;
  timestamp: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  source_url?: string;
  tags: string[];
  confidence: number;
  timestamp: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
}
