
import React, { useState, useEffect } from 'react';
import { Award, Star, BarChart, ThumbsUp, ThumbsDown, MessageSquare, Brain } from 'lucide-react';
import { 
  submitFeedback, 
  getFeedbackHistory, 
  getPerformanceMetrics,
  PerformanceMetrics
} from '@/utils/reinforcementLearning';
import { FeedbackData } from '@/types/electron';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

interface FeedbackSystemProps {
  responseId?: string;
  context?: string;
}

const FeedbackSystem: React.FC<FeedbackSystemProps> = ({ 
  responseId = 'default', 
  context = 'general conversation' 
}) => {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackData[]>([]);
  const [emotion, setEmotion] = useState<string | null>(null);
  
  // Load metrics and recent feedback on mount
  useEffect(() => {
    loadMetrics();
    loadRecentFeedback();
    
    // Listen for emotion updates
    const handleEmotionUpdate = (event: CustomEvent) => {
      if (event.detail?.emotion?.dominant) {
        setEmotion(event.detail.emotion.dominant);
      }
    };
    
    window.addEventListener('karna-emotion-update', handleEmotionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('karna-emotion-update', handleEmotionUpdate as EventListener);
    };
  }, []);
  
  const loadMetrics = async () => {
    const data = await getPerformanceMetrics();
    setMetrics(data);
  };
  
  const loadRecentFeedback = async () => {
    const history = await getFeedbackHistory();
    setRecentFeedback(history.slice(0, 5));
  };
  
  const handleRatingClick = (rating: number) => {
    setScore(rating);
  };
  
  const handleSubmit = async () => {
    if (score === null) return;
    
    setSubmitting(true);
    
    try {
      await submitFeedback({
        responseId,
        prompt: '', // Add required field
        response: '', // Add required field
        score,
        feedback: feedback.trim() || undefined,
        context,
        emotion: emotion || undefined
      });
      
      // Reset form
      setScore(null);
      setFeedback('');
      
      // Reload metrics and feedback
      await loadMetrics();
      await loadRecentFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="glass-panel p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-lg font-semibold flex items-center">
          <Award className="mr-2" /> Reinforcement Learning
        </h2>
        {metrics && (
          <div className="flex items-center text-sm">
            <div className={`w-2 h-2 rounded-full mr-1 ${
              metrics.improvementRate > 0.7 ? 'bg-jarvis-success' : 
              metrics.improvementRate > 0.4 ? 'bg-jarvis-warning' : 
              'bg-jarvis-accent'
            }`}></div>
            <span>
              {metrics.improvementRate > 0.7 ? 'High Learning Rate' : 
               metrics.improvementRate > 0.4 ? 'Learning' : 
               'Baseline Knowledge'}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col space-y-4">
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-3 flex items-center">
            <ThumbsUp className="text-jarvis-blue mr-1" size={14} /> Rate Last Response
          </h3>
          
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                className={`p-2 rounded-full transition-colors ${
                  score === rating ? 
                  'bg-jarvis-blue text-white' : 
                  'bg-jarvis-dark hover:bg-jarvis-dark-light'
                }`}
                onClick={() => handleRatingClick(rating)}
              >
                <Star size={16} className={score !== null && score >= rating ? 'fill-current' : ''} />
              </button>
            ))}
          </div>
          
          <Textarea
            placeholder="Optional feedback comments..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="bg-jarvis-dark border-jarvis-blue/30 text-sm h-20 resize-none mb-3"
          />
          
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="default"
              className="bg-jarvis-blue hover:bg-jarvis-blue-light text-white"
              onClick={handleSubmit}
              disabled={score === null || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </div>
        
        {metrics && (
          <div className="glass-panel p-3">
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <BarChart className="text-jarvis-blue mr-1" size={14} /> Learning Performance
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs">Average Rating</span>
                  <span className="text-xs text-muted-foreground">{metrics.averageScore.toFixed(1)} / 5.0</span>
                </div>
                <Progress value={(metrics.averageScore / 5) * 100} className="h-1.5" />
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs">Learning Rate</span>
                  <span className="text-xs text-muted-foreground">{Math.round(metrics.improvementRate * 100)}%</span>
                </div>
                <Progress value={metrics.improvementRate * 100} className="h-1.5" />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground pt-2">
                <span>Total Feedback: {metrics.totalFeedback}</span>
                <span className="text-jarvis-blue">
                  {metrics.improvementRate < 0.3 ? 'Early Learning' : 
                   metrics.improvementRate < 0.6 ? 'Improving' : 
                   metrics.improvementRate < 0.8 ? 'Advanced Learning' : 
                   'Optimized'}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {recentFeedback.length > 0 && (
          <div className="glass-panel p-3">
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <MessageSquare className="text-jarvis-blue mr-1" size={14} /> Recent Feedback
            </h3>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentFeedback.map((item, index) => (
                <div key={index} className="bg-jarvis-dark/40 rounded p-2 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          size={12} 
                          className={i < item.score ? 'fill-jarvis-blue text-jarvis-blue' : 'text-muted-foreground'} 
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {item.feedback && <p className="text-muted-foreground mt-1">{item.feedback}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="glass-panel p-3">
          <h3 className="text-sm font-medium mb-2 flex items-center">
            <Brain className="text-jarvis-blue mr-1" size={14} /> Learning Status
          </h3>
          
          <div className="text-xs text-muted-foreground">
            <p>KARNA is actively learning from your feedback to improve responses.</p>
            <p className="mt-2">Each interaction helps train the reinforcement learning model.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSystem;
