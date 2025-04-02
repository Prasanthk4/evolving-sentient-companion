
interface OllamaRequest {
  id: string;
  prompt: string;
  model?: string;
}

interface OllamaElectronAPI {
  query: (request: OllamaRequest) => Promise<any>;
  on: (channel: string, callback: (event: any, data: any) => void) => void;
  off: (channel: string, callback: (event: any, data: any) => void) => void;
}

interface GeminiRequest {
  id: string;
  prompt: string;
}

interface GeminiElectronAPI {
  query: (request: GeminiRequest) => Promise<any>;
  on: (channel: string, callback: (event: any, data: any) => void) => void;
  off: (channel: string, callback: (event: any, data: any) => void) => void;
}

interface ElectronAPI {
  sendMessage: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  ollama: OllamaElectronAPI;
  gemini: GeminiElectronAPI;
  systemStats: {
    subscribe: (callback: (stats: any) => void) => (() => void);
  };
  speak: (text: string) => void;
  memory: {
    save: (data: any) => Promise<any>;
    load: () => Promise<any>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
