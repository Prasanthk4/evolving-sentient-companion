
import React, { useState, useEffect } from 'react';
import { Database, Book, Clock, Trash2, Search, User, Brain, Zap } from 'lucide-react';
import { 
  loadMemoryContext, 
  loadOwnerProfile, 
  clearMemory, 
  ConversationMemory, 
  searchConversations 
} from '@/utils/memoryManager';
import { semanticSearch } from '@/utils/vectorMemory';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

const MemorySystem = () => {
  const [owner, setOwner] = useState<{name: string, lastSeen: number} | null>(null);
  const [conversations, setConversations] = useState<ConversationMemory[]>([]);
  const [topics, setTopics] = useState<{[key: string]: {lastDiscussed: number, familiarity: number}}>({}); 
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<'recent' | 'topics' | 'search' | 'semantic'>('recent');
  const [useVectorSearch, setUseVectorSearch] = useState(false);

  useEffect(() => {
    loadMemoryData();
    
    // Refresh data periodically
    const interval = setInterval(() => {
      loadMemoryData();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadMemoryData = () => {
    const ownerProfile = loadOwnerProfile();
    setOwner(ownerProfile ? {name: ownerProfile.name, lastSeen: ownerProfile.lastSeen} : null);
    
    const memoryContext = loadMemoryContext();
    setConversations(memoryContext.conversations);
    setTopics(memoryContext.topics);
  };
  
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    if (useVectorSearch) {
      // Use semantic search
      const results = semanticSearch(searchQuery);
      setConversations(results);
      setActiveSection('semantic');
      
      if (results.length === 0) {
        toast({
          title: "No results found",
          description: `I couldn't find any memories semantically related to "${searchQuery}"`
        });
      }
    } else {
      // Use keyword search
      const results = searchConversations(searchQuery);
      setConversations(results);
      setActiveSection('search');
      
      if (results.length === 0) {
        toast({
          title: "No results found",
          description: `I couldn't find any memories related to "${searchQuery}"`
        });
      }
    }
  };
  
  const handleReset = () => {
    loadMemoryData();
    setSearchQuery('');
    setActiveSection('recent');
  };
  
  const handleClearMemory = () => {
    if (window.confirm("Are you sure you want to clear all memory? This cannot be undone.")) {
      clearMemory();
      setOwner(null);
      setConversations([]);
      setTopics({});
      
      toast({
        title: "Memory Cleared",
        description: "All memory data has been reset."
      });
    }
  };

  return (
    <div className="glass-panel p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Database className="mr-2" /> Memory System
        </h2>
        {owner && (
          <div className="flex items-center text-xs text-muted-foreground">
            <User size={14} className="mr-1 text-jarvis-blue" />
            <span>Owner: {owner.name}</span>
          </div>
        )}
      </div>
      
      <div className="glass-panel p-3 mb-4">
        <div className="flex items-center mb-3">
          <Search size={14} className="text-muted-foreground mr-2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..." 
            className="bg-transparent border-none outline-none text-sm w-full"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchQuery && (
            <button 
              onClick={handleReset} 
              className="text-muted-foreground hover:text-jarvis-blue ml-2"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveSection('recent')}
              className={`px-2 py-1 text-xs rounded ${
                activeSection === 'recent' 
                  ? 'bg-jarvis-blue text-white'
                  : 'text-muted-foreground hover:text-jarvis-blue'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setActiveSection('topics')}
              className={`px-2 py-1 text-xs rounded ${
                activeSection === 'topics' 
                  ? 'bg-jarvis-blue text-white'
                  : 'text-muted-foreground hover:text-jarvis-blue'
              }`}
            >
              Topics
            </button>
            {activeSection === 'search' && (
              <button
                className="px-2 py-1 text-xs rounded bg-jarvis-blue text-white"
              >
                Search Results
              </button>
            )}
            {activeSection === 'semantic' && (
              <button
                className="px-2 py-1 text-xs rounded bg-jarvis-accent text-white"
              >
                Semantic Results
              </button>
            )}
          </div>
          
          <div className="flex items-center">
            <label className="text-xs flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={useVectorSearch}
                onChange={() => setUseVectorSearch(!useVectorSearch)}
                className="mr-1 h-3 w-3"
              />
              <Zap size={12} className="mr-1 text-jarvis-accent" />
              Semantic Search
            </label>
            <Button
              size="sm"
              variant="ghost"
              className="ml-2 h-6 px-2 text-jarvis-blue"
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
            >
              <Search size={12} className="mr-1" />
              Search
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 glass-panel p-3 overflow-y-auto">
        {activeSection === 'recent' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Clock size={14} className="mr-1" /> Recent Conversations
            </h3>
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No conversations recorded yet.</p>
            ) : (
              conversations.slice(0, 10).map((conv, index) => (
                <div key={index} className="text-xs border-b border-jarvis-dark pb-2 mb-2 last:border-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-jarvis-blue">{new Date(conv.timestamp).toLocaleString()}</span>
                    {conv.topic && (
                      <span className="bg-jarvis-dark-light px-1 rounded text-jarvis-blue">
                        {conv.topic}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-1">You: {conv.userMessage}</p>
                  <p>KARNA: {conv.karnaResponse.length > 100 
                    ? conv.karnaResponse.substring(0, 100) + '...' 
                    : conv.karnaResponse}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
        
        {activeSection === 'topics' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Book size={14} className="mr-1" /> Learned Topics
            </h3>
            {Object.keys(topics).length === 0 ? (
              <p className="text-xs text-muted-foreground">No topics learned yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(topics).map(([topic, data], index) => (
                  <div key={index} className="glass-panel p-2 rounded">
                    <div className="text-xs text-jarvis-blue font-medium mb-1">{topic}</div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        <Brain size={12} className="mr-1" />
                        <div className="w-16 h-1 bg-jarvis-dark rounded-full overflow-hidden">
                          <div
                            className="h-full bg-jarvis-blue"
                            style={{ width: `${data.familiarity}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-muted-foreground">{new Date(data.lastDiscussed).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {(activeSection === 'search' || activeSection === 'semantic') && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Search size={14} className="mr-1" /> 
              {activeSection === 'semantic' ? 'Semantic' : 'Search'} Results for "{searchQuery}"
              {activeSection === 'semantic' && (
                <span className="ml-2 text-xs text-jarvis-accent flex items-center">
                  <Zap size={10} className="mr-1" /> Using Vector Similarity
                </span>
              )}
            </h3>
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No results found.</p>
            ) : (
              conversations.map((conv, index) => (
                <div key={index} className="text-xs border-b border-jarvis-dark pb-2 mb-2 last:border-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-jarvis-blue">{new Date(conv.timestamp).toLocaleString()}</span>
                    {conv.topic && (
                      <span className="bg-jarvis-dark-light px-1 rounded text-jarvis-blue">
                        {conv.topic}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-1">You: {conv.userMessage}</p>
                  <p>KARNA: {conv.karnaResponse.length > 100 
                    ? conv.karnaResponse.substring(0, 100) + '...' 
                    : conv.karnaResponse}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <div className="glass-panel p-2 mt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs">
            <span className="text-muted-foreground">Memory Storage: </span>
            <span>{(owner ? 1 : 0) + conversations.length + Object.keys(topics).length} items</span>
          </div>
          <button 
            onClick={handleClearMemory}
            className="text-xs text-jarvis-accent hover:text-jarvis-blue flex items-center"
          >
            <Trash2 size={12} className="mr-1" />
            Clear Memory
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemorySystem;
