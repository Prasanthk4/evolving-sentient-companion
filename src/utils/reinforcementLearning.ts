import { toast } from "@/components/ui/use-toast";
import { queryLLM } from "@/utils/advancedLLM";
import { FeedbackData } from "@/types/electron";

// Types for performance metrics
export interface PerformanceMetrics {
  averageScore: number;
  totalFeedback: number;
  improvementRate: number;
}

// Local storage keys
const FEEDBACK_HISTORY_KEY = 'karna-feedback-history';
const RESPONSE_IMPROVEMENT_KEY = 'karna-response-improvements';

// Feedback submission
export const submitFeedback = async (feedback: Omit<FeedbackData, 'timestamp'>): Promise<boolean> => {
  try {
    const completeData: FeedbackData = {
      ...feedback,
      timestamp: Date.now()
    };
    
    // Try to use electron API first
    if (window.electron?.reinforcementLearning?.submitFeedback) {
      const result = await window.electron.reinforcementLearning.submitFeedback(completeData);
      if (result) {
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback. It helps me improve!"
        });
        return true;
      }
    }
    
    // Fallback to localStorage
    const history = await getFeedbackHistory();
    history.push(completeData);
    localStorage.setItem(FEEDBACK_HISTORY_KEY, JSON.stringify(history));
    
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback. It helps me improve!"
    });
    
    return true;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    toast({
      title: "Error",
      description: "Failed to submit feedback. Please try again.",
      variant: "destructive"
    });
    
    return false;
  }
};

