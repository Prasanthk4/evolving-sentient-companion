
import { toast } from "@/components/ui/use-toast";

// Types for text-to-speech
export interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResult {
  text: string;
  duration: number;
  timestamp: number;
}

// Local storage key for speech history
const TTS_HISTORY_KEY = 'karna-tts-history';

// Text-to-speech class
export class KarnaTextToSpeech {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private defaultVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private onStartCallback: ((text: string) => void) | null = null;
  private onEndCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;
  
  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      
      // Load available voices
      setTimeout(() => {
        this.loadVoices();
      }, 100);
      
      // Some browsers require waiting for the voiceschanged event
      if (this.synth) {
        this.synth.onvoiceschanged = this.loadVoices.bind(this);
      }
    } else {
      console.warn('Text-to-Speech is not supported in this browser.');
    }
  }
  
  // Load available voices
  private loadVoices(): void {
    if (!this.synth) return;
    
    this.voices = this.synth.getVoices();
    
    // Set default voice (prefer English)
    this.defaultVoice = this.voices.find(voice => 
      voice.lang.includes('en-') && voice.localService
    ) || this.voices[0];
  }
  
  // Get available voices
  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  // Speak text
  public speak(text: string, options: TTSOptions = {}): boolean {
    if (!this.synth) {
      // Try using Electron TTS if available
      if (window.electron?.speak) {
        window.electron.speak(text);
        
        // Create a result for history
        const result: TTSResult = {
          text,
          duration: text.length * 60, // Rough estimate: 60ms per character
          timestamp: Date.now()
        };
        
        addToTTSHistory(result);
        
        if (this.onStartCallback) {
          this.onStartCallback(text);
        }
        
        // Simulate TTS completion after estimated time
        setTimeout(() => {
          if (this.onEndCallback) {
            this.onEndCallback(text);
          }
        }, result.duration);
        
        return true;
      }
      
      toast({
        title: "Text-to-Speech Unavailable",
        description: "Your browser doesn't support text-to-speech. Try using Chrome or Edge.",
        variant: "destructive"
      });
      return false;
    }
    
    // Stop any current speech
    this.stop();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice options
    utterance.voice = this.getVoiceByName(options.voice) || this.defaultVoice;
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    // Set callbacks
    utterance.onstart = () => {
      this.isSpeaking = true;
      
      if (this.onStartCallback) {
        this.onStartCallback(text);
      }
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      
      // Create a result for history
      const result: TTSResult = {
        text,
        duration: utterance.duration || (text.length * 60),
        timestamp: Date.now()
      };
      
      addToTTSHistory(result);
      
      if (this.onEndCallback) {
        this.onEndCallback(text);
      }
    };
    
    utterance.onerror = (event) => {
      this.isSpeaking = false;
      console.error('TTS error:', event);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event);
      }
    };
    
    // Speak
    this.synth.speak(utterance);
    return true;
  }
  
  // Stop speaking
  public stop(): void {
    if (!this.synth) return;
    
    this.synth.cancel();
    this.isSpeaking = false;
  }
  
  // Check if currently speaking
  public isTalking(): boolean {
    return this.isSpeaking;
  }
  
  // Get a voice by name
  private getVoiceByName(name?: string): SpeechSynthesisVoice | null {
    if (!name) return null;
    
    return this.voices.find(voice => 
      voice.name.toLowerCase().includes(name.toLowerCase())
    ) || null;
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
}

// Add TTS result to history
export const addToTTSHistory = (result: TTSResult): void => {
  try {
    const history = getTTSHistory();
    history.unshift(result);
    
    // Limit history size
    const limitedHistory = history.slice(0, 50);
    localStorage.setItem(TTS_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error adding to TTS history:', error);
  }
};

// Get TTS history
export const getTTSHistory = (): TTSResult[] => {
  try {
    const stored = localStorage.getItem(TTS_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting TTS history:', error);
    return [];
  }
};

// Create a singleton instance
export const tts = new KarnaTextToSpeech();
