
interface ElectronAPI {
  sendMessage: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  systemStats: {
    subscribe: (callback: (data: any) => void) => () => void;
  };
  speak: (text: string) => void;
  memory: {
    save: (data: any) => Promise<any>;
    load: () => Promise<any>;
  };
  ollama: {
    query: (prompt: string, model?: string) => Promise<any>;
  };
  gemini: {
    query: (prompt: string) => Promise<any>;
  };
}

declare interface Window {
  electron?: ElectronAPI;
}
