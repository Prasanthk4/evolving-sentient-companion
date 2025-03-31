
import React, { useState, useEffect } from 'react';
import { Lightbulb, BookOpen, Brain, Database, AlertCircle } from 'lucide-react';
import { loadContexts, getAIResponse, getLearnedResponse } from '@/utils/aiLearning';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const SelfLearning = () => {
  const [activeTopics, setActiveTopics] = useState<string[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [learningStatus, setLearningStatus] = useState('idle');
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
        // Learn new information
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

  const handleTopicClick = (topic: string) => {
    setSelectedTopic(selectedTopic === topic ? null : topic);
  };

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
            <Input
              className="bg-jarvis-dark border-jarvis-blue/30 text-sm"
              placeholder="What would you like me to learn about this topic?"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              disabled={isLearning}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStartLearning();
                }
              }}
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
      
      <div className="glass-panel p-3 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium mb-3 flex items-center">
          <Database className="text-jarvis-blue mr-1" size={14} /> Knowledge Database
        </h3>
        
        {activeTopics.length > 0 ? (
          <div className="space-y-2">
            {activeTopics.map((topic, index) => (
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
                
                {selectedTopic === topic && (
                  <div className="mt-2 ml-6 text-xs text-muted-foreground">
                    KARNA has learned about this topic and can answer related questions.
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
            <AlertCircle size={24} className="mb-2 opacity-50" />
            <p className="text-sm">No knowledge has been stored yet.</p>
            <p className="text-xs mt-1">Start by teaching KARNA something new!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfLearning;
