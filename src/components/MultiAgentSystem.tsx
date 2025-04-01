
import React, { useState, useEffect, useRef } from 'react';
import { Network, Brain, Database, Heart, Lightbulb, AlertCircle } from 'lucide-react';

const agents = [
  { 
    id: 'thinker', 
    name: 'Thinker Agent', 
    icon: Brain, 
    color: '#0AEFFF',
    description: 'Logical reasoning and problem-solving',
  },
  { 
    id: 'memory', 
    name: 'Memory Agent', 
    icon: Database, 
    color: '#75FBFF',
    description: 'Context awareness and user history', 
  },
  { 
    id: 'personality', 
    name: 'Personality Agent', 
    icon: Heart, 
    color: '#FF5757', 
    description: 'Emotion, humor, and social intelligence',
  },
  { 
    id: 'creative', 
    name: 'Creative Agent', 
    icon: Lightbulb, 
    color: '#FFB800',
    description: 'Innovative thinking and idea generation', 
  },
  { 
    id: 'critic', 
    name: 'Critic Agent', 
    icon: AlertCircle, 
    color: '#00FF9D',
    description: 'Self-monitoring and error correction', 
  },
];

interface SystemStatus {
  processingStatus: string;
  activeModules: {
    selfLearning: boolean;
    dataAnalysis: boolean;
    nlp: boolean;
    ollama: boolean;
    gemini: boolean;
    faceRecognition: boolean;
    speechRecognition: boolean;
    knowledgeDB: boolean;
    humorModule: boolean;
  };
}

