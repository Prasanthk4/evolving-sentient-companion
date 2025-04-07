
import { toast } from "@/components/ui/use-toast";

// ElevenLabs model options
export enum ElevenLabsModel {
  MULTILINGUAL_V2 = "eleven_multilingual_v2",
  TURBO_V2_5 = "eleven_turbo_v2_5",
  TURBO_V2 = "eleven_turbo_v2",
  MULTILINGUAL_V1 = "eleven_multilingual_v1",
  MULTILINGUAL_STS_V2 = "eleven_multilingual_sts_v2",
  MONOLINGUAL_V1 = "eleven_monolingual_v1",
  ENGLISH_STS_V2 = "eleven_english_sts_v2"
}

// Voice settings interface
export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
}

// TTS options interface
export interface ElevenLabsOptions {
  voice_id: string;
  model_id?: ElevenLabsModel;
  voice_settings?: ElevenLabsVoiceSettings;
}

// ElevenLabs TTS class
export class ElevenLabsTTS {
  private apiKey: string | null = null;
  private initialized: boolean = false;
  private voices: any[] = [];
  private defaultVoice: string = "";
  private defaultModel: ElevenLabsModel = ElevenLabsModel.MULTILINGUAL_V2;
  private isSpeaking: boolean = false;
  private audio: HTMLAudioElement | null = null;
  private onStartCallbacks: (() => void)[] = [];
  private onEndCallbacks: (() => void)[] = [];
  
