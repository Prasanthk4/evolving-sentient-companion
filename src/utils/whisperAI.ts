
import { toast } from "@/components/ui/use-toast";

// Types for Whisper AI
export interface WhisperResult {
  text: string;
  segments: {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }[];
  language: string;
}

export interface WhisperOptions {
  model?: string;       // Model to use (e.g., 'tiny', 'small', 'medium', 'large')
  language?: string;    // Language code (e.g., 'en', 'fr', 'es')
  temperature?: number; // Sampling temperature (0-1)
  prompt?: string;      // Additional context to improve transcription
}

// Default options
const defaultOptions: WhisperOptions = {
  model: 'small',
  language: 'en',
  temperature: 0.0,
  prompt: ''
};

// Local storage key for transcription history
const WHISPER_HISTORY_KEY = 'karna-whisper-history';

// Whisper API integration
export class WhisperAPI {
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private recorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  constructor() {
    // Check if electron bridge is available for local Whisper
    if (typeof window !== 'undefined' && window.electron?.speechToText) {
      this.isInitialized = true;
    }
  }
  
  // Initialize recorder
  public async initializeRecorder(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recorder = new MediaRecorder(stream);
      
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing recorder:', error);
      toast({
        title: "Microphone Access Error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive"
      });
      return false;
    }
  }
  
  // Start recording
  public startRecording(): boolean {
    if (!this.isInitialized) {
      this.initializeRecorder().then(initialized => {
        if (initialized && this.recorder) {
          this.audioChunks = [];
          this.recorder.start();
          return true;
        }
        return false;
      });
      return false;
    }
    
    if (!this.recorder) return false;
    
    this.audioChunks = [];
    this.recorder.start();
    return true;
  }
  
  // Stop recording and transcribe
  public async stopRecordingAndTranscribe(options: Partial<WhisperOptions> = {}): Promise<WhisperResult | null> {
    if (!this.recorder || !this.isInitialized) {
      return null;
    }
    
    return new Promise((resolve) => {
      this.recorder!.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const result = await this.transcribeAudio(audioBlob, options);
        resolve(result);
      };
      
      this.recorder!.stop();
    });
  }
  
  // Transcribe audio
  public async transcribeAudio(audioBlob: Blob, options: Partial<WhisperOptions> = {}): Promise<WhisperResult | null> {
    if (this.isProcessing) {
      toast({
        title: "Processing in Progress",
        description: "Please wait for the current transcription to complete."
      });
      return null;
    }
    
    this.isProcessing = true;
    
    try {
      // Combine options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // First try using electron bridge for local Whisper
      if (window.electron?.speechToText?.transcribeAudio) {
        const result = await window.electron.speechToText.transcribeAudio(audioBlob, mergedOptions);
        
        // Save to history
        this.saveToHistory(result);
        
        this.isProcessing = false;
        return result;
      }
      
      // If no electron bridge, use mock implementation
      console.log(`Transcribing audio with options:`, mergedOptions);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create mock result
      const mockResult: WhisperResult = {
        text: "This is a simulated transcription. Whisper AI is not available in this environment.",
        segments: [
          {
            id: 0,
            start: 0,
            end: 3.5,
            text: "This is a simulated transcription.",
            confidence: 0.95
          },
          {
            id: 1,
            start: 3.5,
            end: 6.0,
            text: "Whisper AI is not available in this environment.",
            confidence: 0.9
          }
        ],
        language: mergedOptions.language || 'en'
      };
      
      // Save to history
      this.saveToHistory(mockResult);
      
      this.isProcessing = false;
      return mockResult;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive"
      });
      
      this.isProcessing = false;
      return null;
    }
  }
  
  // Save result to history
  private saveToHistory(result: WhisperResult): void {
    try {
      const history = this.getHistory();
      history.unshift({
        ...result,
        timestamp: Date.now()
      });
      
      // Limit history size to 50 entries
      const limitedHistory = history.slice(0, 50);
      localStorage.setItem(WHISPER_HISTORY_KEY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving to Whisper history:', error);
    }
  }
  
  // Get history
  public getHistory(): Array<WhisperResult & { timestamp: number }> {
    try {
      const stored = localStorage.getItem(WHISPER_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting Whisper history:', error);
      return [];
    }
  }
  
  // Check if Whisper API is available
  public isAvailable(): boolean {
    return this.isInitialized;
  }
  
  // Check if currently processing
  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

// Create a singleton instance
export const whisperAPI = new WhisperAPI();
