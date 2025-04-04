
interface OllamaRequest {
  id: string;
  prompt: string;
  model?: string;
}

interface OllamaElectronAPI {
  query: (request: OllamaRequest) => void;
  on: (channel: string, callback: (event: any, data: any) => void) => void;
  off: (channel: string, callback: (event: any, data: any) => void) => void;
  getAvailableModels: () => Promise<string[]>;
}

interface GeminiRequest {
  id: string;
  prompt: string;
}

interface GeminiElectronAPI {
  query: (request: GeminiRequest) => void;
  on: (channel: string, callback: (event: any, data: any) => void) => void;
  off: (channel: string, callback: (event: any, data: any) => void) => void;
}

interface AutomationResponse {
  id: string;
  response: any;
  error?: string;
}

interface CodeModification {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  purpose: string;
  timestamp: number;
  appliedBy: 'user' | 'ai';
  approved: boolean;
}

interface SelfModificationAPI {
  analyzeCode: (filePath: string) => Promise<string>;
  suggestImprovement: (code: string, requirements: string) => Promise<string>;
  applyChange: (modification: CodeModification) => Promise<boolean>;
  getModificationHistory: () => Promise<CodeModification[]>;
}

interface EmotionAnalysisResult {
  dominant: string;
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
    fearful: number;
    disgusted: number;
  };
  confidence: number;
  faceDetected?: boolean;
  timestamp: number;
}

interface GestureDetectionResult {
  gesture: string;
  confidence: number;
  timestamp: number;
}

interface EmotionAnalysisAPI {
  analyzeFrame: (imageData: string) => Promise<EmotionAnalysisResult>;
  getEmotionHistory: () => Promise<EmotionAnalysisResult[]>;
  detectGesture: (imageData: string) => Promise<GestureDetectionResult>;
}

interface SpeechToTextAPI {
  transcribeAudio: (audioData: Blob) => Promise<{
    transcript: string;
    confidence: number;
  }>;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<boolean>;
}

interface TextToSpeechAPI {
  speak: (text: string, options?: {
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => Promise<boolean>;
  getVoices: () => Promise<string[]>;
}

interface KnowledgeExpansionAPI {
  fetchWikipedia: (topic: string) => Promise<any>;
  fetchNews: (query: string) => Promise<any[]>;
  scrapeWebsite: (url: string) => Promise<{
    title: string;
    content: string;
    links: string[];
  }>;
}

export interface FeedbackData {
  id?: string;
  timestamp: number;
  prompt: string;
  response: string;
  score: number; // 1-5 rating
  feedback?: string;
  category?: 'accuracy' | 'helpfulness' | 'safety' | 'other';
  responseId?: string;
  context?: string;
  emotion?: string;
}

interface ReinforcementLearningAPI {
  submitFeedback: (feedback: FeedbackData) => Promise<boolean>;
  getFeedbackHistory: () => Promise<FeedbackData[]>;
  getImprovedResponse: (prompt: string, context: string) => Promise<string>;
  getPerformanceMetrics: () => Promise<{
    averageScore: number;
    totalFeedback: number;
    improvementRate: number;
  }>;
}

interface ElectronAPI {
  ollama: OllamaElectronAPI;
  gemini: GeminiElectronAPI;
  systemStats: {
    subscribe: (callback: (stats: any) => void) => (() => void);
  };
  sendMessage?: (channel: string, data: any) => void;
  receive?: (channel: string, func: (...args: any[]) => void) => void;
  speak?: (text: string) => void;
  memory?: {
    save: (data: any) => Promise<any>;
    load: () => Promise<any>;
  };
  selfModify?: SelfModificationAPI;
  emotionAnalysis?: EmotionAnalysisAPI;
  reinforcementLearning?: ReinforcementLearningAPI;
  speechToText?: SpeechToTextAPI;
  textToSpeech?: TextToSpeechAPI;
  knowledgeExpansion?: KnowledgeExpansionAPI;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
