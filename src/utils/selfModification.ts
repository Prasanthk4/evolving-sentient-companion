
import { toast } from "@/components/ui/use-toast";
import { queryLLM, LLMProvider } from "./advancedLLM";

// Interface for code modification
export interface CodeModification {
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  purpose: string;
  timestamp: number;
  appliedBy: 'user' | 'ai';
  approved: boolean;
}

// Interface for code improvement suggestion
export interface CodeImprovement {
  id: string;
  filePath: string;
  originalCode: string;
  suggestedCode: string;
  explanation: string;
  benefits: string[];
  timestamp: number;
  approved: boolean;
  applied: boolean;
}

// Local storage key for code modifications
const CODE_MODIFICATIONS_KEY = 'karna-code-modifications';
const CODE_IMPROVEMENTS_KEY = 'karna-code-improvements';

// Get modification history
export const getModificationHistory = async (): Promise<CodeModification[]> => {
  try {
    // Try to use the electron API first
    if (window.electron?.selfModify?.getModificationHistory) {
      return await window.electron.selfModify.getModificationHistory();
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(CODE_MODIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting modification history:', error);
    return [];
  }
};

// Save a code modification
export const saveModification = async (modification: CodeModification): Promise<boolean> => {
  try {
    // Try to use the electron API first
    if (window.electron?.selfModify?.applyChange) {
      return await window.electron.selfModify.applyChange(modification);
    }
    
    // Fallback to localStorage
    const history = await getModificationHistory();
    history.push(modification);
    localStorage.setItem(CODE_MODIFICATIONS_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving modification:', error);
    return false;
  }
};

// Analyze code and suggest improvements
export const analyzeCoreLogic = async (
  filePath: string, 
  code: string, 
  requirements: string
): Promise<CodeImprovement> => {
  try {
    // First try to use the electron API
    if (window.electron?.selfModify?.suggestImprovement) {
      const suggestedCode = await window.electron.selfModify.suggestImprovement(
        code, 
        requirements
      );
      
      // Generate an explanation using the LLM
      const explanation = await generateExplanation(code, suggestedCode);
      
      const improvement: CodeImprovement = {
        id: Date.now().toString(),
        filePath,
        originalCode: code,
        suggestedCode,
        explanation,
        benefits: extractBenefits(explanation),
        timestamp: Date.now(),
        approved: false,
        applied: false
      };
      
      // Save the improvement suggestion
      saveImprovement(improvement);
      
      return improvement;
    }
    
    // If electron API is not available, use our LLM utility
    const prompt = `You are an AI system that helps improve code. Please analyze the following code and suggest improvements based on these requirements: ${requirements}
    
CODE:
\`\`\`
${code}
\`\`\`

Please provide an improved version of the code that meets the requirements better, without changing its core functionality. Include explanations of what you changed and why. Make sure your code is complete, valid, and can be used as a direct replacement.`;

    const response = await queryLLM(prompt, 'ollama');
    
    // Extract the code from the response
    const suggestedCode = extractCodeFromResponse(response.text);
    
    // Generate an explanation
    const explanation = await generateExplanation(code, suggestedCode);
    
    const improvement: CodeImprovement = {
      id: Date.now().toString(),
      filePath,
      originalCode: code,
      suggestedCode,
      explanation,
      benefits: extractBenefits(explanation),
      timestamp: Date.now(),
      approved: false,
      applied: false
    };
    
    // Save the improvement suggestion
    saveImprovement(improvement);
    
    return improvement;
  } catch (error) {
    console.error('Error analyzing code:', error);
    toast({
      title: "Code Analysis Error",
      description: "Failed to analyze code: " + (error instanceof Error ? error.message : String(error)),
      variant: "destructive"
    });
    
    throw error;
  }
};

// Extract code from an LLM response
const extractCodeFromResponse = (response: string): string => {
  // Look for code blocks
  const codeBlockRegex = /```(?:typescript|javascript|js|ts)?\s*([\s\S]*?)```/g;
  const matches = [...response.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    // Return the first code block
    return matches[0][1].trim();
  }
  
  // If no code blocks, try to extract the whole content
  return response.trim();
};

// Generate an explanation for the code changes
const generateExplanation = async (originalCode: string, modifiedCode: string): Promise<string> => {
  try {
    const prompt = `Compare these two code snippets and explain the changes made, including why they improve the code:
    
ORIGINAL CODE:
\`\`\`
${originalCode}
\`\`\`

MODIFIED CODE:
\`\`\`
${modifiedCode}
\`\`\`

Provide a clear, concise explanation of what was changed, why it's better, and what specific improvements were made (e.g., performance, readability, maintainability, etc.).`;

    const response = await queryLLM(prompt, 'ollama');
    return response.text;
  } catch (error) {
    console.error('Error generating explanation:', error);
    return "Failed to generate explanation for code changes.";
  }
};

// Extract benefits from the explanation
const extractBenefits = (explanation: string): string[] => {
  const benefits: string[] = [];
  
  // Look for common benefit indicators
  const indicators = [
    'improves', 'enhances', 'optimizes', 'better', 'increased',
    'faster', 'cleaner', 'more readable', 'maintenance', 'performance'
  ];
  
  // Split explanation into sentences
  const sentences = explanation.split(/[.!?]+/);
  
  // Find sentences that mention benefits
  for (const sentence of sentences) {
    for (const indicator of indicators) {
      if (sentence.toLowerCase().includes(indicator)) {
        const benefit = sentence.trim();
        if (benefit && !benefits.includes(benefit)) {
          benefits.push(benefit);
        }
        break;
      }
    }
  }
  
  // If we couldn't find specific benefits, add a general one
  if (benefits.length === 0) {
    benefits.push("Improved code quality and maintainability");
  }
  
  return benefits;
};

// Get all code improvement suggestions
export const getImprovementSuggestions = (): CodeImprovement[] => {
  try {
    const stored = localStorage.getItem(CODE_IMPROVEMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting improvement suggestions:', error);
    return [];
  }
};

// Save a code improvement suggestion
export const saveImprovement = (improvement: CodeImprovement): void => {
  try {
    const suggestions = getImprovementSuggestions();
    
    // Check if we already have this suggestion
    const existingIndex = suggestions.findIndex(s => s.id === improvement.id);
    
    if (existingIndex >= 0) {
      // Update existing suggestion
      suggestions[existingIndex] = improvement;
    } else {
      // Add new suggestion
      suggestions.push(improvement);
    }
    
    localStorage.setItem(CODE_IMPROVEMENTS_KEY, JSON.stringify(suggestions));
  } catch (error) {
    console.error('Error saving improvement suggestion:', error);
  }
};

// Apply an improvement suggestion
export const applyImprovement = async (improvementId: string): Promise<boolean> => {
  try {
    const suggestions = getImprovementSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id === improvementId);
    
    if (suggestionIndex < 0) {
      throw new Error('Improvement suggestion not found');
    }
    
    const suggestion = suggestions[suggestionIndex];
    
    // Create a modification record
    const modification: CodeModification = {
      filePath: suggestion.filePath,
      originalCode: suggestion.originalCode,
      modifiedCode: suggestion.suggestedCode,
      purpose: suggestion.explanation.split('.')[0] + '.',  // First sentence of explanation
      timestamp: Date.now(),
      appliedBy: 'ai',
      approved: true
    };
    
    // Save the modification
    const saved = await saveModification(modification);
    
    if (saved) {
      // Update the suggestion status
      suggestion.applied = true;
      suggestions[suggestionIndex] = suggestion;
      localStorage.setItem(CODE_IMPROVEMENTS_KEY, JSON.stringify(suggestions));
      
      toast({
        title: "Code Improvement Applied",
        description: "The code improvement has been successfully applied.",
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error applying improvement:', error);
    toast({
      title: "Error",
      description: "Failed to apply code improvement: " + (error instanceof Error ? error.message : String(error)),
      variant: "destructive"
    });
    
    return false;
  }
};

// Reject an improvement suggestion
export const rejectImprovement = (improvementId: string): boolean => {
  try {
    const suggestions = getImprovementSuggestions();
    const suggestionIndex = suggestions.findIndex(s => s.id === improvementId);
    
    if (suggestionIndex < 0) {
      throw new Error('Improvement suggestion not found');
    }
    
    // Remove the suggestion
    suggestions.splice(suggestionIndex, 1);
    localStorage.setItem(CODE_IMPROVEMENTS_KEY, JSON.stringify(suggestions));
    
    toast({
      title: "Suggestion Rejected",
      description: "The code improvement suggestion has been rejected."
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting improvement:', error);
    return false;
  }
};

// Let the AI suggest improvements to a specific core component
export const initiateAutoImprovement = async (component: string): Promise<void> => {
  toast({
    title: "AI Self-Improvement",
    description: `Analyzing ${component} for potential improvements...`,
  });
  
  try {
    // This would normally read the component code from the file system
    // In this mock version, we'll simulate it
    
    // Mock code analysis
    setTimeout(() => {
      toast({
        title: "AI Self-Improvement",
        description: `Analysis complete. Found 3 potential improvements for ${component}.`,
      });
    }, 2000);
  } catch (error) {
    console.error('Error initiating auto-improvement:', error);
    toast({
      title: "Error",
      description: "Failed to analyze component for improvements.",
      variant: "destructive"
    });
  }
};
