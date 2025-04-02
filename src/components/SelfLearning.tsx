
import React, { useState, useEffect } from 'react';
import { Lightbulb, BookOpen, Brain, Database, AlertCircle, Search, Clock } from 'lucide-react';
import { loadContexts, getAIResponse, getLearnedResponse, queryTopic } from '@/utils/aiLearning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

const SelfLearning = () => {
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [learningStatus, setLearningStatus] = useState('idle');
  const [topicDetails, setTopicDetails] = useState<{
    interactions: { query: string; response: string; timestamp: number }[];
    lastUpdated: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Load the learning contexts when component mounts
    const contexts = loadContexts();
    const topics = contexts.map(context => context.topic);
    setActiveTopics(topics);
  }, []);

  const handleStartLearning = async () => {
    if (!newTopic || !newQuery) {
      toast({
        variant: "destructive",
        title: "Invalid input",
        description: "Please provide both a topic and a query."
      });
      return;
    }

    setIsLearning(true);
    setLearningStatus('processing');

    try {
      // First check if we already have knowledge on this topic
      const existingResponse = getLearnedResponse(newTopic, newQuery);
      
      if (existingResponse) {
        setLearningStatus('retrieved');
        toast({
          title: "Knowledge retrieved",
          description: `KARNA already knows about "${newTopic}"`,
        });
        setTimeout(() => setLearningStatus('idle'), 2000);
      } else {
        setLearningStatus('learning');
        // Learn new information from actual LLM
        await getAIResponse(newQuery, newTopic);
        
        // Update the active topics
        const contexts = loadContexts();
        const topics = contexts.map(context => context.topic);
        setActiveTopics(topics);
        
        setLearningStatus('complete');
        setTimeout(() => setLearningStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Learning error:', error);
      setLearningStatus('error');
      toast({
        variant: "destructive",
        title: "Learning failed",
        description: "KARNA couldn't process this learning request."
      });
      setTimeout(() => setLearningStatus('idle'), 2000);
    } finally {
      setIsLearning(false);
      setNewQuery('');
    }
  };

  const handleTopicClick = async (topic: string) => {
    if (selectedTopic === topic) {
      setSelectedTopic(null);
      setTopicDetails(null);
    } else {
      setSelectedTopic(topic);
      // Load details for this topic
      const contexts = loadContexts();
      const topicContext = contexts.find(context => context.topic === topic);
      if (topicContext) {
        setTopicDetails({
          interactions: topicContext.interactions,
          lastUpdated: topicContext.lastUpdated
        });
      }
    }
  };

  const handleSearchTopic = async () => {
    if (!selectedTopic || !searchQuery) return;
    
    setLearningStatus('processing');
    try {
      const response = await queryTopic(selectedTopic, searchQuery);
      
      toast({
        title: "Query successful",
        description: "KARNA has processed your question."
      });
      
      // Refresh topic details
      const contexts = loadContexts();
      const topicContext = contexts.find(context => context.topic === selectedTopic);
      if (topicContext) {
        setTopicDetails({
          interactions: topicContext.interactions,
          lastUpdated: topicContext.lastUpdated
        });
      }
      
      setSearchQuery('');
      setLearningStatus('idle');
    } catch (error) {
      console.error('Query error:', error);
      toast({
        variant: "destructive",
        title: "Query failed",
        description: "KARNA couldn't process this question."
      });
      setLearningStatus('idle');
    }
  };

  // Filter topics based on search
  const filteredTopics = activeTopics.filter(topic => 
    topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Lightbulb className="mr-2" /> Self-Learning System
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${
            learningStatus === 'idle' ? 'bg-jarvis-blue' :
            learningStatus === 'processing' ? 'bg-jarvis-accent' :
            learningStatus === 'learning' ? 'bg-jarvis-accent animate-pulse' :
            learningStatus === 'retrieved' ? 'bg-jarvis-success' :
            learningStatus === 'complete' ? 'bg-jarvis-success' :
            'bg-jarvis-accent'
          }`}></div>
          <span className="text-sm text-muted-foreground">
            {learningStatus === 'idle' ? 'Ready' :
             learningStatus === 'processing' ? 'Processing' :
             learningStatus === 'learning' ? 'Learning' :
             learningStatus === 'retrieved' ? 'Retrieved' :
             learningStatus === 'complete' ? 'Complete' :
             'Error'}
          </span>
        </div>
      </div>
      
      <div className="glass-panel p-3 mb-4">
        <h3 className="text-sm font-medium mb-2 flex items-center">
          <Brain className="text-jarvis-blue mr-1" size={14} /> Learning Interface
        </h3>
        
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Topic</label>
            <Input
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm"
              placeholder="E.g., Quantum Physics, History, Cooking..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              disabled={isLearning}
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Question or Information</label>
            <Textarea
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm h-20 resize-none"
              placeholder="What would you like me to learn about this topic?"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              disabled={isLearning}
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="default"
              className="bg-jarvis-blue hover:bg-jarvis-blue-light text-white"
              onClick={handleStartLearning}
              disabled={isLearning}
            >
              {isLearning ? 'Learning...' : 'Start Learning'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-3 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium mb-3 flex items-center">
            <Database className="text-jarvis-blue mr-1" size={14} /> Knowledge Database
          </h3>
          
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-jarvis-blue/70" size={14} />
            <Input
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm pl-8"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="space-y-2 flex-1 overflow-y-auto pr-2">
            {filteredTopics.length > 0 ? (
              <div className="space-y-2">
                {filteredTopics.map((topic, index) => (
                  <div 
                    key={index}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedTopic === topic 
                        ? 'bg-jarvis-blue/20 border border-jarvis-blue/30' 
                        : 'hover:bg-jarvis-dark-light'
                    }`}
                    onClick={() => handleTopicClick(topic)}
                  >
                    <div className="flex items-center">
                      <BookOpen size={14} className="text-jarvis-blue mr-2" />
                      <span className="text-sm">{topic}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                <AlertCircle size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No matching topics found.</p>
              </div>
            )}
          </div>
        </div>
        
        {selectedTopic && topicDetails ? (
          <div className="glass-panel p-3 overflow-y-auto h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center text-jarvis-blue">
                <BookOpen size={14} className="mr-1" /> {selectedTopic}
              </h3>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock size={12} className="mr-1" /> 
                {new Date(topicDetails.lastUpdated).toLocaleDateString()}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <Input
                  className="bg-jarvis-dark border-jarvis-blue/30 text-sm flex-1"
                  placeholder="Ask more about this topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchTopic();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="default"
                  className="bg-jarvis-blue hover:bg-jarvis-blue-light text-white"
                  onClick={handleSearchTopic}
                  disabled={learningStatus !== 'idle'}
                >
                  Ask
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {topicDetails.interactions.slice().reverse().map((interaction, index) => (
                <div key={index} className="bg-jarvis-dark/40 rounded p-2">
                  <div className="text-xs text-jarvis-blue mb-1">Question:</div>
                  <div className="text-sm mb-2 pl-2">{interaction.query}</div>
                  <div className="text-xs text-jarvis-accent mb-1">Answer:</div>
                  <div className="text-sm pl-2 text-muted-foreground">{interaction.response}</div>
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(interaction.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTopics.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
            <AlertCircle size={24} className="mb-2 opacity-50" />
            <p className="text-sm">No knowledge has been stored yet.</p>
            <p className="text-xs mt-1">Start by teaching KARNA something new!</p>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
            <BookOpen size={24} className="mb-2 opacity-50" />
            <p className="text-sm">Select a topic to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfLearning;
