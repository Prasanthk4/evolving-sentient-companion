
import React, { useState, useEffect } from 'react';
import KarnaHeader from './KarnaHeader';
import KarnaCore from './KarnaCore';
import FaceRecognition from './FaceRecognition';
import SpeechRecognition from './SpeechRecognition';
import MultiAgentSystem from './MultiAgentSystem';
import SystemMonitor from './SystemMonitor';
import SelfLearning from './SelfLearning';
import { Database, Brain, Zap, Network, FileCode, MessageSquare, BarChart, ChevronLeft, ChevronRight, Cpu, Laugh, Lightbulb } from 'lucide-react';

const KarnaDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('think');
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="min-h-screen flex flex-col bg-jarvis-dark text-foreground">
      <KarnaHeader toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`transition-all duration-300 glass-panel flex flex-col border-r border-jarvis-blue/20 ${
            sidebarOpen ? 'w-20' : 'w-0 -ml-20'
          }`}
        >
          <div className="flex-1 py-4">
            <div className="flex flex-col items-center space-y-8">
              <NavButton icon={Brain} label="Think" active={activeTab === 'think'} onClick={() => setActiveTab('think')} />
              <NavButton icon={MessageSquare} label="Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
              <NavButton icon={Lightbulb} label="Learn" active={activeTab === 'learn'} onClick={() => setActiveTab('learn')} />
              <NavButton icon={Database} label="Memory" active={activeTab === 'memory'} onClick={() => setActiveTab('memory')} />
              <NavButton icon={Cpu} label="System" active={activeTab === 'system'} onClick={() => setActiveTab('system')} />
              <NavButton icon={Laugh} label="Humor" active={activeTab === 'humor'} onClick={() => setActiveTab('humor')} />
              <NavButton icon={FileCode} label="Code" active={activeTab === 'code'} onClick={() => setActiveTab('code')} />
              <NavButton icon={BarChart} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
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
                {activeTab === 'think' && <KarnaCore />}
                {activeTab === 'system' && <SystemMonitor />}
                {activeTab === 'learn' && <SelfLearning />}
                {(activeTab === 'think' || activeTab === 'chat') && <MultiAgentSystem />}
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
  onClick?: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon: Icon, label, active, onClick }) => {
  return (
    <button 
      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center group transition-all relative ${
        active ? 'bg-jarvis-blue text-white' : 'text-muted-foreground hover:text-jarvis-blue'
      }`}
      onClick={onClick}
    >
      <Icon size={20} />
      <span className="text-xs mt-1">{label}</span>
      
      {active && (
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-jarvis-blue rounded-full"></div>
      )}
    </button>
  );
};

export default KarnaDashboard;
