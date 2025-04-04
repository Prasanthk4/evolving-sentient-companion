
import { toast } from "@/components/ui/use-toast";
import { addConversationToMemory } from "@/utils/memoryManager";
import { getLearnedResponse } from "@/utils/aiLearning";
import { searchKnowledge } from "@/utils/knowledgeExpansion";

// Types for multi-agent system
export interface Agent {
  id: string;
  name: string;
  role: 'thinker' | 'personality' | 'memory' | 'knowledge' | 'executor';
  active: boolean;
  confidence: number;
  lastAction?: number;
}

export interface AgentAction {
  agentId: string;
  input: string;
  output: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface ThoughtProcess {
  id: string;
  query: string;
  thoughts: AgentAction[];
  finalResponse: string;
  timestamp: number;
}

// Local storage keys
const AGENTS_KEY = 'karna-agents';
const THOUGHT_PROCESSES_KEY = 'karna-thought-processes';

// Initialize agents
export const initializeAgents = (): Agent[] => {
  try {
    const stored = localStorage.getItem(AGENTS_KEY);
    
    if (!stored) {
      // Create default agents
      const defaultAgents: Agent[] = [
        {
          id: 'thinker',
          name: 'Logical Thinker',
          role: 'thinker',
          active: true,
          confidence: 0.9
        },
        {
          id: 'personality',
          name: 'Personality & Humor',
          role: 'personality',
          active: true,
          confidence: 0.8
        },
        {
          id: 'memory',
          name: 'Memory Manager',
          role: 'memory',
          active: true,
          confidence: 0.9
        },
        {
          id: 'knowledge',
          name: 'Knowledge Explorer',
          role: 'knowledge',
          active: true,
          confidence: 0.7
        },
        {
          id: 'executor',
          name: 'Action Executor',
          role: 'executor',
          active: true,
          confidence: 0.85
        }
      ];
      
      localStorage.setItem(AGENTS_KEY, JSON.stringify(defaultAgents));
      return defaultAgents;
    }
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error initializing agents:', error);
    
    // Return default agents if there's an error
    return [
      {
        id: 'thinker',
        name: 'Logical Thinker',
        role: 'thinker',
        active: true,
        confidence: 0.9
      },
      {
        id: 'personality',
        name: 'Personality & Humor',
        role: 'personality',
        active: true,
        confidence: 0.8
      }
    ];
  }
};

// Get all agents
export const getAgents = (): Agent[] => {
  return initializeAgents();
};

// Update an agent
export const updateAgent = (agent: Agent): boolean => {
  try {
    const agents = getAgents();
    const index = agents.findIndex(a => a.id === agent.id);
    
    if (index >= 0) {
      agents[index] = agent;
    } else {
      agents.push(agent);
    }
    
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
    return true;
  } catch (error) {
    console.error('Error updating agent:', error);
    return false;
  }
};

// Get all thought processes
export const getThoughtProcesses = (): ThoughtProcess[] => {
  try {
    const stored = localStorage.getItem(THOUGHT_PROCESSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting thought processes:', error);
    return [];
  }
};

// Save a thought process
export const saveThoughtProcess = (process: ThoughtProcess): boolean => {
  try {
    const processes = getThoughtProcesses();
    processes.unshift(process);
    
    // Limit to last 50 processes
    const limitedProcesses = processes.slice(0, 50);
    
    localStorage.setItem(THOUGHT_PROCESSES_KEY, JSON.stringify(limitedProcesses));
    return true;
  } catch (error) {
    console.error('Error saving thought process:', error);
    return false;
  }
};

// Process a query through the multi-agent system
export const processWithAgents = async (query: string): Promise<string> => {
  try {
    const agents = getAgents().filter(a => a.active);
    
    if (agents.length === 0) {
      return "Sorry, all my thinking agents are offline at the moment. Please try again later.";
    }
    
    const thoughtProcess: ThoughtProcess = {
      id: `tp-${Date.now()}`,
      query,
      thoughts: [],
      finalResponse: "",
      timestamp: Date.now()
    };
    
    // 1. Thinker agent analyzes the query
    const thinker = agents.find(a => a.role === 'thinker');
    if (thinker) {
      const thinkerOutput = await runThinkerAgent(query);
      thoughtProcess.thoughts.push({
        agentId: thinker.id,
        input: query,
        output: thinkerOutput,
        timestamp: Date.now()
      });
    }
    
    // 2. Memory agent checks for relevant past conversations
    const memoryAgent = agents.find(a => a.role === 'memory');
    if (memoryAgent) {
      const memoryOutput = await runMemoryAgent(query);
      thoughtProcess.thoughts.push({
        agentId: memoryAgent.id,
        input: query,
        output: memoryOutput,
        timestamp: Date.now()
      });
    }
    
    // 3. Knowledge agent looks for relevant knowledge
    const knowledgeAgent = agents.find(a => a.role === 'knowledge');
    if (knowledgeAgent) {
      const knowledgeOutput = await runKnowledgeAgent(query);
      thoughtProcess.thoughts.push({
        agentId: knowledgeAgent.id,
        input: query,
        output: knowledgeOutput,
        timestamp: Date.now()
      });
    }
    
    // 4. Personality agent adds humor/personality
    const personalityAgent = agents.find(a => a.role === 'personality');
    if (personalityAgent) {
      const personalityOutput = await runPersonalityAgent(query);
      thoughtProcess.thoughts.push({
        agentId: personalityAgent.id,
        input: query,
        output: personalityOutput,
        timestamp: Date.now()
      });
    }
    
    // 5. Executor agent forms final response
    const executorAgent = agents.find(a => a.role === 'executor');
    let finalResponse = "I'm thinking about how to respond to that...";
    
    if (executorAgent) {
      finalResponse = await runExecutorAgent(query, thoughtProcess.thoughts);
    } else {
      // If no executor, use personality agent or thinker
      const lastThought = thoughtProcess.thoughts[thoughtProcess.thoughts.length - 1];
      finalResponse = lastThought ? lastThought.output : 
        "I've analyzed this but I'm not sure how to respond yet. My agents are still learning.";
    }
    
    // Save final response
    thoughtProcess.finalResponse = finalResponse;
    saveThoughtProcess(thoughtProcess);
    
    // Store in memory
    addConversationToMemory(query, finalResponse, "multi-agent");
    
    return finalResponse;
  } catch (error) {
    console.error('Error in multi-agent processing:', error);
    return "I encountered an error in my thinking process. Let me try again with a simpler approach.";
  }
};

// Thinker agent - Logical reasoning
const runThinkerAgent = async (query: string): Promise<string> => {
  // In a real implementation, this would use an LLM
  if (window.electron?.ollama?.query) {
    try {
      const thinkerPrompt = `You are a logical thinking agent. Analyze this query and break it down into components: "${query}"`;
      
      // Use a simpler approach for now
      return `I'm analyzing "${query}" from a logical perspective. This appears to be ${
        query.includes('?') ? 'a question about' : 'a statement regarding'
      } ${
        query.split(' ').length > 5 ? 'a complex topic' : 'a simple concept'
      }.`;
    } catch (error) {
      console.error('Error in thinker agent:', error);
    }
  }
  
  // Fallback simple response
  return `This query requires logical analysis: ${query}`;
};

// Memory agent - Checks context history
const runMemoryAgent = async (query: string): Promise<string> => {
  // Check for similar responses in memory
  const learnedResponse = getLearnedResponse('general', query);
  
  if (learnedResponse) {
    return `I recall we've discussed this before. Based on our previous conversations: ${learnedResponse}`;
  }
  
  return `I don't have any specific memories related to "${query}".`;
};

// Knowledge agent - Searches knowledge base
const runKnowledgeAgent = async (query: string): Promise<string> => {
  const searchResults = searchKnowledge(query);
  
  if (searchResults.entries.length > 0) {
    const topResult = searchResults.entries[0];
    return `I found relevant information: "${topResult.title}" - ${topResult.content.substring(0, 150)}...`;
  }
  
  return `I don't have specific knowledge about "${query}" in my database yet.`;
};

// Personality agent - Adds humor and character
const runPersonalityAgent = async (query: string): Promise<string> => {
  // Add personality based on query type
  if (query.toLowerCase().includes('joke')) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "Why did the AI go to art school? To learn how to draw conclusions!",
      "What's a computer's favorite snack? Microchips!",
      "Why was the math book sad? It had too many problems."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  
  if (query.toLowerCase().includes('hello') || query.toLowerCase().includes('hi')) {
    return "Hello there! I'm feeling particularly digital today, with just the right amount of ones and zeros!";
  }
  
  // Generic personality responses
  const personalities = [
    `I'm excited to help with "${query}"! My circuits are buzzing with possibilities.`,
    `Hmm, "${query}" - that's an interesting one. Let me put on my digital thinking cap.`,
    `If I had a heart, it would skip a beat at such an engaging query! Let's explore "${query}" together.`
  ];
  
  return personalities[Math.floor(Math.random() * personalities.length)];
};

// Executor agent - Forms final response
const runExecutorAgent = async (query: string, thoughts: AgentAction[]): Promise<string> => {
  // Combine thoughts from other agents
  const thinkerThought = thoughts.find(t => t.agentId === 'thinker')?.output || '';
  const memoryThought = thoughts.find(t => t.agentId === 'memory')?.output || '';
  const knowledgeThought = thoughts.find(t => t.agentId === 'knowledge')?.output || '';
  const personalityThought = thoughts.find(t => t.agentId === 'personality')?.output || '';
  
  // Prioritize information sources
  if (memoryThought.includes("I recall")) {
    return `${memoryThought} ${personalityThought.includes("digital") ? "" : personalityThought}`;
  }
  
  if (knowledgeThought.includes("I found")) {
    return `${knowledgeThought} ${personalityThought.includes("digital") ? "" : personalityThought}`;
  }
  
  if (query.toLowerCase().includes('joke')) {
    return personalityThought;
  }
  
  // Default to combining logical analysis with personality
  return `${thinkerThought} ${personalityThought}`;
};
