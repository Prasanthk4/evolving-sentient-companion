import { toast } from "@/components/ui/use-toast";
import { queryLLM } from "@/utils/advancedLLM";
import { getRecentConversations, addConversationToMemory } from "@/utils/memoryManager";
import { getEmotionAdjustedResponse } from "@/utils/emotionAnalysis";
import { fetchFromWikipedia } from "@/utils/knowledgeExpansion";

// Agent types
type AgentRole = 'thinker' | 'personality' | 'memory' | 'knowledge' | 'coordinator';

// Agent interface
interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  process: (input: string, context: AgentContext) => Promise<string>;
}

// Agent context for sharing data between agents
interface AgentContext {
  userMessage: string;
  recentConversations: any[];
  currentEmotion?: string;
  processingSteps: {
    agentId: string;
    output: string;
  }[];
}

// Create the agent system
class MultiAgentSystem {
  private agents: Agent[] = [];
  
  constructor() {
    this.initializeAgents();
  }
  
  // Create specialized agents according to blueprint
  private initializeAgents() {
    // Thinker Agent - Logical reasoning and problem-solving
    this.agents.push({
      id: 'thinker',
      name: 'Analytical Thinker',
      role: 'thinker',
      description: 'Applies logical reasoning and critical thinking to solve problems',
      process: async (input, context) => {
        try {
          const prompt = `As a logical thinking agent, analyze this user request objectively and generate a structured response:
          
User message: ${input}

Focus on problem-solving, logical deduction, and factual accuracy.
Provide a clear, step-by-step analysis if the query requires reasoning.
`;

          const response = await queryLLM(prompt, 'ollama');
          return response.text;
        } catch (error) {
          console.error('Thinker agent error:', error);
          return "I couldn't complete my logical analysis due to an error.";
        }
      }
    });
    
    // Personality Agent - Adding humor and emotional intelligence
    this.agents.push({
      id: 'personality',
      name: 'Personality Adapter',
      role: 'personality',
      description: 'Adds humor, empathy and adjusts tone based on context',
      process: async (input, context) => {
        try {
          // Base analysis from thinker if available
          const thinkerStep = context.processingSteps.find(step => step.agentId === 'thinker');
          const baseAnalysis = {
            type: "initial",
            content: thinkerStep?.output || input,
            confidence: 0.5
          };
          
          const prompt = `As a personality enhancement agent, make this response more engaging and personable:
          
Base content: ${baseAnalysis.content}

Add appropriate humor, empathy, or conversational elements while preserving the main message.
User's current detected emotion: ${context.currentEmotion || 'unknown'}
Recent conversation topic: ${context.recentConversations[0]?.topic || 'general conversation'}

Make the response sound more human and less robotic.`;

          const response = await queryLLM(prompt, 'ollama');
          return response.text;
        } catch (error) {
          console.error('Personality agent error:', error);
          return input;
        }
      }
    });
    
    // Memory Agent - Handling conversation history and user preferences
    this.agents.push({
      id: 'memory',
      name: 'Memory Specialist',
      role: 'memory',
      description: 'Recalls past conversations and user preferences',
      process: async (input, context) => {
        try {
          // Get recent conversations
          const relevantMemories = context.recentConversations
            .filter(conv => 
              conv.userMessage.toLowerCase().includes(input.toLowerCase()) ||
              input.toLowerCase().includes('remember') ||
              input.toLowerCase().includes('recall') ||
              input.toLowerCase().includes('previous')
            )
            .map(conv => `User said: "${conv.userMessage}" - I responded: "${conv.karnaResponse}"`)
            .join('\n');
          
          if (!relevantMemories) {
            return "No relevant memories found.";
          }
          
          const prompt = `As a memory specialist agent, incorporate these relevant past interactions into a helpful response:
          
User's current message: ${input}

Relevant past conversations:
${relevantMemories}

Create a response that acknowledges and builds upon our conversation history. Don't just list the past conversations, but incorporate them naturally.`;

          const response = await queryLLM(prompt, 'ollama');
          return response.text;
        } catch (error) {
          console.error('Memory agent error:', error);
          return "I'm having trouble accessing my memories right now.";
        }
      }
    });
    
    // Knowledge Agent - Information retrieval and expansion
    this.agents.push({
      id: 'knowledge',
      name: 'Knowledge Explorer',
      role: 'knowledge',
      description: 'Retrieves and expands knowledge from external sources',
      process: async (input, context) => {
        try {
          // Extract potential topics
          const topicMatch = input.match(/(?:about|what is|who is|tell me about) ([\w\s]+)(?:\?|$)/i);
          
          if (topicMatch && topicMatch[1]) {
            const topic = topicMatch[1].trim();
            
            // Try to get information from Wikipedia
            const knowledgeEntry = await fetchFromWikipedia(topic);
            
            if (knowledgeEntry) {
              return `${knowledgeEntry.title}: ${knowledgeEntry.content}`;
            }
          }
          
          return "I don't have specific knowledge about that topic yet.";
        } catch (error) {
          console.error('Knowledge agent error:', error);
          return "I couldn't retrieve the requested knowledge.";
        }
      }
    });
    
    // Coordinator Agent - Orchestrates other agents and compiles final response
    this.agents.push({
      id: 'coordinator',
      name: 'Response Coordinator',
      role: 'coordinator',
      description: 'Coordinates agent outputs and compiles the final response',
      process: async (input, context) => {
        try {
          // Gather all agent outputs
          const thinkerStep = context.processingSteps.find(step => step.agentId === 'thinker');
          const personalityStep = context.processingSteps.find(step => step.agentId === 'personality');
          const memoryStep = context.processingSteps.find(step => step.agentId === 'memory');
          const knowledgeStep = context.processingSteps.find(step => step.agentId === 'knowledge');
          
          const thinkerOutput = thinkerStep ? thinkerStep.output : '';
          const personalityOutput = personalityStep ? personalityStep.output : '';
          const memoryOutput = memoryStep ? memoryStep.output : '';
          const knowledgeOutput = knowledgeStep ? knowledgeStep.output : '';
          
          const prompt = `As a coordination agent, create a unified, coherent response from these agent outputs:
          
Logical analysis: ${thinkerOutput}
Personality enhancement: ${personalityOutput}
Memory context: ${memoryOutput}
Knowledge retrieval: ${knowledgeOutput}

User's original message: ${input}

Create a single, coherent response that integrates the most valuable insights from each agent while maintaining a consistent voice.`;

          const response = await queryLLM(prompt, 'ollama');
          return response.text;
        } catch (error) {
          console.error('Coordinator agent error:', error);
          
          // Fall back to the most appropriate single agent response
          const personalityStep = context.processingSteps.find(step => step.agentId === 'personality');
          const knowledgeStep = context.processingSteps.find(step => step.agentId === 'knowledge');
          const thinkerStep = context.processingSteps.find(step => step.agentId === 'thinker');
          const memoryStep = context.processingSteps.find(step => step.agentId === 'memory');
          
          if (personalityStep) return personalityStep.output;
          if (knowledgeStep) return knowledgeStep.output;
          if (thinkerStep) return thinkerStep.output;
          if (memoryStep) return memoryStep.output;
          
          return "I'm processing multiple threads of thought but having trouble coordinating them.";
        }
      }
    });
  }
  
