
import { toast } from "@/components/ui/use-toast";
import { loadOwnerProfile, updateFaceSignature } from "@/utils/memoryManager";

// Types for face recognition
export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  timestamp: number;
}

export interface FaceRecognitionResult {
  personId?: string;
  name?: string;
  confidence: number;
  isOwner: boolean;
  timestamp: number;
}

// Local storage keys
const FACE_HISTORY_KEY = 'karna-face-recognition-history';

// Process face detection result
export const processFaceDetection = async (imageData: string): Promise<FaceDetectionResult> => {
  try {
    // Try to use electron API first for face detection
    if (window.electron?.emotionAnalysis?.analyzeFrame) {
      const result = await window.electron.emotionAnalysis.analyzeFrame(imageData);
      
      // Consider a detected face if confidence is high enough
      const detected = result.confidence > 0.5;
      
      return {
        detected,
        confidence: result.confidence,
        timestamp: Date.now()
      };
    }
    
    // Fallback for browser environments - simplified detection
    const randomValue = Math.random();
    const detected = randomValue > 0.3; // 70% chance of detecting a face
    
    return {
      detected,
      confidence: detected ? 0.7 + (randomValue * 0.3) : 0.2 + (randomValue * 0.3),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error detecting face:', error);
    return {
      detected: false,
      confidence: 0,
      timestamp: Date.now()
    };
  }
};

// Recognize face owner
export const recognizeFace = async (imageData: string): Promise<FaceRecognitionResult> => {
  try {
    const ownerProfile = loadOwnerProfile();
    const detectionResult = await processFaceDetection(imageData);
    
    // If no face detected, return negative result
    if (!detectionResult.detected) {
      return {
        confidence: 0,
        isOwner: false,
        timestamp: Date.now()
      };
    }
    
    // Check if owner profile exists and has face signature
    if (ownerProfile && ownerProfile.faceSignature) {
      // In a real implementation, we would compare face signatures
      // For this demo, we'll use a random probability with higher likelihood of recognizing owner
      const randomValue = Math.random();
      const isOwner = randomValue > 0.4; // 60% chance of recognizing owner
      const confidence = isOwner ? 0.75 + (randomValue * 0.25) : 0.3 + (randomValue * 0.3);
      
      if (isOwner) {
        // Add to recognition history
        addToRecognitionHistory({
          personId: ownerProfile.id || "owner",
          name: ownerProfile.name,
          confidence,
          isOwner: true,
          timestamp: Date.now()
        });
        
        return {
          personId: ownerProfile.id || "owner",
          name: ownerProfile.name,
          confidence,
          isOwner: true,
          timestamp: Date.now()
        };
      }
    }
    
    // Face detected but not recognized as owner
    // In a real system, you might check against a database of known faces
    addToRecognitionHistory({
      confidence: detectionResult.confidence * 0.5,
      isOwner: false,
      timestamp: Date.now()
    });
    
    return {
      confidence: detectionResult.confidence * 0.5,
      isOwner: false,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error recognizing face:', error);
    return {
      confidence: 0,
      isOwner: false,
      timestamp: Date.now()
    };
  }
};

// Add face recognition result to history
const addToRecognitionHistory = (result: FaceRecognitionResult) => {
  try {
    const history = getRecognitionHistory();
    history.unshift(result);
    
    // Limit history size
    const limitedHistory = history.slice(0, 50);
    localStorage.setItem(FACE_HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error('Error adding to recognition history:', error);
  }
};

// Get face recognition history
export const getRecognitionHistory = (): FaceRecognitionResult[] => {
  try {
    const stored = localStorage.getItem(FACE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting recognition history:', error);
    return [];
  }
};

// Store face signature for owner
export const storeFaceSignature = async (imageData: string, name: string): Promise<boolean> => {
  try {
    // In a real implementation, this would extract facial features
    // For this demo, we'll just use a timestamp as a mock signature
    const signature = Date.now().toString();
    
    // Update the owner profile with the face signature
    const success = updateFaceSignature(signature);
    
    if (success) {
      toast({
        title: "Face Recognition Set",
        description: `I've saved your face signature, ${name}.`
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error storing face signature:', error);
    toast({
      title: "Error",
      description: "Failed to save face signature. Please try again.",
      variant: "destructive"
    });
    return false;
  }
};