const MultiAgentSystem = () => {
  const [activeAgents, setActiveAgents] = useState<string[]>(['thinker', 'memory']);
  const [links, setLinks] = useState<{source: string, target: string, strength: number}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemMessages, setSystemMessages] = useState<string[]>([]);
  
  // Use refs to prevent infinite update loops
  const activeAgentsRef = useRef(activeAgents);
  const systemStatusRef = useRef(systemStatus);
  
  useEffect(() => {
    activeAgentsRef.current = activeAgents;
  }, [activeAgents]);
  
  useEffect(() => {
    systemStatusRef.current = systemStatus;
  }, [systemStatus]);
  
  useEffect(() => {
    // Listen for system status updates from main process
    const handleStatusUpdate = (event: CustomEvent) => {
      if (event.detail) {
        const status = event.detail as SystemStatus;
        setSystemStatus(status);
        
        // Update active agents based on processing status
        const newActiveAgents = ['thinker'];
        
        if (status.processingStatus === 'analyzing' || status.processingStatus === 'learning') {
          newActiveAgents.push('critic');
        }
        
        if (status.activeModules.knowledgeDB) {
          newActiveAgents.push('memory');
        }
        
        if (status.activeModules.humorModule) {
          newActiveAgents.push('personality');
        }
        
        if (status.processingStatus === 'learning') {
          newActiveAgents.push('creative');
        }
        
        // Only update if the active agents have changed
        const currentActiveAgents = activeAgentsRef.current;
        if (JSON.stringify(newActiveAgents.sort()) !== JSON.stringify([...currentActiveAgents].sort())) {
          setActiveAgents(newActiveAgents);
          
          // Add a system message about agent changes
          const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
          if (newActiveAgents.length > currentActiveAgents.length) {
            const newAgents = newActiveAgents.filter(a => !currentActiveAgents.includes(a));
            newAgents.forEach(agentId => {
              const agent = agents.find(a => a.id === agentId);
              if (agent) {
                addSystemMessage(`${timeString}: ${agent.name} activated`);
              }
            });
          } else if (newActiveAgents.length < currentActiveAgents.length) {
            const removedAgents = currentActiveAgents.filter(a => !newActiveAgents.includes(a));
            removedAgents.forEach(agentId => {
              const agent = agents.find(a => a.id === agentId);
              if (agent) {
                addSystemMessage(`${timeString}: ${agent.name} deactivated`);
              }
            });
          }
        }
      }
    };
    
    // Type assertion for the custom event
    window.addEventListener('karna-status-update', 
      handleStatusUpdate as EventListener);
    
    // Generate initial links
    generateLinks();
    
    // Add initial system message
    addSystemMessage(`${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}: System initialized with ${activeAgents.length} agents`);
    
    // Regenerate links periodically
    const interval = setInterval(() => {
      generateLinks();
    }, 5000);
    
    return () => {
      window.removeEventListener('karna-status-update', 
        handleStatusUpdate as EventListener);
      clearInterval(interval);
    };
  }, []); // Empty dependency array to run only once
  
  // Add a system message with timestamp
  const addSystemMessage = (message: string) => {
    setSystemMessages(prev => {
      const newMessages = [message, ...prev];
      // Keep only the 10 most recent messages
      return newMessages.slice(0, 10);
    });
  };
  
  // Generate links between active agents
  const generateLinks = () => {
    const newLinks: {source: string, target: string, strength: number}[] = [];
    const currentActiveAgents = activeAgentsRef.current;
    
    // Always connect thinker to active agents
    currentActiveAgents.forEach(agent => {
      if (agent !== 'thinker') {
        newLinks.push({
          source: 'thinker',
          target: agent,
          strength: Math.random() * 0.5 + 0.5, // 0.5 to 1
        });
      }
    });
    
    // Add some random connections
    for (let i = 0; i < currentActiveAgents.length; i++) {
      for (let j = i + 1; j < currentActiveAgents.length; j++) {
        if (Math.random() > 0.3) { // 70% chance to create a link
          newLinks.push({
            source: currentActiveAgents[i],
            target: currentActiveAgents[j],
            strength: Math.random() * 0.7 + 0.3, // 0.3 to 1
          });
        }
      }
    }
    
    setLinks(newLinks);
  };
  
  // Toggle agent activation
  const toggleAgent = (agentId: string) => {
    if (agentId === 'thinker') return; // Can't deactivate the thinker
    
    const timeString = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    const agent = agents.find(a => a.id === agentId);
    
    setActiveAgents(prev => {
      if (prev.includes(agentId)) {
        if (agent) {
          addSystemMessage(`${timeString}: ${agent.name} deactivated by user`);
        }
        return prev.filter(a => a !== agentId);
      } else {
        if (agent) {
          addSystemMessage(`${timeString}: ${agent.name} activated by user`);
        }
        return [...prev, agentId];
      }
    });
    
    // Generate new links for the updated agents
    setTimeout(generateLinks, 100);
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Network className="mr-2" /> Multi-Agent System
        </h2>
        <div className="text-sm text-muted-foreground">
          {activeAgents.length} Active Agents
        </div>
      </div>
      
      <div className="flex-1 relative mb-4">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Network visualization */}
          <div className="relative w-56 h-56">
            {/* Agent nodes */}
            {agents.map(agent => {
              const isActive = activeAgents.includes(agent.id);
              const Icon = agent.icon;
              const angle = agents.indexOf(agent) * (2 * Math.PI / agents.length);
              const radius = agent.id === 'thinker' ? 0 : 90; // Thinker is in the center
              const x = radius * Math.cos(angle) + 112; // 112 is half of container size (224/2)
              const y = radius * Math.sin(angle) + 112;
              
              return (
                <div 
                  key={agent.id}
                  className={`absolute hexagon-container transition-all duration-500 ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-90'
                  } ${selectedAgent === agent.id ? 'ring-2 ring-white' : ''}`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)',
                    width: agent.id === 'thinker' ? '50px' : '40px',
                    height: agent.id === 'thinker' ? '50px' : '40px',
                    backgroundColor: isActive ? agent.color : '#1E2A3A',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedAgent(agent.id);
                    if (agent.id !== 'thinker') {
                      toggleAgent(agent.id);
                    }
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon size={agent.id === 'thinker' ? 24 : 20} className="text-white" />
                  </div>
                </div>
              );
            })}
            
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full" style={{zIndex: -1}}>
              {links.map((link, i) => {
                const sourceAgent = agents.find(a => a.id === link.source);
                const targetAgent = agents.find(a => a.id === link.target);
                
                if (!sourceAgent || !targetAgent) return null;
                
                const sourceAngle = agents.indexOf(sourceAgent) * (2 * Math.PI / agents.length);
                const targetAngle = agents.indexOf(targetAgent) * (2 * Math.PI / agents.length);
                
                const sourceRadius = sourceAgent.id === 'thinker' ? 0 : 90;
                const targetRadius = targetAgent.id === 'thinker' ? 0 : 90;
                
                const x1 = sourceRadius * Math.cos(sourceAngle) + 112;
                const y1 = sourceRadius * Math.sin(sourceAngle) + 112;
                const x2 = targetRadius * Math.cos(targetAngle) + 112;
                const y2 = targetRadius * Math.sin(targetAngle) + 112;
                
                return (
                  <line 
                    key={i}
                    x1={x1} 
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={sourceAgent.color}
                    strokeWidth={link.strength * 3}
                    strokeOpacity={0.6}
                    strokeDasharray={link.strength < 0.6 ? "4 2" : ""}
                  >
                    <animate 
                      attributeName="stroke-dashoffset" 
                      from="0" 
                      to="6" 
                      dur="1s" 
                      repeatCount="indefinite" 
                    />
                  </line>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      
      {/* Agent details */}
      <div className="glass-panel p-3">
        {selectedAgent ? (
          <AgentDetails 
            agent={agents.find(a => a.id === selectedAgent)!} 
            isActive={activeAgents.includes(selectedAgent)}
            onToggle={() => toggleAgent(selectedAgent)}
          />
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Select an agent to view details
          </div>
        )}
      </div>
      
      {/* Status messages */}
      <div className="glass-panel p-3 mt-4 h-32 overflow-y-auto">
        <h3 className="text-sm font-medium mb-2">System Messages</h3>
        <div className="space-y-2 text-xs">
          <div className="text-jarvis-blue text-xs">
            <span>System is using {activeAgents.length} agents to process your requests</span>
          </div>
          <div className="h-px bg-jarvis-dark"></div>
          {systemMessages.map((message, index) => (
            <div key={index} className="flex items-center opacity-80">
              <span>{message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface AgentDetailsProps {
  agent: {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    description: string;
  };
  isActive: boolean;
  onToggle: () => void;
}

const AgentDetails: React.FC<AgentDetailsProps> = ({ agent, isActive, onToggle }) => {
  const Icon = agent.icon;
  
  return (
    <div>
      <div className="flex items-center mb-2">
        <div 
          className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
          style={{backgroundColor: agent.color}}
        >
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <h3 className="font-medium text-sm">{agent.name}</h3>
          <div className="text-xs text-muted-foreground">{agent.description}</div>
        </div>
      </div>
      
      {agent.id !== 'thinker' && (
        <button
          onClick={onToggle}
          className={`text-xs py-1 px-3 rounded-full mt-1 ${
            isActive 
              ? 'bg-jarvis-dark text-jarvis-blue border border-jarvis-blue' 
              : 'bg-jarvis-blue text-jarvis-dark'
          }`}
        >
          {isActive ? 'Deactivate Agent' : 'Activate Agent'}
        </button>
      )}
    </div>
  );
};

export default MultiAgentSystem;
