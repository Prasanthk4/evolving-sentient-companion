import { toast } from "@/components/ui/use-toast";
import { queryLLM } from "@/utils/advancedLLM";

// Types for knowledge expansion
export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  timestamp: number;
  tags: string[];
}

interface WikipediaResult {
  title: string;
  content: string;
  url: string;
}

// Local storage key for knowledge base
const KNOWLEDGE_BASE_KEY = 'karna-knowledge-base';

// Fetch information from Wikipedia
export const fetchFromWikipedia = async (topic: string): Promise<KnowledgeEntry | null> => {
  try {
    // First try using Electron bridge if available
    if (window.electron?.knowledgeExpansion?.searchWikipedia) {
      const result = await window.electron.knowledgeExpansion.searchWikipedia(topic);
      
      if (result) {
        // Save to knowledge base
        const entry: KnowledgeEntry = {
          id: `wiki-${Date.now()}`,
          title: result.title,
          content: result.content,
          source: `Wikipedia: ${result.url}`,
          timestamp: Date.now(),
          tags: [topic, 'wikipedia']
        };
        
        saveToKnowledgeBase(entry);
        return entry;
      }
    }
    
    // Fall back to a simplified mock implementation
    console.log(`Fetching Wikipedia data for: ${topic}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use LLM to generate a Wikipedia-like response
    const prompt = `Create a Wikipedia-style summary about "${topic}". Include factual information only, written in an encyclopedic style. Limit to 2-3 paragraphs.`;
    
    const response = await queryLLM(prompt, 'ollama');
    
    // Create and save knowledge entry
    const entry: KnowledgeEntry = {
      id: `wiki-${Date.now()}`,
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      content: response.text,
      source: 'Wikipedia (simulated)',
      timestamp: Date.now(),
      tags: [topic, 'wikipedia', 'simulated']
    };
    
    saveToKnowledgeBase(entry);
    return entry;
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    toast({
      title: "Knowledge Retrieval Error",
      description: "Could not fetch information from Wikipedia.",
      variant: "destructive"
    });
    return null;
  }
};

// Search web for recent information
export const searchWeb = async (query: string): Promise<KnowledgeEntry | null> => {
  try {
    // First try using Electron bridge if available
    if (window.electron?.knowledgeExpansion?.searchWeb) {
      const result = await window.electron.knowledgeExpansion.searchWeb(query);
      
      if (result) {
        // Save to knowledge base
        const entry: KnowledgeEntry = {
          id: `web-${Date.now()}`,
          title: result.title,
          content: result.content,
          source: result.source,
          timestamp: Date.now(),
          tags: [query, 'web-search']
        };
        
        saveToKnowledgeBase(entry);
        return entry;
      }
    }
    
    // Fall back to a simplified mock implementation
    console.log(`Searching web for: ${query}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Use LLM to generate a search result
    const prompt = `Generate a search result about "${query}". Format as if it's from a search engine, with current information as of April 2025. Include a title and content.`;
    
    const response = await queryLLM(prompt, 'ollama');
    
    // Extract title and content
    let title = query;
    let content = response.text;
    
    const titleMatch = content.match(/^#\s*(.+)$|^(.+?)\n/m);
    if (titleMatch) {
      title = (titleMatch[1] || titleMatch[2]).trim();
      content = content.replace(titleMatch[0], '').trim();
    }
    
    // Create and save knowledge entry
    const entry: KnowledgeEntry = {
      id: `web-${Date.now()}`,
      title,
      content,
      source: 'Web Search (simulated)',
      timestamp: Date.now(),
      tags: [query, 'web-search', 'simulated']
    };
    
    saveToKnowledgeBase(entry);
    return entry;
  } catch (error) {
    console.error('Error searching web:', error);
    toast({
      title: "Web Search Error",
      description: "Could not retrieve search results.",
      variant: "destructive"
    });
    return null;
  }
};

// Save entry to knowledge base
export const saveToKnowledgeBase = (entry: KnowledgeEntry): void => {
  try {
    const knowledgeBase = getKnowledgeBase();
    
    // Check if entry with same id already exists
    const existingIndex = knowledgeBase.findIndex(e => e.id === entry.id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      knowledgeBase[existingIndex] = entry;
    } else {
      // Add new entry
      knowledgeBase.push(entry);
    }
    
    // Save to local storage
    localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(knowledgeBase));
  } catch (error) {
    console.error('Error saving to knowledge base:', error);
  }
};

// Get knowledge base
export const getKnowledgeBase = (): KnowledgeEntry[] => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting knowledge base:', error);
    return [];
  }
};

// Search knowledge base
export const searchKnowledgeBase = (query: string): KnowledgeEntry[] => {
  try {
    const knowledgeBase = getKnowledgeBase();
    const normalizedQuery = query.toLowerCase();
    
    return knowledgeBase.filter(entry => 
      entry.title.toLowerCase().includes(normalizedQuery) ||
      entry.content.toLowerCase().includes(normalizedQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
    );
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }
};

// Delete entry from knowledge base
export const deleteKnowledgeEntry = (id: string): boolean => {
  try {
    const knowledgeBase = getKnowledgeBase();
    const filteredBase = knowledgeBase.filter(entry => entry.id !== id);
    
    if (filteredBase.length < knowledgeBase.length) {
      localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(filteredBase));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting knowledge entry:', error);
    return false;
  }
};

// Expand knowledge on a topic
export const expandKnowledgeOnTopic = async (topic: string): Promise<KnowledgeEntry | null> => {
  try {
    // First check if we already have information in our knowledge base
    const existingEntries = searchKnowledgeBase(topic);
    
    if (existingEntries.length > 0) {
      // Find the most recent entry
      const mostRecent = existingEntries.reduce((latest, entry) => 
        entry.timestamp > latest.timestamp ? entry : latest, existingEntries[0]);
      
      // If entry is less than 24 hours old, return it
      if (Date.now() - mostRecent.timestamp < 24 * 60 * 60 * 1000) {
        return mostRecent;
      }
    }
    
    // Otherwise, fetch new information
    const wikiEntry = await fetchFromWikipedia(topic);
    
    if (wikiEntry) {
      return wikiEntry;
    }
    
    // If Wikipedia fails, try web search
    return await searchWeb(topic);
  } catch (error) {
    console.error('Error expanding knowledge:', error);
    return null;
  }
};

// Check if knowledge exists
export const hasKnowledgeOn = (topic: string): boolean => {
  const entries = searchKnowledgeBase(topic);
  return entries.length > 0;
};

// Scheduled knowledge updates
export const scheduleKnowledgeUpdates = (intervalHours = 24) => {
  // Convert hours to milliseconds
  const interval = intervalHours * 60 * 60 * 1000;
  
  // Set up interval for knowledge updates
  setInterval(async () => {
    try {
      const knowledgeBase = getKnowledgeBase();
      
      // Update entries older than 7 days (one at a time)
      const now = Date.now();
      const oldEntryThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      const outdatedEntry = knowledgeBase.find(entry => 
        (now - entry.timestamp) > oldEntryThreshold
      );
      
      if (outdatedEntry) {
        console.log(`Updating outdated knowledge: ${outdatedEntry.title}`);
        
        // Get main topic from tags
        const mainTopic = outdatedEntry.tags.find(tag => tag !== 'wikipedia' && tag !== 'web-search') || outdatedEntry.title;
        
        // Fetch updated information
        await expandKnowledgeOnTopic(mainTopic);
      }
    } catch (error) {
      console.error('Error in scheduled knowledge update:', error);
    }
  }, interval);
};
