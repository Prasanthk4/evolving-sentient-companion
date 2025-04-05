import { toast } from "@/components/ui/use-toast";

// Extend the global Window interface
interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEventInterface) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

// Define the SpeechRecognitionEvent interface
interface SpeechRecognitionEventInterface {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

// Types for speech recognition
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

// Local storage key for speech history
const SPEECH_HISTORY_KEY = 'karna-speech-recognition-history';

// Speech recognition class
export class KarnaSpeechRecognition {
  private recognition: SpeechRecognitionInterface | null = null;
  private isListening: boolean = false;
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;

  constructor(options: SpeechRecognitionOptions = {}) {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || 
                                  (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI() as SpeechRecognitionInterface;
        this.recognition.continuous = options.continuous ?? true;
        this.recognition.interimResults = options.interimResults ?? true;
        this.recognition.lang = options.language ?? 'en-US';
        
        this.recognition.onresult = this.handleResult.bind(this);
        this.recognition.onend = this.handleEnd.bind(this);
        this.recognition.onerror = this.handleError.bind(this);
      } else {
        console.warn('Speech Recognition is not supported in this browser.');
        toast({
          title: "Speech Recognition Unavailable",
          description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
          variant: "destructive"
        });
      }
    }
  }

  // Start listening
  public start(): boolean {
    if (!this.recognition) {
      return false;
    }
    
    if (!this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        return true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        return false;
      }
    }
    
    return false; // Already listening
  }
  
  // Stop listening
  public stop(): boolean {
    if (!this.recognition || !this.isListening) {
      return false;
    }
    
    try {
      this.recognition.stop();
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  }
  
  // Check if currently listening
  public isRecognizing(): boolean {
    return this.isListening;
  }
  
  // Set result callback
  public onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }
  
  // Set end callback
  public onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }
  
  // Set error callback
  public onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }
  
  // Handle recognition result
  private handleResult(event: SpeechRecognitionEventInterface): void {
    if (!event.results.length) return;
    
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript;
    const confidence = result[0].confidence;
    const isFinal = result.isFinal;
    
    const recognitionResult: SpeechRecognitionResult = {
      transcript,
      confidence,
      isFinal,
      timestamp: Date.now()
    };
    
    if (isFinal) {
      // Add to history if it's a final result
      addToSpeechHistory(recognitionResult);
    }
    
    if (this.onResultCallback) {
      this.onResultCallback(recognitionResult);
    }
  }
  
  // Handle recognition end
  private handleEnd(): void {
    this.isListening = false;
    
    if (this.onEndCallback) {
      this.onEndCallback();
    }
  }
  
  // Handle recognition error
  private handleError(event: any): void {
    this.isListening = false;
    console.error('Speech recognition error:', event.error);
    
    if (this.onErrorCallback) {
      this.onErrorCallback(event);
    }
  }
}

// Add speech recognition result to history
export const addToSpeechHistory = (result: SpeechRecognitionResult): void => {
  try {
    const history = getSpeechHistory();
    history.unshift(result);
    
    // Limit history size
    const limitedHistory = history.slice(0, 50);
    localStorage.setItem(SPEECH_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error adding to speech history:', error);
  }
};

// Get speech recognition history
export const getSpeechHistory = (): SpeechRecognitionResult[] => {
  try {
    const stored = localStorage.getItem(SPEECH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting speech history:', error);
    return [];
  }
};

// Integration with Whisper AI or Vosk via Electron (if available)
export const transcribeAudioWithWhisper = async (audioData: Blob): Promise<string> => {
  try {
    if (window.electron?.speechToText?.transcribeAudio) {
      const result = await window.electron.speechToText.transcribeAudio(audioData);
      return result.transcript;
    }
    
    throw new Error('Whisper AI integration not available');
  } catch (error) {
    console.error('Error transcribing with Whisper:', error);
    throw error;
  }
};
