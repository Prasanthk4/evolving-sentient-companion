import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Square, MessageSquare } from 'lucide-react';
import { getAIResponse, getLearnedResponse } from '@/utils/aiLearning';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

const SpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([
    {text: "Hello, I am KARNA. How can I assist you today? I've been practicing my jokes, so brace yourself!", isUser: false},
  ]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          setTranscript(transcript);
          
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
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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
  
  const generateResponse = async (userMessage: string) => {
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
          return;
        } catch (error) {
          console.error('Learning error:', error);
          setMessages(prev => [...prev, {
            text: "I'm sorry, I couldn't learn about that right now. My learning systems seem to be offline.",
            isUser: false
          }]);
          speakResponse("I'm sorry, I couldn't learn about that right now. My learning systems seem to be offline.");
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
        return;
      }
    }
    
    let response = "I'm processing your request. It's like trying to find a needle in a digital haystack!";
    
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      response = "Hello there! Great to see you. I was just practicing my digital yoga poses. How can I assist you today?";
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
