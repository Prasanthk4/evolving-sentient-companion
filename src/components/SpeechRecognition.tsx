import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, Square, MessageSquare, User, Monitor, Search, Laptop } from 'lucide-react';
import { 
  addConversationToMemory, 
  initializeOwnerProfile, 
  loadOwnerProfile, 
  getRecentConversations
} from '@/utils/memoryManager';
import { parseCommand, AutomationCommand, getAutomationLearningTopic } from '@/utils/desktopAutomation';
import { toast } from '@/components/ui/use-toast';

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
  const [ownerRecognized, setOwnerRecognized] = useState(false);
  const [processingQuery, setProcessingQuery] = useState(false);
  const [isProcessingAutomation, setIsProcessingAutomation] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    const ownerProfile = loadOwnerProfile();
    if (ownerProfile) {
      setOwnerRecognized(true);
    }
  }, []);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US'; // Set language
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          setTranscript(transcript);
          
          if (result.isFinal) {
            addUserMessage(transcript);
            
            const ownerProfile = loadOwnerProfile();
            if (!ownerProfile && (transcript.toLowerCase().includes("i am") || transcript.toLowerCase().includes("my name is"))) {
              const nameMatch = transcript.match(/(?:I am|my name is) (\w+)/i);
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
            
            setTimeout(() => generateResponse(transcript), 500);
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access in your browser settings to enable voice commands.",
              variant: "destructive"
            });
          }
        };
        
        recognitionRef.current.onend = () => {
          if (isListening) {
            try {
              recognitionRef.current?.start();
            } catch (error) {
              console.error('Failed to restart speech recognition:', error);
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };
      } else {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition. Please try a different browser like Chrome.",
          variant: "destructive"
        });
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  useEffect(() => {
    const handleAutomationResponse = (response: AutomationResponse) => {
      setIsProcessingAutomation(false);
      
      if (response.success) {
        const actionMessages = {
          'open-browser': 'Browser opened successfully',
          'web-search': 'Web search completed',
          'open-application': 'Application launched',
          'take-screenshot': 'Screenshot taken and saved',
          'system-info': 'System information displayed',
        };
        
        const message = actionMessages[response.action] || 'Command executed successfully';
        setMessages(prev => [...prev, { text: message, isUser: false }]);
        speakResponse(message);
      } else {
        const errorMessage = `I couldn't complete that action: ${response.error || 'Unknown error'}`;
        setMessages(prev => [...prev, { text: errorMessage, isUser: false }]);
        speakResponse(errorMessage);
      }
    };
    
    window.electron.receive('automation-response', handleAutomationResponse);
    
    return () => {
      window.electron.receive('automation-response', () => {});
    };
  }, []);
  
  const setupAudioVisualization = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      visualizeAudio();
    } catch (error) {
      console.error('Error setting up audio visualization:', error);
    }
  };
  
  const visualizeAudio = () => {
    if (!analyserRef.current || !isListening) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(Math.min(100, average * 2));
    
    requestAnimationFrame(visualizeAudio);
  };
  
  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      }
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        await setupAudioVisualization();
        
        recognitionRef.current?.start();
        setIsListening(true);
        setTranscript('');
      } catch (error) {
        console.error('Speech recognition error:', error);
        toast({
          title: "Microphone Access Error",
          description: "Please allow microphone access to use voice commands.",
          variant: "destructive"
        });
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
    if (processingQuery) return;
    
    setProcessingQuery(true);
    
    try {
      const automationCommand = parseCommand(userMessage);
      
      if (automationCommand.type !== 'unknown') {
        executeAutomationCommand(automationCommand);
        setProcessingQuery(false);
        return;
      }
      
      setMessages(prev => [...prev, {
        text: "I'm processing your request...",
        isUser: false
      }]);
      
      if (userMessage.toLowerCase().includes("do you remember") || 
          userMessage.toLowerCase().includes("what did we talk about")) {
        
        const recentConversations = getRecentConversations(5);
        
        if (recentConversations.length > 0) {
          const response = "Yes, I remember our recent conversations. Here's what we discussed: " + 
            recentConversations.map(conv => `"${conv.userMessage}"`).join(", ");
            
          setMessages(prev => [
            ...prev.slice(0, prev.length - 1),
            {text: response, isUser: false}
          ]);
          
          speakResponse(response);
          addConversationToMemory(userMessage, response, "memory");
          setProcessingQuery(false);
          return;
        }
      }
      
      let response;
      
      try {
        response = await window.electron.ollama.query({ 
          id: Date.now().toString(),
          prompt: userMessage,
          model: "llama3"
        });
        
        console.log("Ollama response:", response);
      } catch (ollamaError) {
        console.error("Ollama error, falling back to Gemini:", ollamaError);
        
        try {
          response = await window.electron.gemini.query({ 
            id: Date.now().toString(),
            prompt: userMessage
          });
          
          console.log("Gemini response:", response);
        } catch (geminiError) {
          console.error("Gemini error:", geminiError);
          
          response = {
            response: "I'm having trouble connecting to my thinking systems right now. Can you try again in a moment?"
          };
        }
      }
      
      let finalResponse = response.response || response.text || "I couldn't process that request properly.";
      
      setMessages(prev => [
        ...prev.slice(0, prev.length - 1),
        {text: finalResponse, isUser: false}
      ]);
      
      speakResponse(finalResponse);
      
      addConversationToMemory(userMessage, finalResponse);
    } catch (error) {
      console.error('Error generating response:', error);
      
      setMessages(prev => [
        ...prev.slice(0, prev.length - 1),
        {text: "I'm sorry, I encountered an error while processing your request.", isUser: false}
      ]);
      
      speakResponse("I'm sorry, I encountered an error while processing your request.");
    } finally {
      setProcessingQuery(false);
    }
  };
  
  const executeAutomationCommand = (command: AutomationCommand) => {
    setIsProcessingAutomation(true);
    
    setMessages(prev => [...prev, { 
      text: `I'm processing your automation request: ${command.originalCommand}`, 
      isUser: false 
    }]);
    
    switch (command.type) {
      case 'openBrowser':
        window.electron.sendMessage('open-browser', { 
          browserName: command.target || 'chrome'
        });
        break;
        
      case 'searchWeb':
        window.electron.sendMessage('web-search', { 
          query: command.query
        });
        break;
        
      case 'openApplication':
        window.electron.sendMessage('open-application', { 
          appName: command.target
        });
        break;
        
      case 'systemAction':
        if (command.action === 'screenshot') {
          window.electron.sendMessage('take-screenshot', {});
        }
        break;
        
      default:
        setIsProcessingAutomation(false);
        setMessages(prev => [...prev, { 
          text: `I'm not sure how to automate that. Could you try a different command?`, 
          isUser: false 
        }]);
        speakResponse(`I'm not sure how to automate that. Could you try a different command?`);
    }
    
    const learningTopic = getAutomationLearningTopic(command);
    if (learningTopic) {
      addConversationToMemory(
        command.originalCommand, 
        `I processed the automation command to ${command.type}`,
        learningTopic
      );
    }
  };
  
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      setIsPlaying(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = window.speechSynthesis.getVoices();
      
      const preferredVoices = [
        'Google UK English Female',
        'Microsoft Zira Desktop',
        'Microsoft David Desktop',
        'Google US English',
      ];
      
      for (const preferredVoice of preferredVoices) {
        const voice = voices.find(v => v.name === preferredVoice);
        if (voice) {
          utterance.voice = voice;
          break;
        }
      }
      
      if (!utterance.voice) {
        const englishVoice = voices.find(voice => voice.lang.includes('en'));
        if (englishVoice) utterance.voice = englishVoice;
      }
      
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        setIsPlaying(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
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
      
      <div className="glass-panel p-3 mb-4">
        <div className="text-xs text-muted-foreground mb-2">Desktop Automation Commands:</div>
        <div className="flex flex-wrap gap-2">
          <AutomationHint icon={<Monitor size={12} />} text="Open Chrome" />
          <AutomationHint icon={<Search size={12} />} text="Search for weather" />
          <AutomationHint icon={<Laptop size={12} />} text="Open app Notepad" />
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

interface AutomationHintProps {
  icon: React.ReactNode;
  text: string;
}

const AutomationHint: React.FC<AutomationHintProps> = ({ icon, text }) => {
  return (
    <div className="flex items-center bg-jarvis-dark-light rounded px-2 py-1 text-xs">
      <span className="mr-1 text-jarvis-blue">{icon}</span>
      <span>{text}</span>
    </div>
  );
};

export default SpeechRecognition;
