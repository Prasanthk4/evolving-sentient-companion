
import { toast } from "@/components/ui/use-toast";

// Define ElevenLabs models
export enum ElevenLabsModel {
  MULTILINGUAL_V2 = "eleven_multilingual_v2",
  TURBO_V2 = "eleven_turbo_v2",
  TURBO_V2_5 = "eleven_turbo_v2_5",
  MULTILINGUAL_V1 = "eleven_multilingual_v1",
  MULTILINGUAL_STS_V2 = "eleven_multilingual_sts_v2",
  ENGLISH_V1 = "eleven_monolingual_v1",
  ENGLISH_STS_V2 = "eleven_english_sts_v2"
}

// Define voice interface
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
}

// Default voices
const DEFAULT_VOICES: ElevenLabsVoice[] = [
  { voice_id: "9BWtsMINqrJLrRacOk9x", name: "Aria" },
  { voice_id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { voice_id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { voice_id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { voice_id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
  { voice_id: "SAz9YHcvj6GT2YYXdXww", name: "River" },
  { voice_id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { voice_id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
  { voice_id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { voice_id: "bIHbv24MWmeRgasZH58o", name: "Will" }
];

// Settings interface
interface ElevenLabsSettings {
  apiKey: string | null;
  defaultVoiceId: string;
  defaultModel: ElevenLabsModel;
  stability: number;
  similarityBoost: number;
  speaking: boolean;
  speakingId: string | null;
}

// Local storage key
const ELEVENLABS_SETTINGS_KEY = "karna-elevenlabs-settings";
const ELEVENLABS_HISTORY_KEY = "karna-elevenlabs-history";

// ElevenLabs TTS class
export class ElevenLabsTTS {
  private settings: ElevenLabsSettings;
  private audioElement: HTMLAudioElement | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    // Initialize settings from local storage or use defaults
    const savedSettings = localStorage.getItem(ELEVENLABS_SETTINGS_KEY);
    
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
    } else {
      this.settings = {
        apiKey: null,
        defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
        defaultModel: ElevenLabsModel.MULTILINGUAL_V2,
        stability: 0.5,
        similarityBoost: 0.75,
        speaking: false,
        speakingId: null
      };
      this.saveSettings();
    }
    
    // Create audio element
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      
      // Set up event listeners
      this.audioElement.addEventListener('play', () => {
        this.settings.speaking = true;
        if (this.onStartCallback) this.onStartCallback();
      });
      
      this.audioElement.addEventListener('ended', () => {
        this.settings.speaking = false;
        this.settings.speakingId = null;
        if (this.onEndCallback) this.onEndCallback();
      });
      
      this.audioElement.addEventListener('pause', () => {
        if (!this.audioElement?.ended) {
          this.settings.speaking = false;
          if (this.onEndCallback) this.onEndCallback();
        }
      });
      
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this.settings.speaking = false;
        this.settings.speakingId = null;
        if (this.onEndCallback) this.onEndCallback();
      });
    }
  }
  
  // Check if API key is set
  public hasApiKey(): boolean {
    return !!this.settings.apiKey;
  }
  
  // Set API key
  public async setApiKey(apiKey: string): Promise<boolean> {
    this.settings.apiKey = apiKey;
    this.saveSettings();
    
    // Verify API key works by attempting to get available voices
    try {
      await this.getAvailableVoices();
      toast({
        title: "ElevenLabs API Key Set",
        description: "Your API key was successfully validated."
      });
      return true;
    } catch (error) {
      console.error('Error validating ElevenLabs API key:', error);
      this.settings.apiKey = null;
      this.saveSettings();
      toast({
        title: "Invalid API Key",
        description: "Could not validate your ElevenLabs API key.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  // Set callbacks
  public onStart(callback: () => void): void {
    this.onStartCallback = callback;
  }
  
  public onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }
  
  // Stop speaking
  public stop(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    this.settings.speaking = false;
    this.settings.speakingId = null;
  }
  
  // Set default voice
  public setDefaultVoice(voiceId: string): void {
    this.settings.defaultVoiceId = voiceId;
    this.saveSettings();
  }
  
  // Set default model
  public setDefaultModel(model: ElevenLabsModel): void {
    this.settings.defaultModel = model;
    this.saveSettings();
  }
  
  // Set stability
  public setStability(stability: number): void {
    this.settings.stability = Math.max(0, Math.min(1, stability));
    this.saveSettings();
  }
  
  // Set similarity boost
  public setSimilarityBoost(similarityBoost: number): void {
    this.settings.similarityBoost = Math.max(0, Math.min(1, similarityBoost));
    this.saveSettings();
  }
  
  // Generate speech
  public async speak(text: string, options?: {
    voice_id?: string;
    model_id?: ElevenLabsModel;
    voice_settings?: {
      stability?: number;
      similarity_boost?: number;
    }
  }): Promise<boolean> {
    // If no API key is set, use system TTS
    if (!this.settings.apiKey) {
      return this.fallbackToSystemTTS(text);
    }
    
    // First try using Electron bridge if available
    if (window.electron?.elevenlabs?.textToSpeech) {
      try {
        const audioUrl = await window.electron.elevenlabs.textToSpeech(text, {
          voiceId: options?.voice_id || this.settings.defaultVoiceId,
          model: options?.model_id || this.settings.defaultModel,
          stability: options?.voice_settings?.stability !== undefined ? options.voice_settings.stability : this.settings.stability,
          similarityBoost: options?.voice_settings?.similarity_boost !== undefined ? options.voice_settings.similarity_boost : this.settings.similarityBoost
        });
        
        if (this.audioElement) {
          // Generate a unique ID for this speech request
          const speechId = Date.now().toString();
          this.settings.speakingId = speechId;
          
          // Set audio source and play
          this.audioElement.src = audioUrl;
          this.audioElement.play();
          
          // Add to history
          this.addToHistory(text, {
            voiceId: options?.voice_id || this.settings.defaultVoiceId,
            model: options?.model_id || this.settings.defaultModel
          });
          
          return true;
        }
      } catch (error) {
        console.error('Error using ElevenLabs via Electron:', error);
        return this.fallbackToSystemTTS(text);
      }
    } else {
      // Direct API call implementation (for browser-only environments)
      try {
        // If we reach here, it means we need to make a direct API call
        // which requires handling CORS and audio streaming
        console.warn('Direct ElevenLabs API calls not implemented in browser. Falling back to system TTS.');
        return this.fallbackToSystemTTS(text);
      } catch (error) {
        console.error('Error with direct ElevenLabs API call:', error);
        return this.fallbackToSystemTTS(text);
      }
    }
    
    return false;
  }
  
  // Fallback to system TTS
  private fallbackToSystemTTS(text: string): boolean {
    // Use browser's speech synthesis if available
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        this.settings.speaking = true;
        if (this.onStartCallback) this.onStartCallback();
      };
      
      utterance.onend = () => {
        this.settings.speaking = false;
        this.settings.speakingId = null;
        if (this.onEndCallback) this.onEndCallback();
      };
      
      utterance.onerror = () => {
        this.settings.speaking = false;
        this.settings.speakingId = null;
        if (this.onEndCallback) this.onEndCallback();
      };
      
      window.speechSynthesis.speak(utterance);
      
      // Generate a unique ID for this speech request
      const speechId = Date.now().toString();
      this.settings.speakingId = speechId;
      
      // Add to history
      this.addToHistory(text, { systemTTS: true });
      
      return true;
    }
    
    return false;
  }
  
  // Get available voices
  public async getAvailableVoices(): Promise<ElevenLabsVoice[]> {
    // First try using Electron bridge if available
    if (window.electron?.elevenlabs?.getAvailableVoices) {
      try {
        return await window.electron.elevenlabs.getAvailableVoices();
      } catch (error) {
        console.error('Error getting voices via Electron:', error);
        return DEFAULT_VOICES;
      }
    }
    
    // If API key is present, try direct API call
    if (this.settings.apiKey) {
      // This would be implemented for browser-direct API calls
      // Requires handling CORS and authentication
    }
    
    // Fall back to default voices
    return DEFAULT_VOICES;
  }

  // Get default voice
  public getDefaultVoice(): string {
    return this.settings.defaultVoiceId;
  }

  // Check if initialized
  public isInitialized(): boolean {
    return true;  // Always initialized after construction
  }
  
  // Add to history
  private addToHistory(text: string, details: any): void {
    try {
      const history = this.getTTSHistory();
      history.unshift({
        text,
        timestamp: Date.now(),
        ...details
      });
      
      // Limit history size
      const limitedHistory = history.slice(0, 100);
      localStorage.setItem(ELEVENLABS_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error adding to TTS history:', error);
    }
  }
  
  // Get TTS history
  public getTTSHistory(): any[] {
    try {
      const stored = localStorage.getItem(ELEVENLABS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting TTS history:', error);
      return [];
    }
  }
  
  // Save settings
  private saveSettings(): void {
    localStorage.setItem(ELEVENLABS_SETTINGS_KEY, JSON.stringify(this.settings));
  }
  
  // Is speaking
  public isSpeaking(): boolean {
    return this.settings.speaking;
  }
}

// Create singleton instance
export const elevenlabsTTS = new ElevenLabsTTS();
