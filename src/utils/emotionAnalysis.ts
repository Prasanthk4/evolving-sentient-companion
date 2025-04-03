import { toast } from "@/components/ui/use-toast";

// Types for emotion analysis
export interface EmotionAnalysisResult {
  dominant: string;
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
    fearful: number;
    disgusted: number;
  };
  confidence: number;
  timestamp: number;
}

export interface GestureDetectionResult {
  gesture: string;
  confidence: number;
  timestamp: number;
}

// Local storage keys
const EMOTION_HISTORY_KEY = 'karna-emotion-history';
const EMOTION_SETTINGS_KEY = 'karna-emotion-settings';

// Default settings for emotion analysis
const defaultSettings = {
  captureInterval: 5000, // 5 seconds
  enabled: true,
  saveHistory: true,
  minConfidence: 0.6
};

// Get current settings
export const getEmotionSettings = () => {
  try {
    const stored = localStorage.getItem(EMOTION_SETTINGS_KEY);
    return { ...defaultSettings, ...(stored ? JSON.parse(stored) : {}) };
  } catch (error) {
    console.error('Error getting emotion settings:', error);
    return defaultSettings;
  }
};

// Save settings
export const saveEmotionSettings = (settings: typeof defaultSettings) => {
  try {
    localStorage.setItem(EMOTION_SETTINGS_KEY, JSON.stringify({
      ...getEmotionSettings(),
      ...settings
    }));
    return true;
  } catch (error) {
    console.error('Error saving emotion settings:', error);
    return false;
  }
};

// Analyze emotion from video frame
export const analyzeEmotion = async (videoElement: HTMLVideoElement | null): Promise<EmotionAnalysisResult | null> => {
  try {
    if (!videoElement || !window.electron?.emotionAnalysis) {
      throw new Error('Video element or emotion analysis API not available');
    }
    
    // Get settings
    const settings = getEmotionSettings();
    if (!settings.enabled) {
      return null;
    }
    
    // Create a canvas and draw the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw video frame on canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Send to emotion analysis API
    const result = await window.electron.emotionAnalysis.analyzeFrame(imageData);
    
    // Save to history if enabled
    if (settings.saveHistory && result.confidence >= settings.minConfidence) {
      saveEmotionToHistory(result);
    }
    
    return result;
  } catch (error) {
    console.error('Error analyzing emotion:', error);
    return null;
  }
};

// Detect gesture from video frame
export const detectGesture = async (videoElement: HTMLVideoElement | null): Promise<GestureDetectionResult | null> => {
  try {
    if (!videoElement || !window.electron?.emotionAnalysis) {
      throw new Error('Video element or gesture detection API not available');
    }
    
    // Create a canvas and draw the current video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Draw video frame on canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Send to gesture detection API
    return await window.electron.emotionAnalysis.detectGesture(imageData);
  } catch (error) {
    console.error('Error detecting gesture:', error);
    return null;
  }
};

// Save emotion result to history
const saveEmotionToHistory = (emotion: EmotionAnalysisResult) => {
  try {
    const history = getEmotionHistory();
    
    // Add new emotion and limit history size
    history.unshift(emotion);
    if (history.length > 100) {
      // Keep only the most recent 100 entries
      history.length = 100;
    }
    
    localStorage.setItem(EMOTION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving emotion to history:', error);
  }
};

// Get emotion history
export const getEmotionHistory = (): EmotionAnalysisResult[] => {
  try {
    // First try to use electron API if available
    if (window.electron?.emotionAnalysis?.getEmotionHistory) {
      // This is async, but for simplicity we'll fall back to local storage in this case
      window.electron.emotionAnalysis.getEmotionHistory()
        .then(history => {
          localStorage.setItem(EMOTION_HISTORY_KEY, JSON.stringify(history));
        })
        .catch(console.error);
    }
    
    // Use local storage
    const stored = localStorage.getItem(EMOTION_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting emotion history:', error);
    return [];
  }
};

// Start continuous emotion monitoring
export const startEmotionMonitoring = (
  videoElement: HTMLVideoElement | null,
  onEmotion: (emotion: EmotionAnalysisResult) => void,
  onGesture: (gesture: GestureDetectionResult) => void
) => {
  if (!videoElement) {
    return null;
  }
  
  const settings = getEmotionSettings();
  
  // Start the analysis interval
  const intervalId = setInterval(async () => {
    if (settings.enabled) {
      // Analyze emotion
      const emotion = await analyzeEmotion(videoElement);
      if (emotion && emotion.confidence >= settings.minConfidence) {
        onEmotion(emotion);
      }
      
      // Detect gesture
      const gesture = await detectGesture(videoElement);
      if (gesture && gesture.confidence >= settings.minConfidence) {
        onGesture(gesture);
      }
    }
  }, settings.captureInterval);
  
  // Return a function to stop monitoring
  return () => {
    clearInterval(intervalId);
  };
};

// Get appropriate response based on detected emotion
export const getEmotionAdjustedResponse = (
  baseResponse: string,
  emotion: EmotionAnalysisResult | null
): string => {
  if (!emotion || emotion.dominant === 'neutral') {
    return baseResponse;
  }
  
  // Adjust response based on dominant emotion
  switch (emotion.dominant) {
    case 'happy':
      return `${baseResponse} I'm glad to see you're in a good mood!`;
    case 'sad':
      return `${baseResponse} I notice you might be feeling down. Is there anything I can do to help?`;
    case 'angry':
      return `I understand you might be frustrated. ${baseResponse} Let me know if there's a better way I can assist you.`;
    case 'surprised':
      return `Wow! ${baseResponse} Your reaction tells me this might be unexpected information.`;
    case 'fearful':
      return `I sense you might be concerned. ${baseResponse} Please let me know if you need any clarification.`;
    case 'disgusted':
      return `${baseResponse} I notice you might not be pleased with this. Would you like me to try a different approach?`;
    default:
      return baseResponse;
  }
};
