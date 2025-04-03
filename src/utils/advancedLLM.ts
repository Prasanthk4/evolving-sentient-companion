
import { toast } from "@/components/ui/use-toast";

// Types for available LLM providers
export type LLMProvider = 'ollama' | 'gemini';

// Interface for LLM model information
export interface LLMModel {
  id: string;
  provider: LLMProvider;
  name: string;
  description?: string;
  parameters?: number;
  contextWindow?: number;
}

// Interface for LLM response
export interface LLMResponse {
  text: string;
  model: string;
  provider: LLMProvider;
  timestamp: number;
  tokens?: number;
  processingTime?: number;
}

// LLM query options
export interface LLMQueryOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  streaming?: boolean;
  onPartialResponse?: (text: string) => void;
}

// Cache of available models
let availableModelsCache: LLMModel[] = [];

// Get all available LLM models
export const getAvailableModels = async (): Promise<LLMModel[]> => {
  // If we have a cache, use it
  if (availableModelsCache.length > 0) {
    return availableModelsCache;
  }

  try {
    // Get Ollama models
    let ollamaModels: string[] = [];
    
    if (window.electron?.ollama?.getAvailableModels) {
      ollamaModels = await window.electron.ollama.getAvailableModels();
    }
    
    // Map Ollama models to our format
    const ollamaModelsMapped: LLMModel[] = ollamaModels.map(id => ({
      id,
      provider: 'ollama',
      name: formatModelName(id),
      description: `Ollama model: ${id}`
    }));
    
    // For Gemini, we have a fixed set
    const geminiModels: LLMModel[] = [
      {
        id: 'gemini-pro',
        provider: 'gemini',
        name: 'Gemini Pro',
        description: 'Google Gemini Pro model with strong general capabilities',
        parameters: 1000000000000, // 1 trillion
        contextWindow: 32768,
      }
    ];
    
    // Combine all models
    availableModelsCache = [...ollamaModelsMapped, ...geminiModels];
    return availableModelsCache;
  } catch (error) {
    console.error('Error getting available models:', error);
    toast({
      title: "Error",
      description: "Failed to retrieve available AI models",
      variant: "destructive"
    });
    return [];
  }
};

// Format model name for display
const formatModelName = (modelId: string): string => {
  return modelId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

// Query LLM with advanced options
export const queryLLM = async (
  prompt: string,
  provider: LLMProvider = 'ollama',
  model: string = provider === 'ollama' ? 'llama3' : 'gemini-pro',
  options: LLMQueryOptions = {}
): Promise<LLMResponse> => {
  const startTime = Date.now();
  
  try {
    if (!window.electron) {
      throw new Error('Electron API not available');
    }
    
    // Check if the provider is available
    if (provider === 'ollama' && !window.electron.ollama) {
      throw new Error('Ollama API not available');
    }
    
    if (provider === 'gemini' && !window.electron.gemini) {
      throw new Error('Gemini API not available');
    }
    
    // Generate a unique ID for this query
    const queryId = Date.now().toString();
    
    // Prepare full prompt with system prompt if provided
    let fullPrompt = prompt;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
    }
    
    // Create a promise that will resolve when we get a response
    const responsePromise = new Promise<string>((resolve, reject) => {
      let responseText = '';
      
      // Handler for streaming responses
      const handlePartialResponse = (text: string) => {
        responseText += text;
        if (options.streaming && options.onPartialResponse) {
          options.onPartialResponse(responseText);
        }
      };
      
      // Setup one-time listener for this specific query
      const responseHandler = (event: any, response: { 
        id: string, 
        response?: any, 
        error?: string,
        partial?: string
      }) => {
        if (response.id === queryId) {
          // For partial responses (streaming)
          if (response.partial && options.streaming) {
            handlePartialResponse(response.partial);
            return; // Don't remove the listener yet
          }
          
          // Remove the listener once we get our full response
          if (provider === 'ollama') {
            window.electron.ollama.off('ollama-response', responseHandler);
          } else {
            window.electron.gemini.off('gemini-response', responseHandler);
          }
          
          if (response.error) {
            reject(new Error(response.error));
          } else if (response.response) {
            // For Ollama, the response structure is different than Gemini
            if (provider === 'ollama') {
              resolve(response.response.response || '');
            } else {
              resolve(response.response.text || '');
            }
          } else {
            reject(new Error(`Invalid response from ${provider}`));
          }
        }
      };
      
      // Register the listener based on provider
      if (provider === 'ollama') {
        window.electron.ollama.on('ollama-response', responseHandler);
      } else {
        window.electron.gemini.on('gemini-response', responseHandler);
      }
      
      // Set a timeout in case we never get a response
      setTimeout(() => {
        if (provider === 'ollama') {
          window.electron.ollama.off('ollama-response', responseHandler);
        } else {
          window.electron.gemini.off('gemini-response', responseHandler);
        }
        reject(new Error(`Timeout waiting for ${provider} response`));
      }, 60000); // 60 second timeout
      
      // Send the query based on provider
      if (provider === 'ollama') {
        window.electron.ollama.query({
          id: queryId,
          prompt: fullPrompt,
          model
        });
      } else {
        window.electron.gemini.query({
          id: queryId,
          prompt: fullPrompt
        });
      }
    });
    
    // Wait for the response
    const responseText = await responsePromise;
    const endTime = Date.now();
    
    // Return the final response with metadata
    return {
      text: responseText,
      model,
      provider,
      timestamp: Date.now(),
      processingTime: endTime - startTime,
      // Rough estimation of tokens (not accurate)
      tokens: Math.round(responseText.length / 4)
    };
  } catch (error) {
    console.error(`Error querying ${provider}:`, error);
    toast({
      title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Error`,
      description: `Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      variant: "destructive"
    });
    throw error;
  }
};

// Find the best model for a specific task
export const findBestModelForTask = async (task: string): Promise<LLMModel | null> => {
  const models = await getAvailableModels();
  
  // Simple logic for now - prefer larger models for complex tasks
  if (task.includes('code') || task.includes('program') || task.includes('technical')) {
    // Look for code-specific models
    const codeModels = models.filter(m => 
      m.name.toLowerCase().includes('code') || 
      m.id.includes('deepseek') || 
      m.id.includes('starcoder')
    );
    
    if (codeModels.length > 0) {
      return codeModels[0];
    }
  }
  
  // For creative tasks
  if (task.includes('creative') || task.includes('story') || task.includes('imagine')) {
    // Prefer llama models for creative tasks
    const creativeModels = models.filter(m => 
      m.id.includes('llama') || 
      m.id.includes('gemini')
    );
    
    if (creativeModels.length > 0) {
      return creativeModels[0];
    }
  }
  
  // Default to the first available model
  return models.length > 0 ? models[0] : null;
};
