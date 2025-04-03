
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

interface AutomationResponse {
  id: string;
  response: any;
  error?: string;
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
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
