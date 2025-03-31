
import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Activity, Database, Zap, Settings, Lightbulb } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const KarnaCore = () => {
  const [cpuUsage, setCpuUsage] = useState(45);
  const [memoryUsage, setMemoryUsage] = useState(32);
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [isActive, setIsActive] = useState(true);
  const [learningProgress, setLearningProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(Math.max(prev + Math.random() * 10 - 5, 5), 90));
      setMemoryUsage(prev => Math.min(Math.max(prev + Math.random() * 8 - 4, 10), 80));
      
      const statuses = ['processing', 'learning', 'analyzing', 'idle'];
      const randomIndex = Math.floor(Math.random() * statuses.length);
      setProcessingStatus(statuses[randomIndex]);
      
      // Simulate learning progress
      if (statuses[randomIndex] === 'learning') {
        setLearningProgress(prev => (prev + Math.random() * 10) % 100);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
              value={cpuUsage} 
              text={`${cpuUsage}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: `rgba(10, 239, 255, ${cpuUsage / 100})`,
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
              value={memoryUsage} 
              text={`${memoryUsage}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: memoryUsage > 70 ? '#FF5757' : `rgba(10, 239, 255, ${memoryUsage / 100})`,
                textColor: memoryUsage > 70 ? '#FF5757' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Memory</div>
            <div className="flex items-center justify-center mt-1">
              <Database size={14} className="text-jarvis-blue mr-1" />
              <span className="text-xs">{memoryUsage > 70 ? 'Warning' : 'Optimal'}</span>
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
          {processingStatus === 'learning' && (
            <div className="flex justify-between items-center">
              <span>Self-Learning Module</span>
              <span className="text-jarvis-success">Active</span>
            </div>
          )}
          {processingStatus === 'analyzing' && (
            <div className="flex justify-between items-center">
              <span>Data Analysis Engine</span>
              <span className="text-jarvis-blue">Running</span>
            </div>
          )}
          {processingStatus === 'processing' && (
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
            <span className="text-jarvis-blue">Active</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Speech Recognition</span>
            <span className="text-jarvis-blue">Standby</span>
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
        <button className="text-xs flex items-center text-muted-foreground hover:text-jarvis-blue transition-colors">
          <Settings size={12} className="mr-1" /> Advanced Settings
        </button>
      </div>
    </div>
  );
};

export default KarnaCore;
