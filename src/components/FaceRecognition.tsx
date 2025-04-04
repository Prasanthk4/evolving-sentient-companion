
import React, { useRef, useEffect, useState } from 'react';
import { Camera, User, CheckCircle, XCircle, Shield } from 'lucide-react';
import { loadOwnerProfile } from '@/utils/memoryManager';
import { toast } from '@/components/ui/use-toast';
import { 
  recognizeFace, 
  processFaceDetection, 
  FaceRecognitionResult,
  storeFaceSignature 
} from '@/utils/faceRecognition';

const FaceRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [recognitionLog, setRecognitionLog] = useState<{time: string, text: string, isOwner: boolean}[]>([]);

  useEffect(() => {
    let faceDetectionInterval: NodeJS.Timeout;
    let mediaStream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 300,
            height: 225,
            facingMode: 'user' 
          } 
        });
        
        mediaStream = stream;
        setCameraPermission('granted');
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsDetecting(true);
          
          // Start face detection process
          faceDetectionInterval = setInterval(detectFace, 2000);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraPermission('denied');
        setIsDetecting(false);
      }
    };
    
    startCamera();
    
    return () => {
      clearInterval(faceDetectionInterval);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const detectFace = async () => {
    if (!canvasRef.current || !videoRef.current || !videoRef.current.srcObject) return;
    
    try {
      // Capture current frame from video
      const context = canvasRef.current.getContext('2d');
      if (!context) return;
      
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      // Process face recognition
      const recognitionResult = await recognizeFace(imageData);
      
      setFaceDetected(recognitionResult.confidence > 0.5);
      setConfidence(Math.floor(recognitionResult.confidence * 100));
      
      if (recognitionResult.confidence > 0.5) {
        // Face detected with sufficient confidence
        if (recognitionResult.isOwner && recognitionResult.name) {
          setUser(recognitionResult.name);
          
          // Add log entry if not too many already
          if (recognitionLog.length === 0 || 
              recognitionLog[0].text !== `${recognitionResult.name} recognized`) {
            const now = new Date();
            setRecognitionLog(prev => [{
              time: now.toLocaleTimeString(),
              text: `${recognitionResult.name} recognized`,
              isOwner: true
            }, ...prev.slice(0, 9)]);
          }
          
          // First time recognition for owner
          const ownerProfile = loadOwnerProfile();
          if (ownerProfile && !ownerProfile.faceSignature) {
            await storeFaceSignature(imageData, recognitionResult.name);
          }
        } else {
          setUser(null);
          
          // Add log entry if not too many already and different from last one
          if (recognitionLog.length === 0 || 
              recognitionLog[0].text !== "Unknown face detected") {
            const now = new Date();
            setRecognitionLog(prev => [{
              time: now.toLocaleTimeString(),
              text: "Unknown face detected",
              isOwner: false
            }, ...prev.slice(0, 9)]);
          }
        }
        
        // Draw face detection box
        drawFaceDetectionBox(context, recognitionResult.isOwner);
      } else {
        // No face with sufficient confidence
        setFaceDetected(false);
        setUser(null);
        
        // Clear canvas
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }
  };

  const drawFaceDetectionBox = (context: CanvasRenderingContext2D, isOwner: boolean) => {
    if (!canvasRef.current) return;
    
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw face detection box - in a real app this would use actual face coordinates
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const boxWidth = 100 + Math.random() * 20;
    const boxHeight = 100 + Math.random() * 20;
    
    context.beginPath();
    context.rect(
      centerX - boxWidth / 2, 
      centerY - boxHeight / 2, 
      boxWidth, 
      boxHeight
    );
    context.strokeStyle = isOwner ? '#00FF9D' : '#0AEFFF';
    context.lineWidth = 2;
    context.stroke();
    
    // Add confidence text
    context.font = '10px Arial';
    context.fillStyle = '#0AEFFF';
    context.fillText(`${confidence}%`, centerX - boxWidth / 2, centerY - boxHeight / 2 - 5);
  };

  const handleRequestCameraAccess = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      window.location.reload(); // Refresh to restart camera initialization
    } catch (error) {
      console.error('Failed to get camera permission:', error);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access in your browser settings to enable facial recognition.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="glass-panel p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Camera className="mr-2" /> Facial Recognition
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${isDetecting ? 'bg-jarvis-blue animate-pulse' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm text-muted-foreground">{isDetecting ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
      
      <div className="relative mb-4 bg-black rounded-lg overflow-hidden mx-auto">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover rounded-lg"
          autoPlay 
          playsInline 
          muted
        />
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={225}
          className="absolute top-0 left-0 w-full h-full"
        />
        
        {cameraPermission !== 'granted' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-jarvis-dark/80 p-4">
            <Shield className="text-jarvis-accent mb-2" size={24} />
            <p className="text-jarvis-blue text-sm text-center mb-3">
              {cameraPermission === 'denied' 
                ? "Camera access was denied" 
                : "Camera access is required for facial recognition"}
            </p>
            <button
              className="px-3 py-1.5 bg-jarvis-blue text-white text-xs rounded hover:bg-jarvis-blue-light transition-colors"
              onClick={handleRequestCameraAccess}
            >
              Grant Camera Access
            </button>
          </div>
        )}
      </div>
      
      <div className="glass-panel p-3 mb-4">
        <div className="flex items-center mb-2">
          <div className={`w-3 h-3 rounded-full mr-2 ${faceDetected ? 'bg-jarvis-success' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm">{faceDetected ? 'Face Detected' : 'No Face Detected'}</span>
        </div>
        
        {faceDetected && (
          <div className="flex items-center text-sm">
            <div className="flex-1">
              <div className="flex items-center">
                <User size={14} className="mr-1 text-jarvis-blue" />
                <span>{user ? user : 'Unknown'}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Confidence: {confidence}%
              </div>
            </div>
            <div>
              {user ? (
                <CheckCircle size={18} className="text-jarvis-success" />
              ) : (
                <XCircle size={18} className="text-jarvis-accent" />
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="glass-panel p-3 flex-1">
        <h3 className="text-sm font-medium mb-2">Recognition Log</h3>
        <div className="space-y-2 text-xs max-h-24 overflow-y-auto">
          {recognitionLog.length === 0 ? (
            <div className="text-center text-muted-foreground py-2">
              No recognition events recorded
            </div>
          ) : (
            recognitionLog.map((log, index) => (
              <React.Fragment key={index}>
                <div className={`flex justify-between items-center ${index > 0 ? 'opacity-' + (70 - index * 10) : ''}`}>
                  <span className="text-jarvis-blue">{log.time}</span>
                  <span>{log.text}</span>
                </div>
                {index < recognitionLog.length - 1 && (
                  <div className="h-px bg-jarvis-dark"></div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
