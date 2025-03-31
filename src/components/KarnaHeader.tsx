
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Info, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";

const KarnaHeader = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState<'online' | 'learning' | 'processing'>('online');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    const statusTimer = setInterval(() => {
      const statuses: ('online' | 'learning' | 'processing')[] = ['online', 'learning', 'processing'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setSystemStatus(randomStatus);
    }, 15000);
    
    return () => {
      clearInterval(timer);
      clearInterval(statusTimer);
    };
  }, []);
  
  return (
    <header className="glass-panel px-6 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="mr-2 md:hidden text-jarvis-blue" 
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>
        <div className="flex items-center">
          <div className="h-8 w-8 mr-3 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-jarvis-blue to-jarvis-blue-light rounded-full opacity-70 animate-spin-slow"></div>
            <div className="absolute inset-1 bg-jarvis-dark rounded-full flex items-center justify-center">
              <span className="text-jarvis-blue text-xs font-mono">K</span>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-xl jarvis-gradient-text">KARNA</h1>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${
                systemStatus === 'online' ? 'bg-jarvis-success' : 
                systemStatus === 'learning' ? 'bg-jarvis-warning' :
                'bg-jarvis-blue animate-pulse'
              }`}></div>
              <span className="text-xs text-muted-foreground capitalize">{systemStatus}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="hidden md:flex items-center">
        <div className="text-sm mr-6 font-mono text-jarvis-blue">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-sm text-muted-foreground">
          Self-Learning AI Companion with a sense of humor
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-jarvis-blue">
          <Bell size={18} />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-jarvis-blue">
          <Info size={18} />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-jarvis-blue">
          <Settings size={18} />
        </Button>
      </div>
    </header>
  );
};

export default KarnaHeader;
