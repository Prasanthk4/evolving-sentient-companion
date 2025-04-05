interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Add Electron interface extensions for our new features
interface Window {
  electron?: {
    // Existing features
    speak?: (text: string) => void;
    systemStats?: {
      subscribe: (callback: (data: any) => void) => () => void;
    };
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
    speechToText?: {
      startListening: () => Promise<boolean>;
      stopListening: () => Promise<boolean>;
      transcribeAudio: (audioData: Blob, options?: any) => Promise<any>;
    };
    emotionAnalysis?: {
      analyzeFrame: (imageData: string) => Promise<any>;
      detectGesture: (imageData: string) => Promise<any>;
      getEmotionHistory: () => Promise<any[]>;
    };
    reinforcementLearning?: {
      submitFeedback: (feedback: any) => Promise<boolean>;
      getFeedbackHistory: () => Promise<any[]>;
      getPerformanceMetrics: () => Promise<any>;
      getImprovedResponse: (prompt: string, context: string) => Promise<string>;
    };
    selfModify?: {
      getModificationHistory: () => Promise<any[]>;
      applyChange: (modification: any) => Promise<boolean>;
      suggestImprovement: (code: string, requirements: string) => Promise<string>;
      analyzeCode?: (filePath: string) => Promise<string>;
    };
    
    // New features
    elevenlabs?: {
      textToSpeech: (text: string, options?: any) => Promise<string>;
      getAvailableVoices: () => Promise<any[]>;
      setApiKey: (key: string) => Promise<boolean>;
    };
    whisperAI?: {
      transcribeFile: (filePath: string, options?: any) => Promise<any>;
      transcribeAudio: (audioData: Blob, options?: any) => Promise<any>;
      isAvailable: () => Promise<boolean>;
    };
    knowledgeExpansion?: {
      searchWikipedia: (topic: string) => Promise<any>;
      searchWeb: (query: string) => Promise<any>;
      saveKnowledgeEntry: (entry: any) => Promise<boolean>;
    };
    gestureRecognition?: {
      detectGesture: (imageData: string) => Promise<any>;
      trainGesture: (name: string, samples: string[]) => Promise<boolean>;
      getSupportedGestures: () => Promise<string[]>;
    };
    multiAgent?: {
      processWithAgents: (message: string, context?: any) => Promise<string>;
      getAgentStatus: () => Promise<any>;
      configureAgents: (config: any) => Promise<boolean>;
    };
    receive?: (channel: string, func: Function) => void;
  };
}
