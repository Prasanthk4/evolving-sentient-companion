
import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Cpu, HardDrive, Microchip, Thermometer, Wifi, Clock } from 'lucide-react';
import 'react-circular-progressbar/dist/styles.css';

interface SystemStats {
  cpu: {
    usage: number;
    count: number;
    model: string;
  };
  memory: {
    total: number;
    free: number;
    usedPercentage: number;
  };
  disk: {
    usedPercentage: number;
  };
  uptime: number;
}

const SystemMonitor = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [cpuTemp, setCpuTemp] = useState(45); // Temperature still simulated as it requires additional tools
  
  useEffect(() => {
    // Subscribe to system stats updates from Electron
    const unsubscribe = window.electron?.systemStats.subscribe((stats: SystemStats) => {
      setSystemStats(stats);
      // Simulate CPU temp fluctuations - in a real system this would come from native APIs
      setCpuTemp(prev => Math.min(Math.max(prev + (Math.random() * 2 - 1), 35), 85));
    });
    
    // Cleanup subscription on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Format uptime to hours and minutes
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };
  
  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Cpu className="mr-2" /> System Monitor
        </h2>
        <div className="text-sm text-muted-foreground">
          Desktop Resources
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-panel p-2 flex flex-col items-center">
          <div className="w-14 h-14 mb-2">
            <CircularProgressbar 
              value={systemStats?.cpu.usage || 0} 
              text={`${Math.round(systemStats?.cpu.usage || 0)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: (systemStats?.cpu.usage || 0) > 80 ? '#FF5757' : (systemStats?.cpu.usage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                textColor: (systemStats?.cpu.usage || 0) > 80 ? '#FF5757' : (systemStats?.cpu.usage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <span className="text-xs text-muted-foreground">CPU</span>
        </div>
        
        <div className="glass-panel p-2 flex flex-col items-center">
          <div className="w-14 h-14 mb-2">
            <CircularProgressbar 
              value={cpuTemp} 
              text={`${Math.round(cpuTemp)}°`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: cpuTemp > 75 ? '#FF5757' : cpuTemp > 65 ? '#FFB800' : '#0AEFFF',
                textColor: cpuTemp > 75 ? '#FF5757' : cpuTemp > 65 ? '#FFB800' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <span className="text-xs text-muted-foreground">Temp</span>
        </div>
        
        <div className="glass-panel p-2 flex flex-col items-center">
          <div className="w-14 h-14 mb-2">
            <CircularProgressbar 
              value={systemStats?.memory.usedPercentage || 0} 
              text={`${Math.round(systemStats?.memory.usedPercentage || 0)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: (systemStats?.memory.usedPercentage || 0) > 80 ? '#FF5757' : (systemStats?.memory.usedPercentage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                textColor: (systemStats?.memory.usedPercentage || 0) > 80 ? '#FF5757' : (systemStats?.memory.usedPercentage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <span className="text-xs text-muted-foreground">RAM</span>
        </div>
        
        <div className="glass-panel p-2 flex flex-col items-center">
          <div className="w-14 h-14 mb-2">
            <CircularProgressbar 
              value={systemStats?.disk.usedPercentage || 0} 
              text={`${Math.round(systemStats?.disk.usedPercentage || 0)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: (systemStats?.disk.usedPercentage || 0) > 80 ? '#FF5757' : (systemStats?.disk.usedPercentage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                textColor: (systemStats?.disk.usedPercentage || 0) > 80 ? '#FF5757' : (systemStats?.disk.usedPercentage || 0) > 60 ? '#FFB800' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <span className="text-xs text-muted-foreground">Disk</span>
        </div>
      </div>
      
      <div className="glass-panel p-3 mb-4">
        <h3 className="text-sm font-medium mb-2">System Information</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Clock size={14} className="text-jarvis-blue mr-2" />
              <span>Uptime</span>
            </div>
            <span>{systemStats ? formatUptime(systemStats.uptime) : 'Loading...'}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Wifi size={14} className="text-jarvis-blue mr-2" />
              <span>Network</span>
            </div>
            <span className="text-jarvis-success">Online</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Microchip size={14} className="text-jarvis-blue mr-2" />
              <span>Memory Available</span>
            </div>
            <span>{systemStats ? Math.round(100 - systemStats.memory.usedPercentage) : 0}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <HardDrive size={14} className="text-jarvis-blue mr-2" />
              <span>Disk Space</span>
            </div>
            <span>{systemStats ? Math.round(100 - systemStats.disk.usedPercentage) : 0}% Free</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Thermometer size={14} className="text-jarvis-blue mr-2" />
              <span>Temperature</span>
            </div>
            <span className={cpuTemp > 75 ? 'text-jarvis-accent' : cpuTemp > 65 ? 'text-jarvis-warning' : 'text-jarvis-success'}>
              {Math.round(cpuTemp)}°C
            </span>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-3 mt-auto">
        <div className="text-xs text-center text-muted-foreground">
          <p>KARNA is monitoring your system resources</p>
          <p className="text-jarvis-blue mt-1">All systems nominal. Feel free to ask me to optimize your computer!</p>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
