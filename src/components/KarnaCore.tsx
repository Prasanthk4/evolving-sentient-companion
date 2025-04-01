
import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Activity, Database, Zap, Settings, Lightbulb } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { toast } from '@/components/ui/use-toast';
import 'react-circular-progressbar/dist/styles.css';

interface SystemStats {
  cpu: {
    usage: number;
  };
  memory: {
    usedPercentage: number;
  };
}

const KarnaCore = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [isActive, setIsActive] = useState(true);
  const [learningProgress, setLearningProgress] = useState(0);
  const [activeModules, setActiveModules] = useState({
    selfLearning: false,
    dataAnalysis: false,
    nlp: false,
    ollama: true,
    gemini: true,
    faceRecognition: false,
    speechRecognition: false,
    knowledgeDB: true,
    humorModule: true
  });

  // Connect to system stats from Electron
  useEffect(() => {
    const unsubscribe = window.electron?.systemStats.subscribe((stats: SystemStats) => {
      setSystemStats(stats);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Simulate KARNA's internal processing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const updateProcessingState = () => {
      // Randomly change the processing status
      const rand = Math.random();
      
      if (rand < 0.3) {
        setProcessingStatus('idle');
        setActiveModules(prev => ({
          ...prev,
          selfLearning: false,
          dataAnalysis: false,
          nlp: false
        }));
      } else if (rand < 0.5) {
        setProcessingStatus('processing');
        setActiveModules(prev => ({
          ...prev,
          selfLearning: false,
          dataAnalysis: false,
          nlp: true
        }));
      } else if (rand < 0.7) {
        setProcessingStatus('analyzing');
        setActiveModules(prev => ({
          ...prev,
          selfLearning: false,
          dataAnalysis: true,
          nlp: false
        }));
      } else {
        setProcessingStatus('learning');
        setActiveModules(prev => ({
          ...prev,
          selfLearning: true,
          dataAnalysis: false,
          nlp: false
        }));
        
        // Update learning progress
        setLearningProgress(prev => (prev + Math.random() * 10) % 100);
      }
      
      // Periodically update face/speech recognition status
      setActiveModules(prev => ({
        ...prev,
        faceRecognition: Math.random() > 0.5,
        speechRecognition: Math.random() > 0.7
      }));
      
      // Schedule next update
      timer = setTimeout(updateProcessingState, 5000 + Math.random() * 5000);
    };
    
    // Initial update
    updateProcessingState();
    
    // Clean up
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleAdvancedSettings = () => {
    toast({
      title: "Advanced Settings",
      description: "KARNA's advanced settings interface will be available in a future update."
    });
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Brain className="mr-2" /> KARNA Core Systems
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${isActive ? 'bg-jarvis-success' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm text-muted-foreground">{isActive ? 'Active' : 'Standby'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="glass-panel p-3 flex flex-col items-center">
          <div className="w-16 h-16 mb-2">
            <CircularProgressbar 
              value={systemStats?.cpu.usage || 0} 
              text={`${Math.round(systemStats?.cpu.usage || 0)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: `rgba(10, 239, 255, ${(systemStats?.cpu.usage || 0) / 100})`,
                textColor: '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">CPU Usage</div>
            <div className="flex items-center justify-center mt-1">
              <Cpu size={14} className="text-jarvis-blue mr-1" />
              <span className="text-xs">{processingStatus === 'processing' ? 'High Load' : 'Normal'}</span>
            </div>
          </div>
        </div>
        
        <div className="glass-panel p-3 flex flex-col items-center">
          <div className="w-16 h-16 mb-2">
            <CircularProgressbar 
              value={systemStats?.memory.usedPercentage || 0} 
              text={`${Math.round(systemStats?.memory.usedPercentage || 0)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: (systemStats?.memory.usedPercentage || 0) > 70 ? '#FF5757' : `rgba(10, 239, 255, ${(systemStats?.memory.usedPercentage || 0) / 100})`,
                textColor: (systemStats?.memory.usedPercentage || 0) > 70 ? '#FF5757' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Memory</div>
            <div className="flex items-center justify-center mt-1">
              <Database size={14} className="text-jarvis-blue mr-1" />
              <span className="text-xs">{(systemStats?.memory.usedPercentage || 0) > 70 ? 'Warning' : 'Optimal'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-3 mb-4">
        <div className="text-sm mb-2 flex items-center">
          <Activity className="text-jarvis-blue mr-2" size={16} />
          <span>System Status: <span className="text-jarvis-blue">{processingStatus.charAt(0).toUpperCase() + processingStatus.slice(1)}</span></span>
        </div>
        <div className="bg-jarvis-dark h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-jarvis-blue to-jarvis-blue-light"
            style={{ width: `${processingStatus === 'idle' ? 15 : 65}%`, transition: 'width 1s ease-in-out' }}
          ></div>
        </div>
      </div>
      
      {processingStatus === 'learning' && (
        <div className="glass-panel p-3 mb-4">
          <div className="text-sm mb-2 flex items-center">
            <Lightbulb className="text-jarvis-blue mr-2" size={16} />
            <span>Self-Learning Progress</span>
          </div>
          <div className="bg-jarvis-dark h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-jarvis-accent to-jarvis-success"
              style={{ width: `${learningProgress}%`, transition: 'width 0.5s ease-in-out' }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="glass-panel p-3 flex-1">
        <h3 className="text-sm font-medium mb-2 flex items-center">
          <Zap className="text-jarvis-blue mr-1" size={14} /> Active Processes
        </h3>
        <div className="space-y-2 text-xs">
          {activeModules.selfLearning && (
            <div className="flex justify-between items-center">
              <span>Self-Learning Module</span>
              <span className="text-jarvis-success">Active</span>
            </div>
          )}
          {activeModules.dataAnalysis && (
            <div className="flex justify-between items-center">
              <span>Data Analysis Engine</span>
              <span className="text-jarvis-blue">Running</span>
            </div>
          )}
          {activeModules.nlp && (
            <div className="flex justify-between items-center">
              <span>Natural Language Processing</span>
              <span className="text-jarvis-blue">Running</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span>Ollama Interface</span>
            <span className="text-jarvis-blue">Connected</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Gemini Interface</span>
            <span className="text-jarvis-blue">Standby</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Facial Recognition</span>
            <span className={activeModules.faceRecognition ? "text-jarvis-blue" : "text-muted-foreground"}>
              {activeModules.faceRecognition ? 'Active' : 'Standby'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Speech Recognition</span>
            <span className={activeModules.speechRecognition ? "text-jarvis-blue" : "text-muted-foreground"}>
              {activeModules.speechRecognition ? 'Active' : 'Standby'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Knowledge Database</span>
            <span className="text-jarvis-blue">Connected</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Humor Module</span>
            <span className="text-jarvis-blue">Active</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-3">
        <button 
          className="text-xs flex items-center text-muted-foreground hover:text-jarvis-blue transition-colors"
          onClick={handleAdvancedSettings}
        >
          <Settings size={12} className="mr-1" /> Advanced Settings
        </button>
      </div>
    </div>
  );
};

export default KarnaCore;
