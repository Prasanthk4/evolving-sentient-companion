
import React, { useRef, useEffect, useState } from 'react';
import { Camera, User, CheckCircle, Shield } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { 
  loadOwnerProfile, 
  updateFaceSignature, 
  recognizeOwnerFace 
} from '@/utils/memoryManager';
import { toast } from '@/components/ui/use-toast';

const FaceRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [recognitionLog, setRecognitionLog] = useState<{time: string, text: string, isOwner: boolean}[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        // Create models directory in user data path using Electron IPC
        if (window.electron) {
          window.electron.sendMessage('create-directory', 'models');
        }
        
        // Use production models path
        const modelPath = '/models';
        
        // Clear any previous model load error
        setModelLoadError(null);
        
        // Load face-api models with error handling
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath).catch(error => {
            console.error('Error loading tinyFaceDetector model:', error);
            throw new Error('Failed to load face detector model');
          }),
          
          faceapi.nets.faceLandmark68Net.loadFromUri(modelPath).catch(error => {
            console.error('Error loading faceLandmark68Net model:', error);
            throw new Error('Failed to load face landmark model');
          }),
          
          faceapi.nets.faceRecognitionNet.loadFromUri(modelPath).catch(error => {
            console.error('Error loading faceRecognitionNet model:', error);
            throw new Error('Failed to load face recognition model');
          })
        ]);
        
        // Optional: Load face expression model if needed
        try {
          await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
        } catch (error) {
          console.warn('Face expression model not loaded, but continuing:', error);
          // Non-critical, so we continue
        }
        
        setModelsLoaded(true);
        console.log('Face API models loaded successfully');
      } catch (error) {
        console.error('Error loading face-api models:', error);
        setModelLoadError(error instanceof Error ? error.message : 'Unknown error loading face models');
        setModelsLoaded(false);
        
        toast({
          title: "Face Recognition Error",
          description: "Failed to load facial recognition models. Some features may be limited.",
          variant: "destructive"
        });
      }
    };

    loadModels();

    return () => {
      // Clean up resources when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
          
          if (modelsLoaded) {
            // Start real face detection once models are loaded and camera is ready
            faceDetectionInterval = setInterval(detectFaces, 1000);
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraPermission('denied');
        setIsDetecting(false);
      }
    };
    
    if (modelsLoaded) {
      startCamera();
    }
    
    return () => {
      clearInterval(faceDetectionInterval);
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [modelsLoaded]);

  const detectFaces = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Make sure video is playing
    if (video.paused || video.ended || !video.readyState) return;
    
    // Configure options for the detector
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 160,
      scoreThreshold: 0.5
    });

    try {
      // Detect face with landmarks and expressions
      const detections = await faceapi.detectAllFaces(video, options)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptors();
      
      // Clear previous drawings
      const context = canvas.getContext('2d');
      if (context) context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Adjust canvas dimensions to match video
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);
      
      // Resize detections to match display size
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      if (resizedDetections.length > 0) {
        setFaceDetected(true);
        
        // Get the first detected face
        const detection = resizedDetections[0];
        const descriptor = detection.descriptor;
        
        // Draw detections on canvas
        faceapi.draw.drawDetections(canvas, [detection]);
        faceapi.draw.drawFaceLandmarks(canvas, [detection]);
        
        // Calculate a real confidence score
        const faceScore = Math.round(detection.detection.score * 100);
        setConfidence(faceScore);
        
        // Check if we have owner data to recognize
        const ownerProfile = loadOwnerProfile();
        
        if (ownerProfile) {
          if (ownerProfile.faceSignature) {
            // If we have a stored face signature, compare with current detection
            const storedFaceDescriptor = Float32Array.from(
              Object.values(JSON.parse(ownerProfile.faceSignature))
            );
            
            // Calculate Euclidean distance (lower means more similar)
            // A threshold of 0.6 is common for face recognition
            const distance = faceapi.euclideanDistance(descriptor, storedFaceDescriptor);
            const isMatch = distance < 0.6; // Below 0.6 is usually considered a match
            
            if (isMatch) {
              setUser(ownerProfile.name);
              
              // Add log entry if not too many already
              if (recognitionLog.length === 0 || 
                  recognitionLog[0].text !== `${ownerProfile.name} recognized`) {
                const now = new Date();
                setRecognitionLog(prev => [{
                  time: now.toLocaleTimeString(),
                  text: `${ownerProfile.name} recognized (distance: ${distance.toFixed(2)})`,
                  isOwner: true
                }, ...prev.slice(0, 9)]);
              }
            } else {
              setUser(null);
              
              // Add log entry for unknown face
              if (recognitionLog.length === 0 || 
                  recognitionLog[0].text !== "Unknown face detected") {
                const now = new Date();
                setRecognitionLog(prev => [{
                  time: now.toLocaleTimeString(),
                  text: `Unknown face detected (distance: ${distance.toFixed(2)})`,
                  isOwner: false
                }, ...prev.slice(0, 9)]);
              }
            }
          } else {
            // First time seeing owner's face, ask to register
            setUser(null);
            setFaceDescriptor(descriptor);
            
            // Add registration suggestion to log
            if (recognitionLog.length === 0 || 
                recognitionLog[0].text !== "Face detected - register as owner?") {
              const now = new Date();
              setRecognitionLog(prev => [{
                time: now.toLocaleTimeString(),
                text: "Face detected - register as owner?",
                isOwner: false
              }, ...prev.slice(0, 9)]);
            }
          }
        } else {
          // No owner profile yet
          setUser(null);
          setFaceDescriptor(descriptor);
        }
      } else {
        // No face detected
        setFaceDetected(false);
        setUser(null);
        setFaceDescriptor(null);
        
        // Clear canvas
        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }
  };

  const handleSaveFace = () => {
    if (!faceDescriptor) return;
    
    const ownerProfile = loadOwnerProfile();
    if (ownerProfile) {
      // Save the face descriptor as a string
      updateFaceSignature(JSON.stringify(Array.from(faceDescriptor)));
      
      toast({
        title: "Face Recognition Set",
        description: `I've saved your face signature, ${ownerProfile.name}.`
      });
      
      // Update UI to show registered status
      setUser(ownerProfile.name);
    } else {
      toast({
        title: "Owner Profile Missing",
        description: "Please set up your profile by voice command first. Say 'My name is [your name]'."
      });
    }
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
          <span className="text-sm text-muted-foreground">
            {!modelsLoaded ? (modelLoadError ? 'Model Error' : 'Loading models...') : isDetecting ? 'Active' : 'Inactive'}
          </span>
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
        
        {modelLoadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-jarvis-dark/80 p-4">
            <Shield className="text-jarvis-accent mb-2" size={24} />
            <p className="text-jarvis-blue text-sm text-center mb-3">
              Face recognition model loading error
            </p>
            <p className="text-xs text-jarvis-accent/80 text-center mb-3">
              {modelLoadError}
            </p>
            <button
              className="px-3 py-1.5 bg-jarvis-blue text-white text-xs rounded hover:bg-jarvis-blue-light transition-colors"
              onClick={() => window.location.reload()}
            >
              Retry Loading Models
            </button>
          </div>
        )}
        
        {cameraPermission !== 'granted' && !modelLoadError && (
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
                faceDescriptor && (
                  <button
                    onClick={handleSaveFace}
                    className="text-xs bg-jarvis-blue hover:bg-jarvis-blue-light text-white px-2 py-1 rounded transition-colors"
                  >
                    Register Face
                  </button>
                )
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
