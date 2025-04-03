
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Smile, Frown, AlertTriangle, Lightbulb, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { EmotionAnalysisResult, GestureDetectionResult, analyzeEmotion, detectGesture, startEmotionMonitoring } from '@/utils/emotionAnalysis';
import { Progress } from '@/components/ui/progress';

interface EmotionDisplayProps {
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const EmotionDisplay: React.FC<EmotionDisplayProps> = ({ videoRef }) => {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionAnalysisResult | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureDetectionResult | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [analysisCount, setAnalysisCount] = useState(0);
  
  // Reference to the stop function for emotion monitoring
  const stopMonitoringRef = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Start emotion monitoring when component mounts
    if (videoRef?.current) {
      const stopFn = startEmotionMonitoring(
        videoRef.current,
        (emotion) => {
          setCurrentEmotion(emotion);
          setAnalysisCount(prev => prev + 1);
        },
        (gesture) => {
          setCurrentGesture(gesture);
        }
      );
      
      stopMonitoringRef.current = stopFn;
      
      // Broadcast emotion and gesture to other components
      const broadcastEmotion = setInterval(() => {
        if (currentEmotion) {
          window.dispatchEvent(new CustomEvent('karna-emotion-update', {
            detail: { emotion: currentEmotion }
          }));
        }
        
        if (currentGesture) {
          window.dispatchEvent(new CustomEvent('karna-gesture-update', {
            detail: { gesture: currentGesture }
          }));
        }
      }, 1000);
      
      return () => {
        if (stopFn) stopFn();
        clearInterval(broadcastEmotion);
      };
    }
  }, [videoRef]);
  
  const toggleActive = () => {
    setIsActive(!isActive);
    
    // If turning off, stop monitoring
    if (isActive && stopMonitoringRef.current) {
      stopMonitoringRef.current();
      stopMonitoringRef.current = null;
    } else if (!isActive && videoRef?.current) {
      // If turning on, restart monitoring
      const stopFn = startEmotionMonitoring(
        videoRef.current,
        (emotion) => {
          setCurrentEmotion(emotion);
          setAnalysisCount(prev => prev + 1);
        },
        (gesture) => {
          setCurrentGesture(gesture);
        }
      );
      
      stopMonitoringRef.current = stopFn;
    }
  };
  
  const getEmotionIcon = (emotionName: string) => {
    switch (emotionName) {
      case 'happy':
        return <Smile className="text-green-400" />;
      case 'sad':
        return <Frown className="text-blue-400" />;
      case 'angry':
        return <AlertTriangle className="text-red-400" />;
      case 'surprised':
        return <Lightbulb className="text-yellow-400" />;
      default:
        return <Brain className="text-jarvis-blue" />;
    }
  };
  
  const getGestureIcon = (gestureName: string) => {
    switch (gestureName) {
      case 'thumbs_up':
        return <ThumbsUp className="text-green-400" />;
      case 'thumbs_down':
        return <ThumbsDown className="text-red-400" />;
      case 'wave':
        return <div className="text-yellow-400">👋</div>;
      case 'peace':
        return <div className="text-blue-400">✌️</div>;
      default:
        return null;
    }
  };
  
  return (
    <div className="glass-panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-lg font-semibold flex items-center">
          <Brain className="mr-2" /> Emotion Analysis
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${isActive ? 'bg-jarvis-success' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm text-muted-foreground">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col space-y-4">
        {!videoRef?.current && (
          <div className="bg-jarvis-dark p-3 rounded-md text-muted-foreground text-sm flex items-center">
            <AlertTriangle className="text-jarvis-accent mr-2" size={16} />
            <span>No video feed detected. Emotion analysis requires camera access.</span>
          </div>
        )}
        
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-3">Detected Emotion</h3>
          
          {currentEmotion ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-jarvis-dark rounded-full">
                  {getEmotionIcon(currentEmotion.dominant)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm capitalize">{currentEmotion.dominant}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(currentEmotion.confidence * 100)}% confidence
                    </span>
                  </div>
                  <Progress 
                    value={currentEmotion.confidence * 100} 
                    className="h-1.5 mt-1" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(currentEmotion.emotions).map(([emotion, value]) => (
                  <div key={emotion} className="bg-jarvis-dark/40 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs capitalize">{emotion}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(value * 100)}%</span>
                    </div>
                    <Progress value={value * 100} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
              <RefreshCw className="animate-spin mb-2" size={24} />
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
        </div>
        
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-3">Detected Gesture</h3>
          
          {currentGesture && currentGesture.gesture !== 'none' ? (
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-jarvis-dark rounded-full">
                {getGestureIcon(currentGesture.gesture)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-sm capitalize">{currentGesture.gesture.replace('_', ' ')}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(currentGesture.confidence * 100)}% confidence
                  </span>
                </div>
                <Progress 
                  value={currentGesture.confidence * 100} 
                  className="h-1.5 mt-1" 
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-muted-foreground">
              <span className="text-sm">No gesture detected</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-between mt-4 text-xs text-muted-foreground">
        <span>Analysis count: {analysisCount}</span>
        <button 
          className="text-jarvis-blue hover:underline" 
          onClick={toggleActive}
        >
          {isActive ? 'Pause Analysis' : 'Resume Analysis'}
        </button>
      </div>
    </div>
  );
};

export default EmotionDisplay;
