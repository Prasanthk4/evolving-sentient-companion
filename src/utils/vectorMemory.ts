
import { ConversationMemory, MemoryContext, loadMemoryContext, saveMemoryContext } from "./memoryManager";
import { toast } from "@/components/ui/use-toast";

// Simple vector type for memory embeddings
export interface VectorEmbedding {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Memory with vector capabilities
export interface VectorMemoryContext extends MemoryContext {
  embeddings: VectorEmbedding[];
}

// Constants
const MAX_EMBEDDINGS = 1000; // Limit the number of embeddings for performance
const VECTOR_DIMENSION = 128; // Dimension of the vector embeddings

/**
 * Create a simple embedding from text (mock implementation)
 * In a real system, this would call an AI embedding model
 */
export const createEmbedding = (text: string): number[] => {
  // This is a simplified mock that creates random vectors
  // In a real system, this would call an embedding model API
  const vector: number[] = [];
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    // Create somewhat deterministic values based on the input text
    // so similar texts produce somewhat similar vectors
    const charCodes = text.split('').map(c => c.charCodeAt(0));
    const sum = charCodes.reduce((a, b) => a + b, 0);
    vector.push((Math.sin(i * sum / 1000) + 1) / 2); // Values between 0-1
  }
  
  // Normalize the vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
};

/**
 * Calculate cosine similarity between two vectors
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  // Vectors are already normalized, so cosine similarity is just the dot product
  return dotProduct;
};

/**
 * Add a memory with vector embedding
 */
export const addVectorizedMemory = (userMessage: string, karnaResponse: string, topic?: string): void => {
  try {
    const context = loadMemoryContext() as VectorMemoryContext;
    if (!context.embeddings) {
      context.embeddings = [];
    }
    
    // Create new conversation entry
    const conversation: ConversationMemory = {
      id: generateUniqueId(),
      timestamp: Date.now(),
      userMessage,
      karnaResponse,
      topic
    };
    
    // Add to conversations array
    context.conversations.unshift(conversation);
    
    // Create and store the embeddings
    const combinedText = `${userMessage} ${karnaResponse}`;
    const embedding: VectorEmbedding = {
      id: conversation.id,
      vector: createEmbedding(combinedText),
      text: combinedText,
      metadata: {
        conversationId: conversation.id,
        topic
      },
      timestamp: Date.now()
    };
    
    // Add embedding to the collection
    context.embeddings.unshift(embedding);
    
    // Trim embeddings if needed
    if (context.embeddings.length > MAX_EMBEDDINGS) {
      context.embeddings = context.embeddings.slice(0, MAX_EMBEDDINGS);
    }
    
    // Update topic familiarity if a topic is specified
    if (topic) {
      if (!context.topics[topic]) {
        context.topics[topic] = {
          lastDiscussed: Date.now(),
          familiarity: 10
        };
      } else {
        context.topics[topic].lastDiscussed = Date.now();
        context.topics[topic].familiarity = Math.min(100, context.topics[topic].familiarity + 5);
      }
    }
    
    context.lastUpdated = Date.now();
    saveMemoryContext(context);
  } catch (error) {
    console.error('Error adding vectorized memory:', error);
    toast({
      title: "Memory Error",
      description: "Failed to save memory with vector embedding",
      variant: "destructive"
    });
  }
};

/**
 * Semantic search in memory
 */
export const semanticSearch = (query: string, limit: number = 5): ConversationMemory[] => {
  try {
    const context = loadMemoryContext() as VectorMemoryContext;
    if (!context.embeddings || context.embeddings.length === 0) {
      return [];
    }
    
    // Create query vector
    const queryVector = createEmbedding(query);
    
    // Calculate similarities with all embeddings
    const similarities = context.embeddings.map(embedding => ({
      embedding,
      similarity: cosineSimilarity(queryVector, embedding.vector)
    }));
    
    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Get the top results
    const topResults = similarities.slice(0, limit);
    
    // Find and return the corresponding conversations
    return topResults.map(result => {
      const conversationId = result.embedding.metadata?.conversationId;
      return context.conversations.find(conv => conv.id === conversationId) as ConversationMemory;
    }).filter(Boolean);
  } catch (error) {
    console.error('Error during semantic search:', error);
    toast({
      title: "Search Error",
      description: "Failed to perform semantic search in memory",
      variant: "destructive"
    });
    return [];
  }
};

/**
 * Generate a unique ID for memory entries
 */
const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};