  constructor() {
    // Check for API key in local storage
    this.apiKey = localStorage.getItem('elevenlabs-api-key');
    this.initialized = this.apiKey !== null;
    
    // Load default voice and model if available
    const savedVoice = localStorage.getItem('elevenlabs-default-voice');
    if (savedVoice) {
      this.defaultVoice = savedVoice;
    }
    
    const savedModel = localStorage.getItem('elevenlabs-default-model');
    if (savedModel && Object.values(ElevenLabsModel).includes(savedModel as ElevenLabsModel)) {
      this.defaultModel = savedModel as ElevenLabsModel;
    }
    
    // Initialize audio element
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.addEventListener('ended', this.handleAudioEnd.bind(this));
      this.audio.addEventListener('error', this.handleAudioError.bind(this));
    }
  }
  
  // Check if API key is set
  public hasApiKey(): boolean {
    return this.apiKey !== null;
  }
  
  // Set API key
  public setApiKey(key: string): void {
    if (!key || key.trim() === '') {
      return;
    }
    
    this.apiKey = key.trim();
    localStorage.setItem('elevenlabs-api-key', this.apiKey);
    this.initialized = true;
    
    // Fetch voices after setting API key
    this.fetchVoices();
  }
  
  // Get API key
  public getApiKey(): string | null {
    return this.apiKey;
  }
  
  // Set default voice
  public setDefaultVoice(voiceId: string): void {
    this.defaultVoice = voiceId;
    localStorage.setItem('elevenlabs-default-voice', voiceId);
  }
  
  // Get default voice
  public getDefaultVoice(): string {
    return this.defaultVoice;
  }
  
  // Set default model
  public setDefaultModel(model: ElevenLabsModel): void {
    this.defaultModel = model;
    localStorage.setItem('elevenlabs-default-model', model);
  }
  
  // Get default model
  public getDefaultModel(): ElevenLabsModel {
    return this.defaultModel;
  }
  
  // Check if initialized
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  // Check if currently speaking
  public isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
  
  // Register callback for speech start
  public onStart(callback: () => void): void {
    this.onStartCallbacks.push(callback);
    
    // Create a custom event for compatibility with other integrations
    window.addEventListener('elevenlabs-start', callback);
  }
  
  // Register callback for speech end
  public onEnd(callback: () => void): void {
    this.onEndCallbacks.push(callback);
    
    // Create a custom event for compatibility with other integrations
    window.addEventListener('elevenlabs-end', callback);
  }
  
  // Trigger start callbacks
  private triggerStartCallbacks(): void {
    this.onStartCallbacks.forEach(callback => callback());
    
    // Dispatch event for broader compatibility
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('elevenlabs-start'));
    }
  }
  
  // Trigger end callbacks
  private triggerEndCallbacks(): void {
    this.onEndCallbacks.forEach(callback => callback());
    
    // Dispatch event for broader compatibility
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('elevenlabs-end'));
    }
  }
  
  // Handle audio end
  private handleAudioEnd(): void {
    this.isSpeaking = false;
    this.triggerEndCallbacks();
  }
  
  // Handle audio error
  private handleAudioError(error: any): void {
    console.error('ElevenLabs audio error:', error);
    this.isSpeaking = false;
    this.triggerEndCallbacks();
    
    toast({
      title: "Audio Playback Error",
      description: "There was an error playing the generated speech.",
      variant: "destructive"
    });
  }
  
  // Fetch available voices
  public async getVoices(): Promise<any[]> {
    if (!this.initialized) {
      return [];
    }
    
    if (this.voices.length > 0) {
      return this.voices;
    }
    
    await this.fetchVoices();
    return this.voices;
  }
  
  // Fetch voices from API or use Electron bridge
  private async fetchVoices(): Promise<void> {
    try {
      // Try to use Electron bridge first
      if (window.electron?.elevenlabs?.getAvailableVoices) {
        this.voices = await window.electron.elevenlabs.getAvailableVoices();
        return;
      }
      
      // Fall back to direct API call if no bridge
      if (this.apiKey) {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': this.apiKey
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.voices = data.voices || [];
        } else {
          console.error('Failed to fetch voices:', response.statusText);
          this.voices = [];
        }
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
      this.voices = [];
      
      // Use mock voices for testing when API is unavailable
      this.voices = [
        { voice_id: 'mock-voice-1', name: 'Adam' },
        { voice_id: 'mock-voice-2', name: 'Bella' },
        { voice_id: 'mock-voice-3', name: 'Charlie' }
      ];
    }
  }
  
  // Speak text
  public async speak(text: string, options?: Partial<ElevenLabsOptions>): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your ElevenLabs API key first.",
        variant: "destructive"
      });
      return '';
    }
    
    try {
      // Stop any current speech
      this.stop();
      
      // Merge options with defaults
      const voiceId = options?.voice_id || this.defaultVoice || 'mock-voice-1';
      const modelId = options?.model_id || this.defaultModel;
      
      // Set speaking state
      this.isSpeaking = true;
      this.triggerStartCallbacks();
      
      // Try to use Electron bridge first
      if (window.electron?.elevenlabs?.textToSpeech) {
        const audioUrl = await window.electron.elevenlabs.textToSpeech(text, {
          voice_id: voiceId,
          model_id: modelId,
          voice_settings: options?.voice_settings
        });
        
        if (this.audio) {
          this.audio.src = audioUrl;
          this.audio.play();
        }
        
        return audioUrl;
      }
      
      // Fall back to direct API call if no bridge
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: options?.voice_settings || {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Play the audio
        if (this.audio) {
          this.audio.src = audioUrl;
          this.audio.play();
        }
        
        return audioUrl;
      } else {
        console.error('ElevenLabs API error:', response.statusText);
        this.isSpeaking = false;
        this.triggerEndCallbacks();
        
        toast({
          title: "TTS Error",
          description: `Failed to generate speech: ${response.statusText}`,
          variant: "destructive"
        });
        
        return '';
      }
    } catch (error) {
      console.error('ElevenLabs speak error:', error);
      this.isSpeaking = false;
      this.triggerEndCallbacks();
      
      toast({
        title: "TTS Error",
        description: "An error occurred while generating speech.",
        variant: "destructive"
      });
      
      return '';
    }
  }
  
  // Stop speaking
  public stop(): void {
    if (this.audio && this.isSpeaking) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isSpeaking = false;
      this.triggerEndCallbacks();
    }
  }
}

// Create and export a singleton instance
export const elevenlabsTTS = new ElevenLabsTTS();
