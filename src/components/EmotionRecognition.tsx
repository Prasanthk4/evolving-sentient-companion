
import React, { useRef, useState, useEffect } from 'react';
import { Camera, UserCheck, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { analyzeEmotion, detectGesture } from '@/utils/emotionAnalysis';
import EmotionDisplay from './EmotionDisplay';

const EmotionRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Start video stream when component mounts
  useEffect(() => {
    startVideo();
    
    return () => {
      stopVideo();
    };
  }, []);
  
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsVideoActive(true);
        setError(null);
        
        // Start face detection after a short delay
        setTimeout(() => {
          detectFace();
        }, 1000);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please check permissions.');
      setIsVideoActive(false);
    }
  };
  
  const stopVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsVideoActive(false);
    }
  };
  
  const toggleVideo = () => {
    if (isVideoActive) {
      stopVideo();
    } else {
      startVideo();
    }
  };
  
  const detectFace = async () => {
    // In a real implementation, this would use face detection libraries
    // For this mock, we'll just assume a face is detected after a random delay
    
    setTimeout(() => {
      if (isVideoActive) {
        const detected = Math.random() > 0.2; // 80% chance of detecting a face
        setIsFaceDetected(detected);
        
        // Broadcast face detection status
        window.dispatchEvent(new CustomEvent('karna-face-detection', {
          detail: { detected }
        }));
        
        // Continue detection loop
        if (isVideoActive) {
          detectFace();
        }
      }
    }, 2000 + Math.random() * 1000);
  };
  
  return (
    <div className="glass-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Camera className="mr-2" /> Emotion Recognition
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${isVideoActive ? 'bg-jarvis-success' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm text-muted-foreground">{isVideoActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      
      {error && (
        <div className="bg-jarvis-dark p-3 rounded-md text-jarvis-accent flex items-center mb-4">
          <AlertTriangle size={16} className="mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      <div className="flex-1 grid grid-cols-1 gap-4">
        <div className="glass-panel p-3 relative">
          {isVideoActive && showVideo ? (
            <div className="aspect-video bg-jarvis-dark rounded-md overflow-hidden relative">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {isFaceDetected && (
                <div className="absolute top-2 right-2 bg-jarvis-success/20 text-jarvis-success px-2 py-1 rounded text-xs flex items-center">
                  <UserCheck size={12} className="mr-1" />
                  <span>Face Detected</span>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-jarvis-dark rounded-md flex items-center justify-center">
              <div className="text-center">
                <Camera size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isVideoActive ? 'Video feed hidden' : 'Camera inactive'}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={isVideoActive ? "default" : "outline"}
                onClick={toggleVideo}
                className={isVideoActive ? "bg-jarvis-blue hover:bg-jarvis-blue-light text-white" : ""}
              >
                {isVideoActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
              
              {isVideoActive && (
                <div className="flex items-center space-x-1">
                  <Switch
                    checked={showVideo}
                    onCheckedChange={setShowVideo}
                    aria-label="Toggle video display"
                  />
                  <span className="text-xs flex items-center">
                    {showVideo ? <Eye size={12} className="mr-1" /> : <EyeOff size={12} className="mr-1" />}
                    {showVideo ? 'Show Feed' : 'Hide Feed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <EmotionDisplay videoRef={videoRef} />
      </div>
    </div>
  );
};

export default EmotionRecognition;
