
import { toast } from "@/components/ui/use-toast";

// Types for ElevenLabs TTS
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export interface ElevenLabsOptions {
  model_id?: string;  // Model ID to use (default: eleven_monolingual_v1)
  voice_id: string;   // Voice ID to use
  voice_settings?: {
    stability: number;  // 0-1, default 0.5
    similarity_boost: number; // 0-1, default 0.75
    style?: number; // 0-1, default 0.0
    use_speaker_boost?: boolean; // default true
  };
}

export interface ElevenLabsResult {
  text: string;
  audioUrl: string;
  timestamp: number;
}

// Local storage keys
const ELEVENLABS_HISTORY_KEY = 'karna-elevenlabs-history';
const ELEVENLABS_KEY_STORAGE = 'karna-elevenlabs-key';

// Top voices with their IDs
const TOP_VOICES = [
  { voice_id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
  { voice_id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { voice_id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum' },
  { voice_id: 'SAz9YHcvj6GT2YYXdXww', name: 'River' },
  { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' },
];

// Models available
export enum ElevenLabsModel {
  MULTILINGUAL_V2 = "eleven_multilingual_v2",
  TURBO_V2_5 = "eleven_turbo_v2_5",
  TURBO_V2 = "eleven_turbo_v2"
}

// ElevenLabs TTS class
export class ElevenLabsTTS {
  private apiKey: string | null = null;
  private defaultVoiceId: string = TOP_VOICES[0].voice_id; // Aria by default
  private defaultModel: ElevenLabsModel = ElevenLabsModel.MULTILINGUAL_V2;
  private isSpeaking: boolean = false;
  private audio: HTMLAudioElement | null = null;
  
  // Callbacks
  private onStartCallback: ((text: string) => void) | null = null;
  private onEndCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  
  constructor() {
    // Try to load API key from storage
    if (typeof window !== 'undefined') {
      this.apiKey = localStorage.getItem(ELEVENLABS_KEY_STORAGE);
      this.audio = new Audio();
      
      // Set up audio event listeners
      this.audio.onplay = () => {
        this.isSpeaking = true;
      };
      
      this.audio.onended = () => {
        this.isSpeaking = false;
        
        if (this.onEndCallback && this.audio?.dataset.text) {
          this.onEndCallback(this.audio.dataset.text);
        }
      };
      
      this.audio.onerror = (event) => {
        this.isSpeaking = false;
        console.error('Audio playback error:', event);
        
        if (this.onErrorCallback) {
          this.onErrorCallback(event);
        }
      };
    }
  }
  
  // Set API key
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    localStorage.setItem(ELEVENLABS_KEY_STORAGE, apiKey);
    
    // Test the API key
    this.getVoices()
      .then(() => {
        toast({
          title: "ElevenLabs API Connected",
          description: "Your API key has been saved and verified.",
        });
      })
      .catch((error) => {
        console.error('API key verification failed:', error);
        toast({
          title: "API Key Error",
          description: "Failed to verify your ElevenLabs API key. Please check and try again.",
          variant: "destructive"
        });
      });
  }
  
  // Get API key
  public getApiKey(): string | null {
    return this.apiKey;
  }
  
  // Check if API key is set
  public hasApiKey(): boolean {
    return !!this.apiKey;
  }
  
  // Get available voices
  public async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.apiKey) {
      return Promise.resolve(TOP_VOICES);
    }
    
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.voices || TOP_VOICES;
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return TOP_VOICES;
    }
  }
  
  // Speak text
  public async speak(text: string, options: Partial<ElevenLabsOptions> = {}): Promise<boolean> {
    if (!text) return false;
    
    // Stop any current speech
    this.stop();
    
    try {
      // If we have an API key, use the ElevenLabs API
      if (this.apiKey) {
        return this.speakWithElevenLabs(text, options);
      }
      
      // If no API key, fall back to browser's native speech
      return this.speakWithBrowserTTS(text);
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return false;
    }
  }
  
  // Speak with ElevenLabs API
  private async speakWithElevenLabs(text: string, options: Partial<ElevenLabsOptions> = {}): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const voiceId = options.voice_id || this.defaultVoiceId;
      const modelId = options.model_id || this.defaultModel;
      
      // Call onStart before making API request
      if (this.onStartCallback) {
        this.onStartCallback(text);
      }
      
      // Prepare request payload
      const payload = {
        text,
        model_id: modelId,
        voice_settings: options.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }
      
      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      if (this.audio) {
        this.audio.src = audioUrl;
        this.audio.dataset.text = text;
        await this.audio.play();
        
        // Add to history
        this.addToHistory({
          text,
          audioUrl,
          timestamp: Date.now()
        });
        
        return true;
      } else {
        throw new Error('Audio element not available');
      }
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return this.speakWithBrowserTTS(text);
    }
  }
  
  // Fallback to browser's native speech synthesis
  private speakWithBrowserTTS(text: string): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onstart = () => {
        this.isSpeaking = true;
        
        if (this.onStartCallback) {
          this.onStartCallback(text);
        }
      };
      
      utterance.onend = () => {
        this.isSpeaking = false;
        
        if (this.onEndCallback) {
          this.onEndCallback(text);
        }
      };
      
      utterance.onerror = (event) => {
        this.isSpeaking = false;
        
        if (this.onErrorCallback) {
          this.onErrorCallback(event);
        }
      };
      
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Browser speech synthesis error:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(error);
      }
      
      return false;
    }
  }
  
  // Stop speaking
  public stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    this.isSpeaking = false;
  }
  
  // Check if currently speaking
  public isTalking(): boolean {
    return this.isSpeaking;
  }
  
  // Set default voice
  public setDefaultVoice(voiceId: string): void {
    this.defaultVoiceId = voiceId;
  }
  
  // Set default model
  public setDefaultModel(model: ElevenLabsModel): void {
    this.defaultModel = model;
  }
  
  // Set callbacks
  public onStart(callback: (text: string) => void): void {
    this.onStartCallback = callback;
  }
  
  public onEnd(callback: (text: string) => void): void {
    this.onEndCallback = callback;
  }
  
  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }
  
  // Add to history
  private addToHistory(result: ElevenLabsResult): void {
    try {
      const history = this.getHistory();
      history.unshift(result);
      
      // Limit history size to 50 entries
      const limitedHistory = history.slice(0, 50);
      localStorage.setItem(ELEVENLABS_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error adding to ElevenLabs history:', error);
    }
  }
  
  // Get history
  public getHistory(): ElevenLabsResult[] {
    try {
      const stored = localStorage.getItem(ELEVENLABS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting ElevenLabs history:', error);
      return [];
    }
  }
}

// Create a singleton instance
export const elevenLabsTTS = new ElevenLabsTTS();