  // Process user input through the multi-agent system
  async processInput(userMessage: string): Promise<string> {
    try {
      // Create context for agent communication
      const context: AgentContext = {
        userMessage,
        recentConversations: getRecentConversations(5),
        processingSteps: []
      };
      
      // Process message through core agents first
      const coreTasks = [
        this.runAgent('thinker', userMessage, context),
        this.runAgent('knowledge', userMessage, context)
      ];
      
      await Promise.all(coreTasks);
      
      // Then process through memory and personality agents
      await this.runAgent('memory', userMessage, context);
      await this.runAgent('personality', userMessage, context);
      
      // Finally, coordinate the response
      const finalResponse = await this.runAgent('coordinator', userMessage, context);
      
      return finalResponse;
    } catch (error) {
      console.error('Multi-agent system error:', error);
      return "I'm thinking about this from multiple angles but encountering some challenges.";
    }
  }
  
  // Run a specific agent
  private async runAgent(agentId: string, input: string, context: AgentContext): Promise<string> {
    const agent = this.agents.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    try {
      const output = await agent.process(input, context);
      
      // Store the output in the context
      context.processingSteps.push({
        agentId: agent.id,
        output
      });
      
      return output;
    } catch (error) {
      console.error(`Error running agent ${agentId}:`, error);
      return "";
    }
  }
}

// Singleton instance
const multiAgentSystem = new MultiAgentSystem();

// Exposed method to process user input through the multi-agent system
export const processWithAgents = async (userMessage: string): Promise<string> => {
  try {
    const response = await multiAgentSystem.processInput(userMessage);
    return response;
  } catch (error) {
    console.error('Error processing with agents:', error);
    return "I'm processing this through multiple perspectives but encountering some challenges.";
  }
};

// Get the list of active agents (for visualization)
export const getActiveAgents = (): {id: string, name: string, role: AgentRole}[] => {
  return multiAgentSystem['agents'].map(agent => ({
    id: agent.id,
    name: agent.name,
    role: agent.role
  }));
};
