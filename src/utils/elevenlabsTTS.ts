import { toast } from "@/components/ui/use-toast";
import { ElevenLabsVoice } from "@/types/electron";

// Types
export interface ElevenLabsOptions {
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
  };
}

export enum ElevenLabsModel {
  MULTILINGUAL_V2 = "eleven_multilingual_v2",
  TURBO_V2 = "eleven_turbo_v2",
  TURBO_V2_5 = "eleven_turbo_v2_5"
}

export interface TTSHistoryItem {
  text: string;
  timestamp: number;
  duration: number;
  voice_id?: string;
}

// Constants
const TTS_HISTORY_KEY = 'karna-tts-history';
const TTS_SETTINGS_KEY = 'karna-tts-settings';

// Event types
type StartCallback = (text: string) => void;
type EndCallback = (text: string) => void;
type ErrorCallback = (error: any) => void;

// Default settings
const defaultSettings = {
  apiKey: '',
  defaultVoice: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  defaultModel: ElevenLabsModel.MULTILINGUAL_V2,
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75
  }
};

// The ElevenLabs TTS client
class ElevenLabsTTS {
  private apiKey: string = '';
  private initialized: boolean = false;
  private voices: ElevenLabsVoice[] = [];
  private defaultVoiceId: string = defaultSettings.defaultVoice;
  private defaultModel: string = defaultSettings.defaultModel;
  private voiceSettings = defaultSettings.voiceSettings;
  private audioElement: HTMLAudioElement | null = null;
  private onStartCallbacks: StartCallback[] = [];
  private onEndCallbacks: EndCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];
  
  constructor() {
    this.loadSettings();
  }
  
  // Initialize with API key
  async initialize(apiKey?: string): Promise<boolean> {
    try {
      // If API key is provided, save it
      if (apiKey) {
        this.apiKey = apiKey;
        this.saveSettings();
      }
      
      // Test the API connection
      const voices = await this.getVoices();
      
      if (voices && voices.length > 0) {
        this.initialized = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error initializing ElevenLabs TTS:', error);
      return false;
    }
  }
  
  // Check if initialized
  isInitialized(): boolean {
    return this.initialized || this.apiKey.length > 0;
  }
  
  // Check if has API key
  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }
  
  // Get API key
  getApiKey(): string {
    return this.apiKey;
  }
  
  // Set API key
  async setApiKey(apiKey: string): Promise<boolean> {
    try {
      // Save the new API key and test the connection
      this.apiKey = apiKey;
      this.saveSettings();
      
      return await this.initialize();
    } catch (error) {
      console.error('Error setting ElevenLabs API key:', error);
      return false;
    }
  }

  // Event handlers
  onStart(callback: StartCallback): void {
    this.onStartCallbacks.push(callback);
  }

  onEnd(callback: EndCallback): void {
    this.onEndCallbacks.push(callback);
  }

  onError(callback: ErrorCallback): void {
    this.onErrorCallbacks.push(callback);
  }

  // Stop current audio playback
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
      this.triggerEndCallbacks('');
    }
  }
  
  // Get available voices
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      // Try to use electron bridge first
      if (window.electron?.elevenlabs?.getAvailableVoices) {
        const voices = await window.electron.elevenlabs.getAvailableVoices();
        if (voices && voices.length > 0) {
          this.voices = voices;
          return voices;
        }
      }
      
      // If we have an API key, make a direct API call
      if (this.apiKey) {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        const data = await response.json();
        this.voices = data.voices;
        return data.voices;
      }
      
      // Use hardcoded voices as fallback
      return [
        { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', preview_url: '' },
        { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', preview_url: '' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', preview_url: '' },
        { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', preview_url: '' },
        { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', preview_url: '' }
      ];
    } catch (error) {
      console.error('Error getting ElevenLabs voices:', error);
      
      // Return hardcoded voices as fallback
      return [
        { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', preview_url: '' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', preview_url: '' },
        { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', preview_url: '' },
        { voice_id: 'jBpfuIE2acCO8z3wKNLl', name: 'Nicole', preview_url: '' },
        { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', preview_url: '' }
      ];
    }
  }

  // Trigger start callbacks
  private triggerStartCallbacks(text: string): void {
    this.onStartCallbacks.forEach(callback => callback(text));
  }

  // Trigger end callbacks
  private triggerEndCallbacks(text: string): void {
    this.onEndCallbacks.forEach(callback => callback(text));
  }

  // Trigger error callbacks
  private triggerErrorCallbacks(error: any): void {
    this.onErrorCallbacks.forEach(callback => callback(error));
  }
  
  // Text to speech
  async speak(text: string, options?: ElevenLabsOptions): Promise<string> {
    try {
      if (!text || text.trim() === '') {
        return '';
      }
      
      // Default options
      const opts: ElevenLabsOptions = {
        voice_id: options?.voice_id || this.defaultVoiceId,
        model_id: options?.model_id || this.defaultModel,
        voice_settings: options?.voice_settings || this.voiceSettings
      };

      // Trigger start callbacks
      this.triggerStartCallbacks(text);
      
      // Try to use electron bridge first
      if (window.electron?.elevenlabs?.textToSpeech) {
        const result = await window.electron.elevenlabs.textToSpeech(text, opts);
        
        // Save to history
        this.addToHistory(text);
        
        return result;
      }
      
      // If we have an API key, make a direct API call
      if (this.apiKey) {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${opts.voice_id}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text,
              model_id: opts.model_id,
              voice_settings: opts.voice_settings
            })
          }
        );
        
        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Play the audio
        this.audioElement = new Audio(audioUrl);
        this.audioElement.onended = () => {
          this.triggerEndCallbacks(text);
          this.audioElement = null;
        };
        this.audioElement.onerror = (error) => {
          this.triggerErrorCallbacks(error);
          this.audioElement = null;
        };
        this.audioElement.play().catch(error => {
          this.triggerErrorCallbacks(error);
        });
        
        // Save to history with estimated duration
        this.addToHistory(text);
        
        return audioUrl;
      }
      
      // Use browser's native speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => this.triggerEndCallbacks(text);
      utterance.onerror = (error) => this.triggerErrorCallbacks(error);
      window.speechSynthesis.speak(utterance);
      
      // Save to history with estimated duration
      this.addToHistory(text);
      
      return '';
    } catch (error) {
      console.error('Error in ElevenLabs TTS:', error);
      this.triggerErrorCallbacks(error);
      
      toast({
        title: "Text-to-Speech Error",
        description: "Failed to convert text to speech.",
        variant: "destructive"
      });
      
      return '';
    }
  }
  
  // Set default voice
  setDefaultVoice(voiceId: string): void {
    this.defaultVoiceId = voiceId;
    this.saveSettings();
  }
  
  // Get default voice
  getDefaultVoice(): string {
    return this.defaultVoiceId;
  }

  // Set default model
  setDefaultModel(model: ElevenLabsModel): void {
    this.defaultModel = model;
    this.saveSettings();
  }

  // Get default model
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(TTS_SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        this.apiKey = settings.apiKey || '';
        this.defaultVoiceId = settings.defaultVoice || defaultSettings.defaultVoice;
        this.defaultModel = settings.defaultModel || defaultSettings.defaultModel;
        this.voiceSettings = settings.voiceSettings || defaultSettings.voiceSettings;
        
        if (this.apiKey) {
          this.initialized = true;
        }
      }
    } catch (error) {
      console.error('Error loading TTS settings:', error);
    }
  }
  
  // Save settings to localStorage
  private saveSettings(): void {
    try {
      const settings = {
        apiKey: this.apiKey,
        defaultVoice: this.defaultVoiceId,
        defaultModel: this.defaultModel,
        voiceSettings: this.voiceSettings
      };
      
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving TTS settings:', error);
    }
  }
  
  // Add to TTS history
  private addToHistory(text: string): void {
    try {
      const history = getTTSHistory();
      
      // Estimate duration based on text length (very rough approximation)
      // Average speaking rate is ~150 words per minute or ~2.5 words per second
      const words = text.split(' ').length;
      const durationInMs = (words / 2.5) * 1000;
      
      history.unshift({
        text,
        timestamp: Date.now(),
        duration: durationInMs,
        voice_id: this.defaultVoiceId
      });
      
      // Keep only the most recent 50 entries
      const limitedHistory = history.slice(0, 50);
      localStorage.setItem(TTS_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error adding to TTS history:', error);
    }
  }
}

// Get TTS history from localStorage
export const getTTSHistory = (): TTSHistoryItem[] => {
  try {
    const stored = localStorage.getItem(TTS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting TTS history:', error);
    return [];
  }
};

// Create a singleton instance
export const elevenLabsTTS = new ElevenLabsTTS();
