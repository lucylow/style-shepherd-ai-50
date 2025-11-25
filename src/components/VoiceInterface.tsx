import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Bot, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { VoiceResponse } from '@/types/fashion';
import { voiceService } from '@/services/voiceService';
import { cn } from '@/lib/utils';

interface VoiceInterfaceProps {
  onVoiceCommand?: (response: VoiceResponse) => void;
  userId: string;
  className?: string;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export const VoiceInterface = ({ onVoiceCommand, userId, className }: VoiceInterfaceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const { toast } = useToast();
  
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = async () => {
      try {
        await voiceService.startConversation(userId);
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
        setIsConnected(false);
      }
    };

    if (userId && userId !== 'guest') {
      initConversation();
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any ongoing recording
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }

      // Stop audio stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Cleanup audio URLs
      messages.forEach(msg => {
        if (msg.audioUrl) {
          voiceService.revokeAudioUrl(msg.audioUrl);
        }
      });

      // Stop audio playback
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Audio level visualization
  const startAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 255) * 100));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      
      updateLevel();
    } catch (error) {
      console.warn('Audio visualization not available:', error);
    }
  }, [isListening]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Start audio visualization
      startAudioVisualization(stream);
      
      // Determine best audio format
      const options: MediaRecorderOptions = { 
        mimeType: 'audio/webm;codecs=opus' 
      };
      
      // Fallback to default if webm not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        delete options.mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          await processAudio(audioBlob);
        }
        setAudioLevel(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive"
        });
        setIsListening(false);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);
      setIsExpanded(true);
      
      toast({
        title: "Listening...",
        description: "Speak your fashion request",
      });
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setIsConnected(false);
      toast({
        title: "Microphone Error",
        description: error.message || "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsListening(false);
      setIsProcessing(true);
      
      // Stop audio visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAudioLevel(0);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const response = await voiceService.processVoiceInput(
        userId,
        audioBlob,
        { messages }
      );

      const userMessage: Message = {
        type: 'user',
        content: 'Voice input',
        timestamp: Date.now(),
      };

      const assistantMessage: Message = {
        type: 'assistant',
        content: response.text,
        timestamp: Date.now(),
        audioUrl: response.audioUrl,
      };

      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
      // Auto-play audio response if available
      if (response.audioUrl) {
        playAudioResponse(response.audioUrl);
      }
      
      onVoiceCommand?.(response);
    } catch (error: any) {
      console.error('Error processing voice:', error);
      toast({
        title: "Processing Error",
        description: error.message || "Failed to process voice command. Please try again.",
        variant: "destructive"
      });
      
      // Add error message to conversation
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    try {
      // Stop any currently playing audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      setIsPlaying(true);

      audio.onended = () => {
        setIsPlaying(false);
        voiceService.revokeAudioUrl(audioUrl);
        audioPlayerRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        console.error('Audio playback error');
        audioPlayerRef.current = null;
      };

      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        setIsPlaying(false);
        audioPlayerRef.current = null;
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setIsPlaying(false);
    }
  };

  const clearMessages = () => {
    // Cleanup audio URLs before clearing
    messages.forEach(msg => {
      if (msg.audioUrl) {
        voiceService.revokeAudioUrl(msg.audioUrl);
      }
    });
    setMessages([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("fixed bottom-6 right-6 z-50", className)}
    >
      <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border overflow-hidden max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Bot className="w-6 h-6 text-primary" />
              {isConnected && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold block">Style Shepherd</span>
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearMessages}
                title="Clear conversation"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Voice Button with Audio Visualization */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-4">
              {/* Audio level indicator */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary/30"
                  animate={{
                    scale: [1, 1.2 + audioLevel / 100, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              )}
              
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing || !isConnected}
                size="lg"
                className={cn(
                  "w-20 h-20 rounded-full relative z-10 transition-all",
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50' 
                    : isProcessing
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-primary hover:bg-primary/90 text-white'
                )}
              >
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
            </div>

            {/* Status Text */}
            <p className="text-center text-sm text-muted-foreground mb-2">
              {isListening ? 'Listening...' : 
               isProcessing ? 'Processing...' : 
               isPlaying ? 'Playing response...' :
               'Tap to speak'}
            </p>

            {/* Audio Controls */}
            {messages.length > 0 && messages[messages.length - 1]?.audioUrl && (
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? stopAudio : () => {
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage?.audioUrl) {
                      playAudioResponse(lastMessage.audioUrl);
                    }
                  }}
                  className="h-8"
                >
                  {isPlaying ? (
                    <>
                      <VolumeX className="w-4 h-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 mr-1" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <AnimatePresence>
            {isExpanded && messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 max-h-60 overflow-y-auto border-t border-border pt-4 mt-4"
              >
                {messages.slice(-5).map((message, index) => (
                  <motion.div
                    key={`${message.timestamp}-${index}`}
                    initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "text-xs p-3 rounded-lg flex items-start gap-2",
                      message.type === 'user' 
                        ? 'bg-primary/10 text-primary ml-4' 
                        : 'bg-muted text-foreground mr-4'
                    )}
                  >
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {message.type === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <div>{message.content}</div>
                    </div>
                    {message.audioUrl && message.type === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => playAudioResponse(message.audioUrl!)}
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
