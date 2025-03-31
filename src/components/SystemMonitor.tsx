
import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { Cpu, HardDrive, Microchip, Thermometer, Wifi, Clock } from 'lucide-react';
import 'react-circular-progressbar/dist/styles.css';

const SystemMonitor = () => {
  const [cpuTemp, setCpuTemp] = useState(45);
  const [cpuUsage, setCpuUsage] = useState(35);
  const [memoryUsage, setMemoryUsage] = useState(42);
  const [diskUsage, setDiskUsage] = useState(68);
  const [uptime, setUptime] = useState('2h 14m');
  const [network, setNetwork] = useState('Online');
  
  // In the actual Electron app, we would use the node-os-utils package
  // to get real system information
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fluctuating system metrics
      setCpuTemp(prev => Math.min(Math.max(prev + (Math.random() * 4 - 2), 35), 85));
      setCpuUsage(prev => Math.min(Math.max(prev + (Math.random() * 10 - 5), 10), 95));
      setMemoryUsage(prev => Math.min(Math.max(prev + (Math.random() * 8 - 4), 20), 90));
      setDiskUsage(prev => Math.min(Math.max(prev + (Math.random() * 2 - 1), 50), 95));
      
      // Update uptime
      const hours = Math.floor(Math.random() * 10) + 2;
      const minutes = Math.floor(Math.random() * 60);
      setUptime(`${hours}h ${minutes}m`);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
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
              value={cpuUsage} 
              text={`${Math.round(cpuUsage)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: cpuUsage > 80 ? '#FF5757' : cpuUsage > 60 ? '#FFB800' : '#0AEFFF',
                textColor: cpuUsage > 80 ? '#FF5757' : cpuUsage > 60 ? '#FFB800' : '#0AEFFF',
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
              value={memoryUsage} 
              text={`${Math.round(memoryUsage)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: memoryUsage > 80 ? '#FF5757' : memoryUsage > 60 ? '#FFB800' : '#0AEFFF',
                textColor: memoryUsage > 80 ? '#FF5757' : memoryUsage > 60 ? '#FFB800' : '#0AEFFF',
                trailColor: '#1E2A3A',
              })}
            />
          </div>
          <span className="text-xs text-muted-foreground">RAM</span>
        </div>
        
        <div className="glass-panel p-2 flex flex-col items-center">
          <div className="w-14 h-14 mb-2">
            <CircularProgressbar 
              value={diskUsage} 
              text={`${Math.round(diskUsage)}%`}
              styles={buildStyles({
                textSize: '25px',
                pathColor: diskUsage > 80 ? '#FF5757' : diskUsage > 60 ? '#FFB800' : '#0AEFFF',
                textColor: diskUsage > 80 ? '#FF5757' : diskUsage > 60 ? '#FFB800' : '#0AEFFF',
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
            <span>{uptime}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Wifi size={14} className="text-jarvis-blue mr-2" />
              <span>Network</span>
            </div>
            <span className="text-jarvis-success">{network}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Microchip size={14} className="text-jarvis-blue mr-2" />
              <span>Memory Available</span>
            </div>
            <span>{Math.round(100 - memoryUsage)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <HardDrive size={14} className="text-jarvis-blue mr-2" />
              <span>Disk Space</span>
            </div>
            <span>{Math.round(100 - diskUsage)}% Free</span>
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
