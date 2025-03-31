
import React, { useState } from 'react';
import JarvisHeader from './JarvisHeader';
import JarvisCore from './JarvisCore';
import FaceRecognition from './FaceRecognition';
import SpeechRecognition from './SpeechRecognition';
import MultiAgentSystem from './MultiAgentSystem';
import { Database, Brain, Zap, Network, FileCode, MessageSquare, BarChart, ChevronLeft, ChevronRight } from 'lucide-react';

const JarvisDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="min-h-screen flex flex-col bg-jarvis-dark text-foreground">
      <JarvisHeader toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`transition-all duration-300 glass-panel flex flex-col border-r border-jarvis-blue/20 ${
            sidebarOpen ? 'w-20' : 'w-0 -ml-20'
          }`}
        >
          <div className="flex-1 py-4">
            <div className="flex flex-col items-center space-y-8">
              <NavButton icon={Brain} label="Think" active={true} />
              <NavButton icon={MessageSquare} label="Chat" />
              <NavButton icon={Database} label="Memory" />
              <NavButton icon={Zap} label="Learn" />
              <NavButton icon={Network} label="Connect" />
              <NavButton icon={FileCode} label="Code" />
              <NavButton icon={BarChart} label="Stats" />
            </div>
          </div>
          
          <button 
            onClick={toggleSidebar} 
            className="p-2 mx-auto mb-4 text-jarvis-blue hover:text-jarvis-blue-light transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto p-4">
          <div className={`fixed z-10 top-1/2 left-0 transform -translate-y-1/2 ${sidebarOpen ? 'hidden' : 'block'}`}>
            <button 
              onClick={toggleSidebar} 
              className="bg-jarvis-blue/20 p-2 rounded-r-lg text-jarvis-blue hover:text-jarvis-blue-light transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <JarvisCore />
                <MultiAgentSystem />
              </div>
              <SpeechRecognition />
            </div>
            
            <div className="lg:col-span-1">
              <FaceRecognition />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ icon: Icon, label, active }) => {
  return (
    <button 
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center group transition-all relative ${
        active ? 'bg-jarvis-blue text-white' : 'text-muted-foreground hover:text-jarvis-blue'
      }`}
    >
      <Icon size={20} />
      <span className="text-xs mt-1">{label}</span>
      
      {active && (
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-jarvis-blue rounded-full"></div>
      )}
    </button>
  );
};

export default JarvisDashboard;
