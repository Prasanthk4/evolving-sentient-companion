
export interface ElectronBridge {
  // System monitoring
  systemInfo?: {
    getCpuUsage: () => Promise<number>;
    getMemoryUsage: () => Promise<number>;
    getSystemUptime: () => Promise<number>;
    getBatteryLevel: () => Promise<number>;
  };
  
  // File operations
  fileSystem?: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    selectFile: (options?: any) => Promise<string | null>;
    selectDirectory: () => Promise<string | null>;
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
  score: number;
  feedback?: string;
  context?: string;
  emotion?: string;
  timestamp: number;
}