// Get feedback history
export const getFeedbackHistory = async (): Promise<FeedbackData[]> => {
  try {
    // Try to use electron API first
    if (window.electron?.reinforcementLearning?.getFeedbackHistory) {
      return await window.electron.reinforcementLearning.getFeedbackHistory();
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(FEEDBACK_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting feedback history:', error);
    return [];
  }
};

// Get performance metrics
export const getPerformanceMetrics = async (): Promise<PerformanceMetrics> => {
  try {
    // Try to use electron API first
    if (window.electron?.reinforcementLearning?.getPerformanceMetrics) {
      return await window.electron.reinforcementLearning.getPerformanceMetrics();
    }
    
    // Fallback to calculating metrics from local history
    const history = await getFeedbackHistory();
    
    if (history.length === 0) {
      return {
        averageScore: 0,
        totalFeedback: 0,
        improvementRate: 0
      };
    }
    
    const scores = history.map(item => item.score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      averageScore,
      totalFeedback: history.length,
      improvementRate: Math.min(0.95, averageScore / 5 + (history.length / 100))
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return {
      averageScore: 0,
      totalFeedback: 0,
      improvementRate: 0
    };
  }
};

// Improve response based on feedback history
export const getImprovedResponse = async (prompt: string, context: string): Promise<string> => {
  try {
    // Try to use electron API first
    if (window.electron?.reinforcementLearning?.getImprovedResponse) {
      return await window.electron.reinforcementLearning.getImprovedResponse(prompt, context);
    }
    
    // Get relevant feedback for this type of prompt
    const history = await getFeedbackHistory();
    
    // Check if we have enough feedback to improve responses
    if (history.length < 5) {
      console.log('Not enough feedback history to improve responses');
      return "";
    }
    
    // Find similar contexts and analyze feedback patterns
    const relevantFeedback = history
      .filter(item => item.context && item.context.toLowerCase().includes(context.toLowerCase()))
      .sort((a, b) => b.score - a.score) // Sort by highest scored responses first
      .slice(0, 5); // Take the top 5
    
    if (relevantFeedback.length === 0) {
      console.log('No relevant feedback found for this context');
      return "";
    }
    
    // Use LLM to generate an improved response based on feedback
    const feedbackSummary = relevantFeedback
      .map(item => `Context: ${item.context || 'General'}\nScore: ${item.score}\nFeedback: ${item.feedback || 'No comment'}`)
      .join('\n\n');
    
    const promptTemplate = `I want to generate a better response based on past user feedback.
    
Current prompt: ${prompt}
Context: ${context}

Here is feedback received on similar responses:
${feedbackSummary}

Based on this feedback, generate an improved response that would likely receive a higher score. Focus on the aspects that received positive feedback and avoid patterns from low-scored responses.`;

    const response = await queryLLM(promptTemplate, 'ollama');
    return response.text;
  } catch (error) {
    console.error('Error getting improved response:', error);
    return "";
  }
};

// Improve future responses by analyzing patterns
export const analyzeFeedbackPatterns = async (): Promise<void> => {
  try {
    const history = await getFeedbackHistory();
    
    // Need at least 10 feedback items to analyze patterns
    if (history.length < 10) {
      console.log('Not enough feedback to analyze patterns');
      return;
    }
    
    // Group feedback by score
    const highScored = history.filter(item => item.score >= 4);
    const lowScored = history.filter(item => item.score <= 2);
    
    if (highScored.length === 0 || lowScored.length === 0) {
      console.log('Need both high and low scored feedback to analyze patterns');
      return;
    }
    
    // Prepare data for analysis
    const analysisPrompt = `I have collected user feedback on AI responses. 
    
Highly rated responses (${highScored.length} samples):
${highScored.slice(0, 5).map(item => `- Context: ${item.context.slice(0, 100)}...\n  Emotion: ${item.emotion || 'Unknown'}\n  Score: ${item.score}`).join('\n\n')}

Poorly rated responses (${lowScored.length} samples):
${lowScored.slice(0, 5).map(item => `- Context: ${item.context.slice(0, 100)}...\n  Emotion: ${item.emotion || 'Unknown'}\n  Score: ${item.score}`).join('\n\n')}

What patterns do you see in the highly rated responses vs. the poorly rated ones? What should I do more of and what should I avoid?`;

    // Use LLM to analyze patterns
    const response = await queryLLM(analysisPrompt, 'ollama');
    
    // Store the analysis
    const improvements = {
      timestamp: Date.now(),
      analysis: response.text,
      highScoredCount: highScored.length,
      lowScoredCount: lowScored.length,
      totalFeedback: history.length
    };
    
    localStorage.setItem(RESPONSE_IMPROVEMENT_KEY, JSON.stringify(improvements));
    
    console.log('Feedback analysis complete:', improvements);
  } catch (error) {
    console.error('Error analyzing feedback patterns:', error);
  }
};

// Apply reinforcement learning to improve a response
export const applyRLHF = async (
  initialResponse: string, 
  prompt: string, 
  context: string
): Promise<string> => {
  try {
    // Check if we have any improvements available
    const improvedResponse = await getImprovedResponse(prompt, context);
    
    // If we got an improved response, use it
    if (improvedResponse && improvedResponse.length > 0) {
      console.log('Using RLHF-improved response');
      return improvedResponse;
    }
    
    // Otherwise return the initial response
    return initialResponse;
  } catch (error) {
    console.error('Error applying RLHF:', error);
    return initialResponse;
  }
};

// Schedule regular feedback pattern analysis
export const schedulePatternAnalysis = (intervalHours = 24) => {
  // Convert hours to milliseconds
  const interval = intervalHours * 60 * 60 * 1000;
  
  // Check when the last analysis was done
  const lastAnalysis = localStorage.getItem(RESPONSE_IMPROVEMENT_KEY);
  let lastTimestamp = 0;
  
  if (lastAnalysis) {
    try {
      lastTimestamp = JSON.parse(lastAnalysis).timestamp;
    } catch (e) {
      console.error('Error parsing last analysis timestamp:', e);
    }
  }
  
  const now = Date.now();
  const timeSinceLastAnalysis = now - lastTimestamp;
  
  // If it's been longer than the interval, analyze immediately
  if (timeSinceLastAnalysis > interval) {
    analyzeFeedbackPatterns();
  }
  
  // Set up interval for future analysis
  setInterval(analyzeFeedbackPatterns, interval);
};
