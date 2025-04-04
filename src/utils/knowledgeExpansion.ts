
import { toast } from "@/components/ui/use-toast";

// Types for knowledge expansion
export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'api' | 'web' | 'rss' | 'database';
  url: string;
  active: boolean;
  lastUpdated?: number;
  errorCount?: number;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  tags: string[];
  confidence: number;
  timestamp: number;
}

export interface SearchResult {
  entries: KnowledgeEntry[];
  total: number;
  query: string;
  timestamp: number;
}

// Local storage keys
const KNOWLEDGE_SOURCES_KEY = 'karna-knowledge-sources';
const KNOWLEDGE_ENTRIES_KEY = 'karna-knowledge-entries';

// Get all knowledge sources
export const getKnowledgeSources = (): KnowledgeSource[] => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_SOURCES_KEY);
    
    if (!stored) {
      // Initialize with default sources
      const defaultSources: KnowledgeSource[] = [
        {
          id: 'wikipedia',
          name: 'Wikipedia',
          type: 'api',
          url: 'https://en.wikipedia.org/api/rest_v1/page/summary/',
          active: true
        },
        {
          id: 'news-api',
          name: 'News API',
          type: 'api',
          url: 'https://newsapi.org/v2/top-headlines',
          active: false
        }
      ];
      
      localStorage.setItem(KNOWLEDGE_SOURCES_KEY, JSON.stringify(defaultSources));
      return defaultSources;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting knowledge sources:', error);
    return [];
  }
};

// Add or update a knowledge source
export const updateKnowledgeSource = (source: KnowledgeSource): boolean => {
  try {
    const sources = getKnowledgeSources();
    const index = sources.findIndex(s => s.id === source.id);
    
    if (index >= 0) {
      sources[index] = source;
    } else {
      sources.push(source);
    }
    
    localStorage.setItem(KNOWLEDGE_SOURCES_KEY, JSON.stringify(sources));
    return true;
  } catch (error) {
    console.error('Error updating knowledge source:', error);
    return false;
  }
};

// Remove a knowledge source
export const removeKnowledgeSource = (id: string): boolean => {
  try {
    const sources = getKnowledgeSources();
    const updatedSources = sources.filter(s => s.id !== id);
    
    localStorage.setItem(KNOWLEDGE_SOURCES_KEY, JSON.stringify(updatedSources));
    return true;
  } catch (error) {
    console.error('Error removing knowledge source:', error);
    return false;
  }
};

// Get all knowledge entries
export const getKnowledgeEntries = (): KnowledgeEntry[] => {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_ENTRIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting knowledge entries:', error);
    return [];
  }
};

// Add a knowledge entry
export const addKnowledgeEntry = (entry: KnowledgeEntry): boolean => {
  try {
    const entries = getKnowledgeEntries();
    entries.push(entry);
    
    localStorage.setItem(KNOWLEDGE_ENTRIES_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error('Error adding knowledge entry:', error);
    return false;
  }
};

// Search knowledge entries
export const searchKnowledge = (query: string): SearchResult => {
  try {
    const entries = getKnowledgeEntries();
    const searchTerms = query.toLowerCase().split(' ');
    
    const results = entries.filter(entry => {
      const titleMatch = searchTerms.some(term => 
        entry.title.toLowerCase().includes(term)
      );
      
      const contentMatch = searchTerms.some(term => 
        entry.content.toLowerCase().includes(term)
      );
      
      const tagMatch = entry.tags.some(tag => 
        searchTerms.some(term => tag.toLowerCase().includes(term))
      );
      
      return titleMatch || contentMatch || tagMatch;
    });
    
    // Sort by relevance (implement more sophisticated ranking later)
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    return {
      entries: results,
      total: results.length,
      query,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error searching knowledge:', error);
    return {
      entries: [],
      total: 0,
      query,
      timestamp: Date.now()
    };
  }
};

// Fetch knowledge from Wikipedia (example)
export const fetchFromWikipedia = async (topic: string): Promise<KnowledgeEntry | null> => {
  try {
    // In Electron environment, use node-fetch via IPC
    if (window.electron?.knowledgeExpansion?.fetchWikipedia) {
      const result = await window.electron.knowledgeExpansion.fetchWikipedia(topic);
      return result;
    }
    
    // Browser fallback (CORS issues may occur)
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
    
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const entry: KnowledgeEntry = {
      id: `wiki-${Date.now()}`,
      title: data.title,
      content: data.extract,
      source: 'Wikipedia',
      sourceUrl: data.content_urls?.desktop?.page,
      tags: [topic],
      confidence: 0.9,
      timestamp: Date.now()
    };
    
    // Store the entry
    addKnowledgeEntry(entry);
    
    return entry;
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    toast({
      title: "Knowledge Fetch Failed",
      description: `Could not retrieve information about "${topic}" from Wikipedia.`,
      variant: "destructive"
    });
    return null;
  }
};

// Schedule knowledge updates
export const scheduleKnowledgeUpdates = (intervalMinutes = 60): (() => void) => {
  const interval = setInterval(async () => {
    try {
      const sources = getKnowledgeSources().filter(s => s.active);
      
      for (const source of sources) {
        // Set last updated time
        source.lastUpdated = Date.now();
        updateKnowledgeSource(source);
        
        // Update based on source type (just a stub for now)
        console.log(`Scheduled knowledge update for ${source.name}`);
      }
    } catch (error) {
      console.error('Error in scheduled knowledge updates:', error);
    }
  }, intervalMinutes * 60 * 1000);
  
  // Return a function to cancel the schedule
  return () => clearInterval(interval);
};
