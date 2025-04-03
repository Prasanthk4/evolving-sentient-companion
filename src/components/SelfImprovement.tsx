
import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Lightbulb, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Code, 
  RefreshCw,
  Zap
} from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { 
  getImprovementSuggestions, 
  applyImprovement, 
  rejectImprovement, 
  initiateAutoImprovement,
  CodeImprovement
} from "@/utils/selfModification";
import { 
  getAvailableModels, 
  LLMModel 
} from "@/utils/advancedLLM";

const SelfImprovement: React.FC = () => {
  const [suggestions, setSuggestions] = useState<CodeImprovement[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CodeImprovement | null>(null);
  const [availableModels, setAvailableModels] = useState<LLMModel[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [targetComponent, setTargetComponent] = useState('KarnaCore');
  
  // Components that can be analyzed
  const analyzableComponents = [
    'KarnaCore',
    'SpeechRecognition',
    'MultiAgentSystem',
    'MemorySystem',
    'FaceRecognition'
  ];
  
  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
    loadModels();
    
    // Set up periodic suggestion refresh
    const interval = setInterval(loadSuggestions, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Load improvement suggestions
  const loadSuggestions = () => {
    const allSuggestions = getImprovementSuggestions();
    setSuggestions(allSuggestions.filter(s => !s.applied).slice(0, 5));
  };
  
  // Load available LLM models
  const loadModels = async () => {
    try {
      const models = await getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };
  
  // Handle applying a suggestion
  const handleApplySuggestion = async (id: string) => {
    const success = await applyImprovement(id);
    if (success) {
      loadSuggestions();
      setSelectedSuggestion(null);
    }
  };
  
  // Handle rejecting a suggestion
  const handleRejectSuggestion = (id: string) => {
    const success = rejectImprovement(id);
    if (success) {
      loadSuggestions();
      setSelectedSuggestion(null);
    }
  };
  
  // Start auto-improvement analysis
  const handleStartAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      await initiateAutoImprovement(targetComponent);
      setTimeout(() => {
        loadSuggestions();
        setAnalyzing(false);
      }, 3000);
    } catch (error) {
      console.error('Error during analysis:', error);
      setAnalyzing(false);
      toast({
        title: "Analysis Error",
        description: "An error occurred during code analysis.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Lightbulb className="mr-2" /> Self-Improvement System
        </h2>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full mr-1 bg-jarvis-success"></div>
          <span className="text-sm text-muted-foreground">Active</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Zap className="text-jarvis-blue mr-1" size={14} /> AI Models Available
          </h3>
          <div className="space-y-2 text-xs">
            {availableModels.length > 0 ? (
              availableModels.map((model, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span>{model.name}</span>
                  <span className="text-jarvis-blue">{model.provider}</span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No models available</div>
            )}
          </div>
        </div>
        
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <FileCode className="text-jarvis-blue mr-1" size={14} /> Code Analysis
            </div>
            <button 
              className="text-xs bg-jarvis-blue/20 hover:bg-jarvis-blue/30 text-jarvis-blue px-2 py-1 rounded flex items-center"
              onClick={loadSuggestions}
            >
              <RefreshCw size={12} className="mr-1" /> Refresh
            </button>
          </h3>
          
          <div className="flex mb-3">
            <select 
              className="bg-jarvis-dark border border-jarvis-blue/30 text-sm rounded-l p-1.5 w-full"
              value={targetComponent}
              onChange={(e) => setTargetComponent(e.target.value)}
            >
              {analyzableComponents.map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>
            <button 
              className="bg-jarvis-blue/20 hover:bg-jarvis-blue/30 text-jarvis-blue px-2 py-1 rounded-r flex items-center"
              onClick={handleStartAnalysis}
              disabled={analyzing}
            >
              {analyzing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Code size={14} />
              )}
              <span className="ml-1">{analyzing ? "Analyzing..." : "Analyze"}</span>
            </button>
          </div>
          
          {suggestions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No improvement suggestions available. <br />
              Click "Analyze" to let the AI find potential improvements.
            </div>
          ) : (
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {suggestions.map((suggestion) => (
                <div 
                  key={suggestion.id} 
                  className="glass-panel p-2 cursor-pointer hover:border-jarvis-blue/30 transition-colors"
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate">{suggestion.filePath.split('/').pop()}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(suggestion.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {suggestion.benefits[0]}
                  </p>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button 
                      className="text-xs bg-jarvis-success/20 hover:bg-jarvis-success/30 text-jarvis-success px-2 py-0.5 rounded flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplySuggestion(suggestion.id);
                      }}
                    >
                      <CheckCircle size={12} className="mr-1" /> Apply
                    </button>
                    <button 
                      className="text-xs bg-jarvis-accent/20 hover:bg-jarvis-accent/30 text-jarvis-accent px-2 py-0.5 rounded flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectSuggestion(suggestion.id);
                      }}
                    >
                      <XCircle size={12} className="mr-1" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {selectedSuggestion && (
        <div className="glass-panel p-3 flex-1 overflow-hidden">
          <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
            <div>Improvement Details</div>
            <button 
              className="text-xs text-muted-foreground"
              onClick={() => setSelectedSuggestion(null)}
            >
              <XCircle size={14} />
            </button>
          </h3>
          
          <div className="text-xs space-y-2 h-full overflow-auto pb-2">
            <div>
              <span className="text-muted-foreground">File: </span>
              <span className="text-jarvis-blue">{selectedSuggestion.filePath}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Explanation: </span>
              <p className="mt-1 text-foreground">{selectedSuggestion.explanation}</p>
            </div>
            
            <div className="mt-3">
              <div className="flex items-center">
                <div className="flex-1 border-t border-jarvis-blue/20"></div>
                <div className="mx-2 text-jarvis-blue flex items-center">
                  <Code size={12} className="mr-1" /> 
                  <span>Code Changes</span>
                </div>
                <div className="flex-1 border-t border-jarvis-blue/20"></div>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-muted-foreground mb-1">Original:</div>
                  <pre className="bg-jarvis-dark/50 p-2 rounded text-[10px] overflow-auto max-h-[200px]">
                    {selectedSuggestion.originalCode}
                  </pre>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Improved:</div>
                  <pre className="bg-jarvis-dark/50 p-2 rounded text-[10px] overflow-auto max-h-[200px]">
                    {selectedSuggestion.suggestedCode}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between mt-3">
              <button 
                className="text-xs bg-jarvis-success/20 hover:bg-jarvis-success/30 text-jarvis-success px-3 py-1 rounded flex items-center"
                onClick={() => handleApplySuggestion(selectedSuggestion.id)}
              >
                <CheckCircle size={14} className="mr-1" /> Apply This Improvement
              </button>
              <button 
                className="text-xs bg-jarvis-accent/20 hover:bg-jarvis-accent/30 text-jarvis-accent px-3 py-1 rounded flex items-center"
                onClick={() => handleRejectSuggestion(selectedSuggestion.id)}
              >
                <XCircle size={14} className="mr-1" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Self-improvement system is actively monitoring code quality
      </div>
    </div>
  );
};

export default SelfImprovement;
