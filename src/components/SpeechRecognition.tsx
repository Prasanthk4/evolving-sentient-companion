
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, PlayCircle, Square, MessageSquare } from 'lucide-react';

// This is a simplified version using the browser's SpeechRecognition API
// In a real implementation, you would use a more sophisticated library like Whisper
const SpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
    {text: "Hello, I am JARVIS. How can I assist you today?", isUser: false},
  ]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        setTranscript(transcript);
        
        // Simulate audio level
        setAudioLevel(Math.random() * 80 + 20);
        
        if (result.isFinal) {
          addUserMessage(transcript);
          setTimeout(() => generateResponse(transcript), 500);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  useEffect(() => {
    // Simulate audio level changes when listening
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
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setTranscript('');
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
  };
  
  const addUserMessage = (text: string) => {
    if (text.trim()) {
      setMessages(prev => [...prev, {text, isUser: true}]);
      setTranscript('');
    }
  };
  
  const generateResponse = (userMessage: string) => {
    // Simple response logic (in a real app, this would call an LLM)
    let response = "I'm processing your request.";
    
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      response = "Hello! How can I assist you today?";
    } else if (userMessage.toLowerCase().includes('how are you')) {
      response = "I'm functioning optimally, thank you for asking. How can I be of service?";
    } else if (userMessage.toLowerCase().includes('weather')) {
      response = "I don't have access to real-time weather data in this demo, but I could integrate with a weather API in a full implementation.";
    } else if (userMessage.toLowerCase().includes('joke')) {
      response = "Why don't scientists trust atoms? Because they make up everything!";
    } else if (userMessage.toLowerCase().includes('name')) {
      response = "I am JARVIS, your Just A Rather Very Intelligent System. I'm designed to assist and evolve based on our interactions.";
    } else if (userMessage.toLowerCase().includes('thank')) {
      response = "You're welcome. I'm here to help whenever you need assistance.";
    } else {
      response = "I understand you're saying something about '" + 
        userMessage.substring(0, 20) + 
        (userMessage.length > 20 ? '...' : '') + 
        "'. In a full implementation, I would process this with a language model to provide a helpful response.";
    }
    
    // Add response to messages
    setMessages(prev => [...prev, {text: response, isUser: false}]);
    
    // Simulate text-to-speech
    speakResponse(response);
  };
  
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsPlaying(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <MessageSquare className="mr-2" /> Voice Interface
        </h2>
        <div className="flex items-center">
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
            <span className="text-sm">{transcript || "Listening..."}</span>
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
              <span className="text-sm">Speaking...</span>
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
