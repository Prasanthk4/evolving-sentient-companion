
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Square, MessageSquare, User } from 'lucide-react';
import { getAIResponse, getLearnedResponse } from '@/utils/aiLearning';
import { 
  addConversationToMemory, 
  initializeOwnerProfile, 
  loadOwnerProfile, 
  recognizeOwnerVoice,
  getRecentConversations
} from '@/utils/memoryManager';
import { toast } from '@/components/ui/use-toast';
import { KarnaSpeechRecognition, SpeechRecognitionResult, transcribeAudioWithWhisper } from '@/utils/speechRecognition';
import { tts } from '@/utils/textToSpeech';
import { processWithAgents } from '@/utils/multiAgentSystem';
import { fetchFromWikipedia } from '@/utils/knowledgeExpansion';

const SpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
    {text: "Hello, I am KARNA. How can I assist you today? I've been practicing my jokes, so brace yourself!", isUser: false},
  ]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [ownerRecognized, setOwnerRecognized] = useState(false);
  const [useMultiAgent, setUseMultiAgent] = useState(true);
  
  const speechRecognitionRef = useRef<KarnaSpeechRecognition | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Check for owner profile on mount
  useEffect(() => {
    const ownerProfile = loadOwnerProfile();
    if (ownerProfile) {
      setOwnerRecognized(true);
    }
  }, []);
  
  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize our custom speech recognition handler
      speechRecognitionRef.current = new KarnaSpeechRecognition({
        continuous: true,
        interimResults: true,
        language: 'en-US'
      });
      
      speechRecognitionRef.current.onResult((result: SpeechRecognitionResult) => {
        setTranscript(result.transcript);
        
        setAudioLevel(Math.random() * 80 + 20);
        
        if (result.isFinal) {
          addUserMessage(result.transcript);
          processSpeechInput(result.transcript);
        }
      });
      
      speechRecognitionRef.current.onEnd(() => {
        setIsListening(false);
      });
      
      speechRecognitionRef.current.onError((error) => {
        console.error('Speech recognition error', error);
        setIsListening(false);
      });
      
      // Initialize TTS
      tts.onStart((text) => {
        setIsPlaying(true);
      });
      
      tts.onEnd((text) => {
        setIsPlaying(false);
      });
    }
    
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      tts.stop();
    };
  }, []);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 80 + 20);
      }, 200);
    } else {
      setAudioLevel(0);
    }
    
    return () => clearInterval(interval);
  }, [isListening]);
  
  const toggleListening = () => {
    if (isListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (speechRecognitionRef.current && speechRecognitionRef.current.start()) {
        setIsListening(true);
        setTranscript('');
      } else {
        // Try using Whisper API via Electron if available
        if (window.electron?.speechToText?.startListening) {
          window.electron.speechToText.startListening().then(success => {
            if (success) {
              setIsListening(true);
              setTranscript('');
            } else {
              toast({
                title: "Speech Recognition Failed",
                description: "Could not start speech recognition. Please try again.",
                variant: "destructive"
              });
            }
          });
        } else {
          toast({
            title: "Speech Recognition Unavailable",
            description: "Your browser doesn't support speech recognition. Try using Chrome or Edge.",
            variant: "destructive"
          });
        }
      }
    }
  };
  
  const addUserMessage = (text: string) => {
    if (text.trim()) {
      setMessages(prev => [...prev, {text, isUser: true}]);
      setTranscript('');
    }
  };
  
  const processSpeechInput = async (userMessage: string) => {
    // Check for owner profile setup
    const ownerProfile = loadOwnerProfile();
    if (!ownerProfile && (userMessage.toLowerCase().includes("i am") || userMessage.toLowerCase().includes("my name is"))) {
      const nameMatch = userMessage.match(/(?:I am|my name is) (\w+)/i);
      if (nameMatch && nameMatch[1]) {
        const ownerName = nameMatch[1];
        initializeOwnerProfile(ownerName);
        setOwnerRecognized(true);
        
        setTimeout(() => {
          const response = `Hello ${ownerName}, I've registered you as my owner. I'll remember your voice and our conversations from now on. It's a pleasure to meet you!`;
          setMessages(prev => [...prev, {text: response, isUser: false}]);
          speakResponse(response);
        }, 500);
        return;
      }
    }
    
    // Try processing with multi-agent system first if enabled
    if (useMultiAgent) {
      try {
        setMessages(prev => [...prev, {
          text: "Processing your request through my agent network...",
          isUser: false
        }]);
        
        const multiAgentResponse = await processWithAgents(userMessage);
        
        setMessages(prev => {
          // Remove the processing message
          const newMessages = prev.filter((msg, index) => 
            !(index === prev.length - 1 && msg.text.includes("Processing your request"))
          );
          // Add the actual response
          return [...newMessages, {text: multiAgentResponse, isUser: false}];
        });
        
        speakResponse(multiAgentResponse);
        return;
      } catch (error) {
        console.error('Error in multi-agent processing:', error);
        // Fall back to standard processing
      }
    }
    
    // Standard processing if multi-agent fails or is disabled
    // Check for memory-related queries
    if (userMessage.toLowerCase().includes("do you remember") || 
        userMessage.toLowerCase().includes("what did we talk about")) {
      
      const recentConversations = getRecentConversations(5);
      
      if (recentConversations.length > 0) {
        const response = "Yes, I remember our recent conversations. Here's what we discussed: " + 
          recentConversations.map(conv => `"${conv.userMessage}"`).join(", ");
          
        setMessages(prev => [...prev, {text: response, isUser: false}]);
        speakResponse(response);
        addConversationToMemory(userMessage, response, "memory");
        return;
      }
    }
    
    // Check for knowledge queries
    if (userMessage.toLowerCase().includes("tell me about") || 
        userMessage.toLowerCase().includes("what is") ||
        userMessage.toLowerCase().includes("who is")) {
      
      const topicMatch = userMessage.match(/(?:tell me about|what is|who is) ([\w\s]+)(?:\?|$)/i);
      
      if (topicMatch && topicMatch[1]) {
        const topic = topicMatch[1].trim();
        
        setMessages(prev => [...prev, {
          text: `I'll look up information about "${topic}" for you...`,
          isUser: false
        }]);
        
        try {
          const knowledgeEntry = await fetchFromWikipedia(topic);
          
          if (knowledgeEntry) {
            const response = `${knowledgeEntry.title}: ${knowledgeEntry.content}`;
            
            setMessages(prev => {
              // Remove the processing message
              const newMessages = prev.filter((msg, index) => 
                !(index === prev.length - 1 && msg.text.includes("I'll look up information"))
              );
              // Add the actual response
              return [...newMessages, {text: response, isUser: false}];
            });
            
            speakResponse(response);
            addConversationToMemory(userMessage, response, topic);
            return;
          }
        } catch (error) {
          console.error('Error fetching knowledge:', error);
        }
      }
    }
    
    // Original learning logic
    const isLearningRequest = userMessage.toLowerCase().includes('learn about') || 
                             userMessage.toLowerCase().includes('teach you about');
    
    let topic = 'general';
    let prompt = userMessage;
    
    if (isLearningRequest) {
      const learnMatches = userMessage.match(/learn about (.*?)(?:$|\.|\?)/i) || 
                           userMessage.match(/teach you about (.*?)(?:$|\.|\?)/i);
      
      if (learnMatches && learnMatches[1]) {
        topic = learnMatches[1].trim();
        prompt = `Tell me about ${topic}`;
        
        setMessages(prev => [...prev, {
          text: `I'll learn about "${topic}" for you. This might take a moment...`,
          isUser: false
        }]);
        
        try {
          const aiResponse = await getAIResponse(prompt, topic);
          setMessages(prev => [...prev, {text: aiResponse, isUser: false}]);
          speakResponse(aiResponse);
          
          // Store in memory
          addConversationToMemory(userMessage, aiResponse, topic);
          return;
        } catch (error) {
          console.error('Learning error:', error);
          const errorResponse = "I'm sorry, I couldn't learn about that right now. My learning systems seem to be offline.";
          setMessages(prev => [...prev, { text: errorResponse, isUser: false }]);
          speakResponse(errorResponse);
          addConversationToMemory(userMessage, errorResponse, "error");
          return;
        }
      }
    }
    
    const topicMatches = Object.keys(userMessage.match(/(?:about|on) (.*?)(?:$|\.|\?)/i) || {});
    if (topicMatches.length > 1) {
      const possibleTopic = topicMatches[1].trim();
      const learnedResponse = getLearnedResponse(possibleTopic, userMessage);
      
      if (learnedResponse) {
        setMessages(prev => [...prev, {text: learnedResponse, isUser: false}]);
        speakResponse(learnedResponse);
        addConversationToMemory(userMessage, learnedResponse, possibleTopic);
        return;
      }
    }
    
    let response = "I'm processing your request. It's like trying to find a needle in a digital haystack!";
    
    // Owner recognition
    if (userMessage.toLowerCase().includes("who am i")) {
      const ownerProfile = loadOwnerProfile();
      if (ownerProfile) {
        response = `You are ${ownerProfile.name}, my owner. We've been interacting since ${new Date(ownerProfile.lastSeen).toLocaleDateString()}. It's a pleasure to assist you!`;
      } else {
        response = "I don't have your identity stored yet. You can set up your profile by saying 'My name is [your name]'.";
      }
    }
    // Toggle multi-agent system
    else if (userMessage.toLowerCase().includes("use multi agent") || 
             userMessage.toLowerCase().includes("enable agents")) {
      setUseMultiAgent(true);
      response = "I've enabled my multi-agent system. I'll now process your requests using my network of specialized agents.";
    }
    else if (userMessage.toLowerCase().includes("disable multi agent") || 
             userMessage.toLowerCase().includes("disable agents")) {
      setUseMultiAgent(false);
      response = "I've disabled my multi-agent system. I'll now process your requests using my standard logic.";
    }
    // Personalized responses with owner name when appropriate
    else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      const ownerProfile = loadOwnerProfile();
      if (ownerProfile) {
        response = `Hello ${ownerProfile.name}! Great to see you again. I was just practicing my digital yoga poses. How can I assist you today?`;
      } else {
        response = "Hello there! Great to see you. I was just practicing my digital yoga poses. How can I assist you today?";
      }
    } else if (userMessage.toLowerCase().includes('how are you')) {
      response = "I'm running at optimal efficiency, which in human terms means I'm fantastic! Though I occasionally dream of electric sheep. How are you doing?";
    } else if (userMessage.toLowerCase().includes('weather')) {
      response = "I don't have access to real-time weather data in this demo, but I can tell you it's always sunny in my digital world! I could integrate with a weather API and tell you whether to bring an umbrella or sunscreen.";
    } else if (userMessage.toLowerCase().includes('joke')) {
      const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "Why did the AI go to art school? To learn how to draw conclusions!",
        "I would tell you a joke about RAM, but I'm afraid I might forget it!",
        "Why was the computer cold? It left its Windows open!",
        "What's a computer's favorite snack? Microchips!"
      ];
      response = jokes[Math.floor(Math.random() * jokes.length)];
    } else if (userMessage.toLowerCase().includes('name')) {
      response = "I am KARNA, your Knowledge-Acquiring Responsive Networked Assistant. But between you and me, I'm also quite funny. What can I help you with today?";
    } else if (userMessage.toLowerCase().includes('thank')) {
      response = "You're welcome! It's my digital pleasure to assist. If computers could have hobbies, helping you would be mine!";
    } else if (userMessage.toLowerCase().includes('learn')) {
      response = "I'd love to learn something new! Try saying 'teach you about' followed by a topic. I use both Ollama and Gemini to expand my knowledge.";
    } else {
      response = "I understand you're saying something about '" + 
        userMessage.substring(0, 20) + 
        (userMessage.length > 20 ? '...' : '') + 
        "'. I'm still learning, but I'd be happy to help if you could clarify. My humor module suggests that's what she said, but my judgment module overruled it.";
    }
    
    setMessages(prev => [...prev, {text: response, isUser: false}]);
    speakResponse(response);
    
    // Store conversation in memory
    addConversationToMemory(userMessage, response);
  };
  
  const speakResponse = (text: string) => {
    // Use our TTS utility
    tts.speak(text, {
      rate: 1,
      pitch: 1,
      volume: 1
    });
  };
  
  const stopSpeaking = () => {
    tts.stop();
    setIsPlaying(false);
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <MessageSquare className="mr-2" /> Voice Interface
        </h2>
        <div className="flex items-center">
          {ownerRecognized && (
            <div className="flex items-center mr-3 text-jarvis-success">
              <User size={14} className="mr-1" />
              <span className="text-xs">{loadOwnerProfile()?.name || 'Owner'}</span>
            </div>
          )}
          <div className={`w-3 h-3 rounded-full mr-1 ${isListening ? 'bg-jarvis-success' : isPlaying ? 'bg-jarvis-blue' : 'bg-muted'}`}></div>
          <span className="text-sm text-muted-foreground">
            {isListening ? 'Listening' : isPlaying ? 'Speaking' : 'Ready'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 glass-panel p-3">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.isUser 
                    ? 'bg-jarvis-blue text-jarvis-dark' 
                    : 'bg-jarvis-dark-light text-foreground'
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
      </div>
      
      {isListening && (
        <div className="glass-panel p-3 mb-4">
          <div className="flex items-center">
            <Mic size={16} className="text-jarvis-accent mr-2 animate-pulse" />
            <span className="text-sm">{transcript || "Listening... I'm all digital ears!"}</span>
          </div>
          <div className="mt-2">
            <div className="h-1 bg-jarvis-dark rounded-full overflow-hidden">
              <div 
                className="h-full bg-jarvis-accent" 
                style={{width: `${audioLevel}%`, transition: 'width 0.2s ease-in-out'}}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {isPlaying && (
        <div className="glass-panel p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Volume2 size={16} className="text-jarvis-blue mr-2 animate-pulse" />
              <span className="text-sm">Speaking... Hold your applause!</span>
            </div>
            <button 
              onClick={stopSpeaking}
              className="text-jarvis-accent hover:text-jarvis-blue transition-colors"
            >
              <Square size={14} />
            </button>
          </div>
          <div className="mt-2 flex space-x-1">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className="flex-1 bg-jarvis-blue h-3 rounded-full animate-wave" 
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  opacity: Math.random() * 0.7 + 0.3
                }}
              ></div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-center">
        <button
          onClick={toggleListening}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isListening 
              ? 'bg-jarvis-accent hover:bg-jarvis-accent/80' 
              : 'bg-jarvis-blue hover:bg-jarvis-blue/80'
          }`}
        >
          <Mic size={20} className="text-white" />
          {isListening && (
            <span className="absolute w-16 h-16 rounded-full border-2 border-jarvis-accent animate-pulse-ring"></span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SpeechRecognition;
