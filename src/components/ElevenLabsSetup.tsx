import React, { useState, useEffect } from 'react';
import { Key, Mic, VolumeX, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { elevenlabsTTS, ElevenLabsModel } from '@/utils/elevenlabsTTS';

const ElevenLabsSetup = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<Array<{voice_id: string, name: string}>>([]);
  const [sampleText, setSampleText] = useState<string>("Hello! This is a test of the ElevenLabs text-to-speech system.");
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(100);
  const [model, setModel] = useState<string>(ElevenLabsModel.MULTILINGUAL_V2);
  const [useElevenLabs, setUseElevenLabs] = useState<boolean>(true);
  
  // Check if API key exists on mount
  useEffect(() => {
    const hasKey = elevenlabsTTS.hasApiKey();
    setHasApiKey(hasKey);
    
    if (hasKey) {
      loadVoices();
    }
    
    // Set up callbacks
    elevenlabsTTS.onStart(() => {
      setIsSpeaking(true);
    });
    
    elevenlabsTTS.onEnd(() => {
      setIsSpeaking(false);
    });
    
    return () => {
      elevenlabsTTS.stop();
    };
  }, []);
  
  // Load available voices
  const loadVoices = async () => {
    try {
      const voices = await elevenlabsTTS.getVoices();
      setAvailableVoices(voices);
      
      if (voices.length > 0 && !selectedVoice) {
        setSelectedVoice(voices[0].voice_id);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };
  
  // Save API key
  const saveApiKey = () => {
    if (!apiKey.trim()) return;
    
    elevenlabsTTS.setApiKey(apiKey.trim());
    setHasApiKey(true);
    loadVoices();
  };
  
  // Speak sample text
  const speakSample = () => {
    if (isSpeaking) {
      elevenlabsTTS.stop();
      setIsSpeaking(false);
      return;
    }
    
    if (!sampleText.trim()) return;
    
    elevenlabsTTS.speak(sampleText, {
      voice_id: selectedVoice,
      model_id: model as ElevenLabsModel,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    });
  };
  
  // Set as default voice
  const setAsDefault = () => {
    if (selectedVoice) {
      elevenlabsTTS.setDefaultVoice(selectedVoice);
      elevenlabsTTS.setDefaultModel(model as ElevenLabsModel);
    }
  };
  
  return (
    <div className="glass-panel p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-jarvis-blue text-xl font-semibold flex items-center">
          <Volume2 className="mr-2" /> ElevenLabs Setup
        </h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-1 ${hasApiKey ? 'bg-jarvis-success' : 'bg-jarvis-accent'}`}></div>
          <span className="text-sm text-muted-foreground">
            {hasApiKey ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>
      
      <div className="space-y-4 flex-1">
        {!hasApiKey ? (
          <div className="space-y-3">
            <div className="glass-panel p-3">
              <Label htmlFor="apiKey" className="text-sm mb-2 block">ElevenLabs API Key</Label>
              <div className="flex space-x-2">
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your ElevenLabs API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={saveApiKey}
                  className="bg-jarvis-blue hover:bg-jarvis-blue-light"
                >
                  <Key size={16} className="mr-1" /> Connect
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                You can get an API key from <a href="https://elevenlabs.io/speech-synthesis" target="_blank" rel="noopener noreferrer" className="text-jarvis-blue hover:underline">ElevenLabs</a>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-panel p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="use-elevenlabs" className="text-sm">Use ElevenLabs TTS</Label>
                <Switch 
                  id="use-elevenlabs" 
                  checked={useElevenLabs}
                  onCheckedChange={setUseElevenLabs}
                />
              </div>
              
              {useElevenLabs && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="voice" className="text-sm">Voice</Label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVoices.map((voice) => (
                          <SelectItem key={voice.voice_id} value={voice.voice_id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-sm">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ElevenLabsModel.MULTILINGUAL_V2}>Multilingual v2 (Best Quality)</SelectItem>
                        <SelectItem value={ElevenLabsModel.TURBO_V2_5}>Turbo v2.5 (Fast)</SelectItem>
                        <SelectItem value={ElevenLabsModel.TURBO_V2}>Turbo v2 (English Only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="volume" className="text-sm">Volume</Label>
                      <span className="text-xs text-muted-foreground">{volume}%</span>
                    </div>
                    <Slider
                      id="volume"
                      min={0}
                      max={100}
                      step={1}
                      value={[volume]}
                      onValueChange={(vals) => setVolume(vals[0])}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={setAsDefault}
                    className="mt-2"
                  >
                    Set as Default
                  </Button>
                </>
              )}
            </div>
            
            <div className="glass-panel p-3 space-y-3">
              <Label htmlFor="sample-text" className="text-sm">Test Text-to-Speech</Label>
              <Input
                id="sample-text"
                placeholder="Enter text to speak"
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  onClick={speakSample}
                  className={isSpeaking ? "bg-jarvis-accent hover:bg-jarvis-accent/80" : "bg-jarvis-blue hover:bg-jarvis-blue-light"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX size={16} className="mr-1" /> Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={16} className="mr-1" /> Speak
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElevenLabsSetup;
