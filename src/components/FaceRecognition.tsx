
import React, { useRef, useEffect, useState } from 'react';
import { Camera, User, CheckCircle, XCircle } from 'lucide-react';

// This is a simplified version using the browser's face detection API
// In a real implementation, you would use a more sophisticated library like face-api.js or MediaPipe
const FaceRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    let faceDetectionInterval: NodeJS.Timeout;
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 300,
            height: 225,
            facingMode: 'user' 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Simulate face detection
          setIsDetecting(true);
          faceDetectionInterval = setInterval(() => {
            const randomValue = Math.random();
            if (randomValue > 0.3) {
              setFaceDetected(true);
              setConfidence(Math.floor(Math.random() * 30) + 70); // 70-99% confidence
              
              // Simulate recognized user (toggle between known and unknown)
              if (randomValue > 0.6) {
                setUser("User");
              } else {
                setUser(null);
              }
              
              // Draw face box on canvas
              if (canvasRef.current && videoRef.current) {
                const context = canvasRef.current.getContext('2d');
                if (context) {
                  context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  
                  // Draw face detection box
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
                  context.strokeStyle = user ? '#00FF9D' : '#0AEFFF';
                  context.lineWidth = 2;
                  context.stroke();
                  
                  // Add confidence text
                  context.font = '10px Arial';
                  context.fillStyle = '#0AEFFF';
                  context.fillText(`${confidence}%`, centerX - boxWidth / 2, centerY - boxHeight / 2 - 5);
                }
              }
            } else {
              // No face detected
              setFaceDetected(false);
              setUser(null);
              
              // Clear canvas
              if (canvasRef.current) {
                const context = canvasRef.current.getContext('2d');
                if (context) {
                  context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
              }
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setIsDetecting(false);
      }
    };
    
    startCamera();
    
    return () => {
      clearInterval(faceDetectionInterval);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

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
        
        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-jarvis-dark/80">
            <p className="text-jarvis-blue text-sm">Camera not available</p>
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
          {faceDetected && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-jarvis-blue">{new Date().toLocaleTimeString()}</span>
                <span>{user ? `${user} recognized` : 'Unknown face detected'}</span>
              </div>
              <div className="h-px bg-jarvis-dark"></div>
            </>
          )}
          <div className="flex justify-between items-center opacity-70">
            <span className="text-jarvis-blue">10:42:15</span>
            <span>User recognized</span>
          </div>
          <div className="h-px bg-jarvis-dark"></div>
          <div className="flex justify-between items-center opacity-70">
            <span className="text-jarvis-blue">10:35:22</span>
            <span>Unknown face detected</span>
          </div>
          <div className="h-px bg-jarvis-dark"></div>
          <div className="flex justify-between items-center opacity-50">
            <span className="text-jarvis-blue">10:21:03</span>
            <span>User recognized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;
