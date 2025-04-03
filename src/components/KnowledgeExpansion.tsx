import React, { useState, useEffect } from 'react';
import { Book, Search, Zap, Download, Database, Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAIResponse, loadContexts, queryTopic } from '@/utils/aiLearning';
import { semanticSearch, addVectorizedMemory } from '@/utils/vectorMemory';
import { ConversationMemory } from '@/utils/memoryManager';

// Knowledge Source defines where the knowledge came from
type KnowledgeSource = 'user' | 'ai' | 'memory' | 'imported';

interface KnowledgeItem {
  id: string;
  topic: string;
  content: string;
  source: KnowledgeSource;
  timestamp: number;
  vectorId?: string;
  confidence?: number;
}

const KnowledgeExpansion = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newKnowledge, setNewKnowledge] = useState('');
  const [knowledgeTopic, setKnowledgeTopic] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchResults, setSearchResults] = useState<ConversationMemory[]>([]);
  const { toast } = useToast();

  // Load saved knowledge items
  useEffect(() => {
    const loadSavedKnowledge = () => {
      try {
        const savedItems = localStorage.getItem('karna-knowledge-items');
        if (savedItems) {
          setKnowledgeItems(JSON.parse(savedItems));
        }
      } catch (error) {
        console.error('Error loading knowledge items:', error);
      }
    };
    
    loadSavedKnowledge();
  }, []);

  // Save knowledge items when they change
  useEffect(() => {
    const saveKnowledgeItems = () => {
      try {
        localStorage.setItem('karna-knowledge-items', JSON.stringify(knowledgeItems));
      } catch (error) {
        console.error('Error saving knowledge items:', error);
      }
    };
    
    if (knowledgeItems.length > 0) {
      saveKnowledgeItems();
    }
  }, [knowledgeItems]);

  // Handle semantic search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Perform semantic search
      const results = semanticSearch(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        toast({
          title: "No results found",
          description: "No relevant memories found for your query."
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "There was an error performing the search.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add new knowledge to the system
  const handleAddKnowledge = () => {
    if (!newKnowledge.trim() || !knowledgeTopic.trim()) {
      toast({
        title: "Invalid input",
        description: "Please provide both a topic and knowledge content.",
        variant: "destructive"
      });
      return;
    }
    
    const newItem: KnowledgeItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      topic: knowledgeTopic,
      content: newKnowledge,
      source: 'user',
      timestamp: Date.now()
    };
    
    // Add to knowledge items
    setKnowledgeItems(prev => [newItem, ...prev]);
    
    // Also add to vectorized memory
    addVectorizedMemory("Knowledge added by user", newKnowledge, knowledgeTopic);
    
    toast({
      title: "Knowledge added",
      description: `New knowledge about "${knowledgeTopic}" has been stored.`
    });
    
    // Clear inputs
    setNewKnowledge('');
    setKnowledgeTopic('');
  };

  // Expand knowledge on a topic using AI
  const handleExpandKnowledge = async () => {
    if (!knowledgeTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please specify a topic to expand knowledge on.",
        variant: "destructive"
      });
      return;
    }
    
    setIsExpanding(true);
    try {
      const prompt = `Please provide detailed information about "${knowledgeTopic}". Include key concepts, principles, and important aspects.`;
      
      // Use the AI learning system to get a response
      const aiResponse = await getAIResponse(prompt, knowledgeTopic);
      
      // Create new knowledge item
      const newItem: KnowledgeItem = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        topic: knowledgeTopic,
        content: aiResponse,
        source: 'ai',
        timestamp: Date.now()
      };
      
      // Add to knowledge items
      setKnowledgeItems(prev => [newItem, ...prev]);
      
      toast({
        title: "Knowledge expanded",
        description: `Knowledge about "${knowledgeTopic}" has been expanded.`
      });
      
      // Clear the topic but keep it visible to the user
      const expandedTopic = knowledgeTopic;
      setKnowledgeTopic('');
      setKnowledgeTopic(expandedTopic);
      
      // Add the expanded knowledge to memory as well
      addVectorizedMemory(prompt, aiResponse, knowledgeTopic);
    } catch (error) {
      console.error('Knowledge expansion error:', error);
      toast({
        title: "Expansion failed",
        description: "Failed to expand knowledge on this topic.",
        variant: "destructive"
      });
    } finally {
      setIsExpanding(false);
    }
  };
  
  // Import a search result into knowledge base
  const handleImportFromMemory = (memory: ConversationMemory) => {
    if (!memory) return;
    
    const topic = memory.topic || 'General Knowledge';
    const content = `User: ${memory.userMessage}\nKARNA: ${memory.karnaResponse}`;
    
    const newItem: KnowledgeItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      topic,
      content,
      source: 'memory',
      timestamp: Date.now(),
      vectorId: memory.id
    };
    
    // Add to knowledge items
    setKnowledgeItems(prev => [newItem, ...prev]);
    
    toast({
      title: "Memory imported",
      description: `Memory about "${topic}" has been added to knowledge base.`
    });
  };
  
  // Delete a knowledge item
  const handleDeleteKnowledge = (id: string) => {
    setKnowledgeItems(prev => prev.filter(item => item.id !== id));
    
    toast({
      title: "Knowledge removed",
      description: "The knowledge item has been removed."
    });
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Book className="mr-2" /> Knowledge Expansion
        </h2>
      </div>
      
      {/* Search and add knowledge section */}
      <div className="glass-panel p-3 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Search className="text-jarvis-blue mr-1" size={14} /> Semantic Search
          </h3>
          
          <div className="flex items-center space-x-2">
            <Input
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm flex-1"
              placeholder="Search in memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              size="sm"
              variant="default"
              className="bg-jarvis-blue hover:bg-jarvis-blue-light text-white"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <div key={index} className="bg-jarvis-dark/40 rounded p-2 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-jarvis-blue font-medium">
                      {result.topic || 'General'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-jarvis-accent hover:text-jarvis-blue"
                      onClick={() => handleImportFromMemory(result)}
                    >
                      <Upload size={12} className="mr-1" /> Import
                    </Button>
                  </div>
                  <div className="text-muted-foreground mb-1">User: {result.userMessage}</div>
                  <div>KARNA: {result.karnaResponse.length > 100 
                    ? result.karnaResponse.substring(0, 100) + '...' 
                    : result.karnaResponse}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-muted-foreground">
                <p className="text-xs">No search results yet</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Zap className="text-jarvis-blue mr-1" size={14} /> Expand Knowledge
          </h3>
          
          <div className="space-y-2">
            <Input
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm"
              placeholder="Topic (e.g., Quantum Physics, History)"
              value={knowledgeTopic}
              onChange={(e) => setKnowledgeTopic(e.target.value)}
            />
            
            <Textarea
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm h-20 resize-none"
              placeholder="Enter new knowledge or leave empty to use AI expansion..."
              value={newKnowledge}
              onChange={(e) => setNewKnowledge(e.target.value)}
            />
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="default"
                className="bg-jarvis-blue hover:bg-jarvis-blue-light text-white"
                onClick={handleAddKnowledge}
                disabled={!newKnowledge.trim() || !knowledgeTopic.trim()}
              >
                <Database size={14} className="mr-1" /> Save Knowledge
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="border-jarvis-accent text-jarvis-accent hover:bg-jarvis-accent/10"
                onClick={handleExpandKnowledge}
                disabled={isExpanding || !knowledgeTopic.trim()}
              >
                {isExpanding ? 'Expanding...' : <><Zap size={14} className="mr-1" /> AI Expand</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Knowledge base display */}
      <div className="glass-panel p-3 flex-1 overflow-hidden flex flex-col">
        <h3 className="text-sm font-medium mb-3 flex items-center">
          <Book className="text-jarvis-blue mr-1" size={14} /> Knowledge Base
        </h3>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {knowledgeItems.length > 0 ? (
            knowledgeItems.map((item) => (
              <div key={item.id} className="bg-jarvis-dark/40 rounded p-3 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-jarvis-blue font-medium">{item.topic}</span>
                    <div className="flex items-center mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.source === 'ai' ? 'bg-jarvis-accent/20 text-jarvis-accent' :
                        item.source === 'user' ? 'bg-jarvis-success/20 text-jarvis-success' :
                        item.source === 'memory' ? 'bg-jarvis-blue/20 text-jarvis-blue' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {item.source === 'ai' ? 'AI Generated' :
                         item.source === 'user' ? 'User Added' :
                         item.source === 'memory' ? 'From Memory' :
                         'Imported'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-jarvis-accent"
                    onClick={() => handleDeleteKnowledge(item.id)}
                  >
                    <X size={14} />
                  </Button>
                </div>
                
                <div className="text-muted-foreground text-xs whitespace-pre-wrap mt-2">
                  {item.content}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Book size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No knowledge items yet</p>
              <p className="text-xs mt-1">Add new knowledge or use AI expansion</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeExpansion;
