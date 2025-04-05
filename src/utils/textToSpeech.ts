import { toast } from "@/components/ui/use-toast";
import { elevenLabsTTS } from "./elevenlabsTTS";

// Types for TTS
export interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSHistoryItem {
  text: string;
  timestamp: number;
  duration: number;
  voice?: string;
}

// Constants
const TTS_HISTORY_KEY = 'karna-tts-history';
const TTS_SETTINGS_KEY = 'karna-tts-settings';

// Default TTS settings
const defaultSettings = {
  voice: 'default',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  useElevenLabs: false
};

// The Text-to-Speech client
class TextToSpeech {
  private initialized: boolean = false;
  private isSpeaking: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private settings: {
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
    useElevenLabs: boolean;
  };
  private onStartCallbacks: ((text: string) => void)[] = [];
  private onEndCallbacks: ((text: string) => void)[] = [];
  
  constructor() {
    this.settings = { ...defaultSettings };
    this.loadSettings();
    this.initializeVoices();
  }

  // Event handlers
  onStart(callback: (text: string) => void): void {
    this.onStartCallbacks.push(callback);
  }

  onEnd(callback: (text: string) => void): void {
    this.onEndCallbacks.push(callback);
  }

  // Trigger callbacks
  private triggerStartCallbacks(text: string): void {
    this.onStartCallbacks.forEach(callback => callback(text));
  }

  private triggerEndCallbacks(text: string): void {
    this.onEndCallbacks.forEach(callback => callback(text));
  }
  
  // Initialize voices
  private async initializeVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Get available voices
      this.voices = window.speechSynthesis.getVoices();
      
      // If voices list is empty, wait for voices to load
      if (this.voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.voices = window.speechSynthesis.getVoices();
          this.initialized = true;
        };
      } else {
        this.initialized = true;
      }
    }
  }
  
  // Check if TTS is available
  isAvailable(): boolean {
    return (typeof window !== 'undefined' && 'speechSynthesis' in window) || 
           elevenLabsTTS.isInitialized();
  }
  
  // Check if currently speaking
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
  
  // Get available voices
  async getVoices(): Promise<any[]> {
    // Wait for voices to initialize if needed
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.voices.length === 0) {
      this.voices = window.speechSynthesis.getVoices();
    }
    
    // Try to get voices from ElevenLabs
    if (this.settings.useElevenLabs && elevenLabsTTS.isInitialized()) {
      try {
        const elevenLabsVoices = await elevenLabsTTS.getVoices();
        return [
          ...this.voices.map(voice => ({
            id: voice.name,
            name: `${voice.name} (Browser)`,
            isDefault: voice.default,
            source: 'browser'
          })),
          ...elevenLabsVoices.map(voice => ({
            id: voice.voice_id,
            name: `${voice.name} (ElevenLabs)`,
            isDefault: voice.voice_id === elevenLabsTTS.getDefaultVoice(),
            source: 'elevenlabs'
          }))
        ];
      } catch (error) {
        console.error('Error getting ElevenLabs voices:', error);
      }
    }
    
    // Return browser voices only
    return this.voices.map(voice => ({
      id: voice.name,
      name: voice.name,
      isDefault: voice.default,
      source: 'browser'
    }));
  }
  
  // Speak text
  async speak(text: string, options?: TTSOptions): Promise<boolean> {
    try {
      if (!text || text.trim() === '') {
        return false;
      }
      
      // Create merged options with defaults
      const opts = {
        voice: options?.voice || this.settings.voice,
        rate: options?.rate || this.settings.rate,
        pitch: options?.pitch || this.settings.pitch,
        volume: options?.volume || this.settings.volume
      };

      // Trigger start callbacks
      this.triggerStartCallbacks(text);
      this.isSpeaking = true;
      
      // Try to use electron bridge first
      if (window.electron?.speak) {
        window.electron.speak(text);
        
        // Add to history
        this.addToHistory(text, this.estimateSpeechDuration(text, opts.rate));
        
        return true;
      }
      
      // Use ElevenLabs if enabled and available
      if (this.settings.useElevenLabs && elevenLabsTTS.isInitialized()) {
        // Check if the selected voice is from ElevenLabs
        if (opts.voice && opts.voice.length > 10) {
          // Likely an ElevenLabs voice ID
          const audioUrl = await elevenLabsTTS.speak(text, {
            voice_id: opts.voice
          });
          
          if (audioUrl) {
            return true;
          }
        }
      }
      
      // Fall back to browser's speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set options
        utterance.rate = opts.rate;
        utterance.pitch = opts.pitch;
        utterance.volume = opts.volume;
        
        // Set voice if specified
        if (opts.voice && opts.voice !== 'default') {
          const selectedVoice = this.voices.find(v => v.name === opts.voice);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }
        
        // Handle speech end
        utterance.onend = () => {
          this.isSpeaking = false;
          this.triggerEndCallbacks(text);
        };
        
        // Handle speech error
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          this.isSpeaking = false;
        };
        
        // Speak
        window.speechSynthesis.speak(utterance);
        
        // Add to history with estimated duration
        const estimatedDuration = this.estimateSpeechDuration(text, opts.rate);
        this.addToHistory(text, estimatedDuration);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('TTS error:', error);
      this.isSpeaking = false;
      return false;
    }
  }
  
  // Stop speaking
  stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.triggerEndCallbacks("");
    }
  }
  
  // Update settings
  updateSettings(newSettings: Partial<typeof defaultSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }
  
  // Get current settings
  getSettings(): typeof defaultSettings {
    return { ...this.settings };
  }
  
  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(TTS_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading TTS settings:', error);
    }
  }
  
  // Save settings to localStorage
  private saveSettings(): void {
    try {
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving TTS settings:', error);
    }
  }
  
  // Add to TTS history
  private addToHistory(text: string, duration: number): void {
    try {
      const history = getTTSHistory();
      
      history.unshift({
        text,
        timestamp: Date.now(),
        duration,
        voice: this.settings.voice
      });
      
      // Keep only the most recent 50 entries
      const limitedHistory = history.slice(0, 50);
      localStorage.setItem(TTS_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error adding to TTS history:', error);
    }
  }
  
  // Estimate speech duration in milliseconds
  private estimateSpeechDuration(text: string, rate: number = 1): number {
    // Average speaking rate is about 150 words per minute
    // So about 2.5 words per second at rate=1.0
    const words = text.split(' ').length;
    const durationInSeconds = words / (2.5 * rate);
    return durationInSeconds * 1000;
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
export const tts = new TextToSpeech();

// Utility function for quick text-to-speech
export const speakText = (text: string, options?: TTSOptions): Promise<boolean> => {
  return tts.speak(text, options);
};
