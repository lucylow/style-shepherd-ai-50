import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Bot, Volume2, VolumeX, X, Loader2, Sparkles, User } from 'lucide-react';
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
  const [isTyping, setIsTyping] = useState(false);
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
      // Show typing indicator
      setIsTyping(true);
      
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

      // Simulate typing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsTyping(false);

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
      setIsTyping(false);
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
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {isConnected && (
                <motion.div 
                  className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <span className="text-sm font-bold block text-foreground">Style Shepherd AI</span>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xs",
                  isConnected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                )}>
                  {isConnected ? '● Active' : '● Offline'}
                </span>
                {isProcessing && (
                  <span className="text-xs text-primary animate-pulse">Processing...</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
            <div className="text-center mb-2">
              <motion.p 
                key={isListening ? 'listening' : isProcessing ? 'processing' : isPlaying ? 'playing' : 'ready'}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-foreground"
              >
                {isListening ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Listening...
                  </span>
                ) : isProcessing ? (
                  <span className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing your request...
                  </span>
                ) : isPlaying ? (
                  <span className="flex items-center justify-center gap-2 text-primary">
                    <Volume2 className="w-3 h-3" />
                    Playing response...
                  </span>
                ) : (
                  'Tap to speak'
                )}
              </motion.p>
              {!isListening && !isProcessing && !isPlaying && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ask about fashion, sizing, or styling
                </p>
              )}
            </div>

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
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 max-h-60 overflow-y-auto border-t border-border pt-4 mt-4 scrollbar-thin"
              >
                {messages.length === 0 && !isTyping && (
                  <div className="text-center py-4">
                    <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-xs text-muted-foreground">
                      Start a conversation by tapping the microphone
                    </p>
                  </div>
                )}
                {messages.slice(-5).map((message, index) => (
                  <motion.div
                    key={`${message.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "flex items-start gap-3",
                      message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                      message.type === 'user' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gradient-to-br from-primary to-primary/70 text-white shadow-md'
                    )}>
                      {message.type === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={cn(
                      "flex-1 rounded-2xl px-4 py-2.5 max-w-[80%]",
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground border border-border/50'
                    )}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      {message.audioUrl && message.type === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 mt-2 text-xs"
                          onClick={() => playAudioResponse(message.audioUrl!)}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          Play audio
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3 border border-border/50">
                      <div className="flex gap-1">
                        <motion.div
                          className="w-2 h-2 bg-foreground/60 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-foreground/60 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-2 h-2 bg-foreground/60 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
