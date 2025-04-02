
interface OllamaRequest {
  id: string;
  prompt: string;
  model?: string;
}

interface OllamaElectronAPI {
  query: (request: OllamaRequest) => void;
  on: (channel: string, callback: (event: any, data: any) => void) => void;
  off: (channel: string, callback: (event: any, data: any) => void) => void;
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

interface ElectronAPI {
  ollama: OllamaElectronAPI;
  gemini: GeminiElectronAPI;
  systemStats: {
    subscribe: (callback: (stats: any) => void) => (() => void);
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
