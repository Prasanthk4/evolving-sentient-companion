
import { toast } from "@/components/ui/use-toast";

// Types for API responses
export interface OllamaResponse {
  response: string;
  model: string;
  created_at: string;
  done: boolean;
}

export interface GeminiResponse {
  text: string;
  model: string;
  safetyMetadata?: {
    categories: string[];
    blocked: boolean;
  };
}

// Learning context storage
interface LearningContext {
  topic: string;
  interactions: {
    query: string;
    response: string;
    source: 'ollama' | 'gemini';
    timestamp: number;
  }[];
  lastUpdated: number;
}

// Storage for the learning contexts
const MAX_CONTEXTS = 10;
const LOCAL_STORAGE_KEY = 'karna-learning-contexts';

// Function to save contexts to local storage
const saveContexts = (contexts: LearningContext[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contexts));
  } catch (error) {
    console.error('Error saving learning contexts:', error);
  }
};

// Function to load contexts from local storage
export const loadContexts = (): LearningContext[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading learning contexts:', error);
    return [];
  }
};

// Add a new interaction to the learning system
export const addLearningInteraction = (
  topic: string,
  query: string,
  response: string,
  source: 'ollama' | 'gemini'
): void => {
  try {
    let contexts = loadContexts();
    const now = Date.now();
    
    // Find if we already have this topic
    let contextIndex = contexts.findIndex(c => c.topic.toLowerCase() === topic.toLowerCase());
    
    if (contextIndex >= 0) {
      // Update existing context
      contexts[contextIndex].interactions.push({
        query,
        response,
        source,
        timestamp: now
      });
      contexts[contextIndex].lastUpdated = now;
    } else {
      // Create new context
      const newContext: LearningContext = {
        topic,
        interactions: [{
          query,
          response,
          source,
          timestamp: now
        }],
        lastUpdated: now
      };
      
      // Add to beginning of array
      contexts.unshift(newContext);
      
      // Trim if necessary
      if (contexts.length > MAX_CONTEXTS) {
        contexts = contexts.slice(0, MAX_CONTEXTS);
      }
    }
    
    // Save updated contexts
    saveContexts(contexts);
  } catch (error) {
    console.error('Error adding learning interaction:', error);
  }
};

// Query Ollama API using electron IPC
export const queryOllama = async (prompt: string, model: string = 'llama3'): Promise<string> => {
  try {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }
    
    console.log(`Querying Ollama with: ${prompt}`);
    
    // Use actual Electron IPC to query Ollama
    const response = await window.electron.ollama.query(prompt, model);
    
    return response.response;
  } catch (error) {
    console.error('Error querying Ollama:', error);
    throw new Error('Failed to get response from Ollama');
  }
};

// Query Gemini API using electron IPC
export const queryGemini = async (prompt: string): Promise<string> => {
  try {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }
    
    console.log(`Querying Gemini with: ${prompt}`);
    
    // Use actual Electron IPC to query Gemini
    const response = await window.electron.gemini.query(prompt);
    
    return response.text;
  } catch (error) {
    console.error('Error querying Gemini:', error);
    throw new Error('Failed to get response from Gemini');
  }
};

// Get response with fallback between Ollama and Gemini
export const getAIResponse = async (prompt: string, topic: string = 'general'): Promise<string> => {
  try {
    // Try Ollama first
    toast({
      title: "Learning in progress",
      description: `KARNA is connecting to Ollama to learn about "${topic}"...`,
    });
    
    const response = await queryOllama(prompt);
    
    // Store this interaction for learning
    addLearningInteraction(topic, prompt, response, 'ollama');
    
    toast({
      title: "Learning complete",
      description: `KARNA has learned about "${topic}" using Ollama`,
    });
    
    return response;
  } catch (error) {
    console.error('Ollama failed, trying Gemini:', error);
    
    try {
      // Fallback to Gemini
      toast({
        title: "Learning in progress",
        description: `KARNA is connecting to Gemini to learn about "${topic}"...`,
      });
      
      const response = await queryGemini(prompt);
      
      // Store this interaction for learning
      addLearningInteraction(topic, prompt, response, 'gemini');
      
      toast({
        title: "Learning complete",
        description: `KARNA has learned about "${topic}" using Gemini`,
      });
      
      return response;
    } catch (secondError) {
      console.error('Both AI systems failed:', secondError);
      
      toast({
        title: "Learning failed",
        description: "Failed to connect to any AI systems. Please check your connections.",
        variant: "destructive"
      });
      
      throw new Error('Failed to get a response from any AI system');
    }
  }
};

// Get a response based on previous learning
export const getLearnedResponse = (topic: string, query: string): string | null => {
  const contexts = loadContexts();
  const context = contexts.find(c => c.topic.toLowerCase() === topic.toLowerCase());
  
  if (!context) return null;
  
  // Simple matching algorithm - in a real app this would be more sophisticated
  const relevantInteraction = context.interactions.find(
    i => i.query.toLowerCase().includes(query.toLowerCase()) || 
         query.toLowerCase().includes(i.query.toLowerCase())
  );
  
  return relevantInteraction ? relevantInteraction.response : null;
};
