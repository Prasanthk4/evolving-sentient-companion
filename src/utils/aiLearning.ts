
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
  embedding?: number[]; // For semantic search in the future
}

// Storage for the learning contexts
const MAX_CONTEXTS = 50; // Increased from 10
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
    
    // Generate a unique ID for this query
    const queryId = Date.now().toString();
    
    // Create a promise that will resolve when we get a response
    const responsePromise = new Promise<OllamaResponse>((resolve, reject) => {
      // Setup one-time listener for this specific query
      const responseHandler = (event: any, response: { id: string, response?: OllamaResponse, error?: string }) => {
        if (response.id === queryId) {
          // Remove the listener once we get our response
          window.electron.ollama.off('ollama-response', responseHandler);
          
          if (response.error) {
            reject(new Error(response.error));
          } else if (response.response) {
            resolve(response.response);
          } else {
            reject(new Error('Invalid response from Ollama'));
          }
        }
      };
      
      // Register the listener
      window.electron.ollama.on('ollama-response', responseHandler);
      
      // Set a timeout in case we never get a response
      setTimeout(() => {
        window.electron.ollama.off('ollama-response', responseHandler);
        reject(new Error('Timeout waiting for Ollama response'));
      }, 30000); // 30 second timeout
      
      // Send the query
      window.electron.ollama.query({
        id: queryId,
        prompt,
        model
      });
    });
    
    // Wait for the response
    const response = await responsePromise;
    
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
    
    // Generate a unique ID for this query
    const queryId = Date.now().toString();
    
    // Create a promise that will resolve when we get a response
    const responsePromise = new Promise<GeminiResponse>((resolve, reject) => {
      // Setup one-time listener for this specific query
      const responseHandler = (event: any, response: { id: string, response?: GeminiResponse, error?: string }) => {
        if (response.id === queryId) {
          // Remove the listener once we get our response
          window.electron.gemini.off('gemini-response', responseHandler);
          
          if (response.error) {
            reject(new Error(response.error));
          } else if (response.response) {
            resolve(response.response);
          } else {
            reject(new Error('Invalid response from Gemini'));
          }
        }
      };
      
      // Register the listener
      window.electron.gemini.on('gemini-response', responseHandler);
      
      // Set a timeout in case we never get a response
      setTimeout(() => {
        window.electron.gemini.off('gemini-response', responseHandler);
        reject(new Error('Timeout waiting for Gemini response'));
      }, 30000); // 30 second timeout
      
      // Send the query
      window.electron.gemini.query({
        id: queryId,
        prompt
      });
    });
    
    // Wait for the response
    const response = await responsePromise;
    
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
    
    // Enhance the prompt with topic context
    const enhancedPrompt = `I want to learn about ${topic}. Here's what I'd like to know: ${prompt}
    
Please provide a comprehensive and accurate response about this topic. Include key facts, explanations, and relevant context.`;
    
    const response = await queryOllama(enhancedPrompt);
    
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
      
      // Enhance the prompt with topic context
      const enhancedPrompt = `I want to learn about ${topic}. Here's what I'd like to know: ${prompt}
      
Please provide a comprehensive and accurate response about this topic. Include key facts, explanations, and relevant context.`;
      
      const response = await queryGemini(enhancedPrompt);
      
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

// Ask follow-up question about a topic we've learned about
export const queryTopic = async (topic: string, query: string): Promise<string> => {
  try {
    // First check if we already have knowledge on this topic that answers the query
    const existingResponse = getLearnedResponse(topic, query);
    
    if (existingResponse) {
      console.log('Found existing knowledge for query:', query);
      return existingResponse;
    }
    
    // If not, query the AI system with context from what we've learned
    const contexts = loadContexts();
    const topicContext = contexts.find(c => c.topic.toLowerCase() === topic.toLowerCase());
    
    if (!topicContext) {
      throw new Error(`No knowledge found about ${topic}`);
    }
    
    // Build context from previous interactions
    const previousKnowledge = topicContext.interactions
      .map(i => `Q: ${i.query}\nA: ${i.response}`)
      .join('\n\n');
    
    // Create a prompt that includes our previous knowledge
    const contextualPrompt = `Based on what you know about ${topic}, please answer this question: ${query}
    
Here is some context about what we've discussed before regarding ${topic}:
${previousKnowledge}

Now, please answer the original question concisely but accurately.`;
    
    // Try to use the same source as the majority of previous interactions
    const ollamaCount = topicContext.interactions.filter(i => i.source === 'ollama').length;
    const geminiCount = topicContext.interactions.filter(i => i.source === 'gemini').length;
    
    let response: string;
    let source: 'ollama' | 'gemini';
    
    // Use the model that has been used most for this topic
    if (ollamaCount >= geminiCount) {
      response = await queryOllama(contextualPrompt);
      source = 'ollama';
    } else {
      response = await queryGemini(contextualPrompt);
      source = 'gemini';
    }
    
    // Store this interaction
    addLearningInteraction(topic, query, response, source);
    
    return response;
  } catch (error) {
    console.error('Error querying topic:', error);
    throw error;
  }
};

// Get a response based on previous learning with improved matching
export const getLearnedResponse = (topic: string, query: string): string | null => {
  const contexts = loadContexts();
  const context = contexts.find(c => c.topic.toLowerCase() === topic.toLowerCase());
  
  if (!context) return null;
  
  // Convert query to lowercase for matching
  const lowercaseQuery = query.toLowerCase();
  
  // Extract keywords from the query (simple implementation)
  const keywords = lowercaseQuery
    .replace(/[.,?!;:(){}[\]]/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 3); // Only consider words longer than 3 chars
  
  // Find the most relevant interaction based on keyword matching
  let bestMatch: { interaction: typeof context.interactions[0], score: number } | null = null;
  
  for (const interaction of context.interactions) {
    const interactionText = (interaction.query + ' ' + interaction.response).toLowerCase();
    
    // Calculate match score based on keywords present
    let score = 0;
    for (const keyword of keywords) {
      if (interactionText.includes(keyword)) {
        score += 1;
      }
    }
    
    // Also check for query similarity
    if (interaction.query.toLowerCase().includes(lowercaseQuery) || 
        lowercaseQuery.includes(interaction.query.toLowerCase())) {
      score += 3; // Higher weight for query similarity
    }
    
    // Update best match
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { interaction, score };
    }
  }
  
  return bestMatch ? bestMatch.interaction.response : null;
};
