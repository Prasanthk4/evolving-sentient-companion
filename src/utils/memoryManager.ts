
import { toast } from "@/components/ui/use-toast";

// Owner profile interface
export interface OwnerProfile {
  id: string;
  name: string;
  voiceSignature?: string[];
  faceSignature?: string;
  preferences?: {
    [key: string]: any;
  };
  lastSeen: number;
}

// Conversation memory interface
export interface ConversationMemory {
  id: string;
  timestamp: number;
  userMessage: string;
  karnaResponse: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topic?: string;
}

// Memory context interface
export interface MemoryContext {
  owner: OwnerProfile | null;
  conversations: ConversationMemory[];
  topics: {
    [key: string]: {
      lastDiscussed: number;
      familiarity: number; // 0-100
    }
  };
  lastUpdated: number;
}

// Local storage keys
const OWNER_STORAGE_KEY = 'karna-owner-profile';
const MEMORY_STORAGE_KEY = 'karna-memory-context';
const MAX_CONVERSATIONS = 50; // Limit conversations to prevent storage issues

// Load owner profile from local storage
export const loadOwnerProfile = (): OwnerProfile | null => {
  try {
    const stored = localStorage.getItem(OWNER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error loading owner profile:', error);
    return null;
  }
};

// Save owner profile to local storage
export const saveOwnerProfile = (profile: OwnerProfile): void => {
  try {
    localStorage.setItem(OWNER_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving owner profile:', error);
    toast({
      title: "System Error",
      description: "Failed to save owner profile to memory",
      variant: "destructive"
    });
  }
};

// Initialize owner profile (only if none exists)
export const initializeOwnerProfile = (name: string): OwnerProfile => {
  const existingProfile = loadOwnerProfile();
  
  if (existingProfile) {
    return existingProfile;
  }
  
  const newProfile: OwnerProfile = {
    id: generateUniqueId(),
    name,
    lastSeen: Date.now()
  };
  
  saveOwnerProfile(newProfile);
  
  toast({
    title: "Owner Profile Created",
    description: `Welcome, ${name}! I'll remember you from now on.`
  });
  
  return newProfile;
};

// Update owner's voice signature
export const updateVoiceSignature = (voiceData: string[]): void => {
  const profile = loadOwnerProfile();
  
  if (profile) {
    profile.voiceSignature = voiceData;
    profile.lastSeen = Date.now();
    saveOwnerProfile(profile);
  }
};

// Update owner's face signature
export const updateFaceSignature = (faceData: string): void => {
  const profile = loadOwnerProfile();
  
  if (profile) {
    profile.faceSignature = faceData;
    profile.lastSeen = Date.now();
    saveOwnerProfile(profile);
  }
};

// Load memory context from local storage
export const loadMemoryContext = (): MemoryContext => {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    
    if (stored) {
      return JSON.parse(stored);
    } else {
      // Initialize empty memory context
      const initialContext: MemoryContext = {
        owner: loadOwnerProfile(),
        conversations: [],
        topics: {},
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(initialContext));
      return initialContext;
    }
  } catch (error) {
    console.error('Error loading memory context:', error);
    return {
      owner: null,
      conversations: [],
      topics: {},
      lastUpdated: Date.now()
    };
  }
};

// Save memory context to local storage
export const saveMemoryContext = (context: MemoryContext): void => {
  try {
    // Trim conversations if needed
    if (context.conversations.length > MAX_CONVERSATIONS) {
      context.conversations = context.conversations.slice(-MAX_CONVERSATIONS);
    }
    
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.error('Error saving memory context:', error);
  }
};

// Add a conversation to memory
export const addConversationToMemory = (userMessage: string, karnaResponse: string, topic?: string): void => {
  const context = loadMemoryContext();
  
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
};

// Get recent conversations
export const getRecentConversations = (limit: number = 10): ConversationMemory[] => {
  const context = loadMemoryContext();
  return context.conversations.slice(0, limit);
};

// Search conversations by topic or content
export const searchConversations = (query: string): ConversationMemory[] => {
  const context = loadMemoryContext();
  const normalizedQuery = query.toLowerCase();
  
  return context.conversations.filter(conv => 
    conv.topic?.toLowerCase().includes(normalizedQuery) ||
    conv.userMessage.toLowerCase().includes(normalizedQuery) ||
    conv.karnaResponse.toLowerCase().includes(normalizedQuery)
  );
};

// Check if KARNA remembers a topic
export const remembersAbout = (topic: string): boolean => {
  const context = loadMemoryContext();
  return Boolean(context.topics[topic.toLowerCase()]);
};

// Recognize owner based on voice signature (simplified simulation)
export const recognizeOwnerVoice = (voiceData: string[]): boolean => {
  const profile = loadOwnerProfile();
  
  if (!profile || !profile.voiceSignature) {
    return false;
  }
  
  // This is a simplified example. In a real implementation,
  // you would use voice biometrics comparison algorithms
  return true;
};

// Recognize owner based on face signature (simplified simulation)
export const recognizeOwnerFace = (faceData: string): boolean => {
  const profile = loadOwnerProfile();
  
  if (!profile || !profile.faceSignature) {
    return false;
  }
  
  // This is a simplified example. In a real implementation,
  // you would use facial recognition algorithms
  return true;
};

// Generate a unique ID for memory entries
const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Clear all memory (for testing or reset)
export const clearMemory = (): void => {
  localStorage.removeItem(MEMORY_STORAGE_KEY);
  localStorage.removeItem(OWNER_STORAGE_KEY);
  
  toast({
    title: "Memory Reset",
    description: "All memory data has been cleared."
  });
};

