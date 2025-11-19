import { useState, useRef } from 'react';
import { Mic, MicOff, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { VoiceResponse } from '@/types/fashion';
import { mockVoiceService } from '@/services/mockVoice';

interface VoiceInterfaceProps {
  onVoiceCommand?: (response: VoiceResponse) => void;
  userId: string;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

export const VoiceInterface = ({ onVoiceCommand, userId }: VoiceInterfaceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak your fashion request",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
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
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const response = await mockVoiceService.processVoiceCommand(
        userId,
        audioBlob,
        { messages }
      );

      setMessages(prev => [
        ...prev,
        { type: 'user', content: 'Voice input' },
        { type: 'assistant', content: response.text }
      ]);
      
      onVoiceCommand?.(response);
    } catch (error) {
      console.error('Error processing voice:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process voice command",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="bg-background/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-border p-6 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="text-sm font-semibold">Style Shepherd</span>
          </div>
          <div className={`w-3 h-3 rounded-full ${
            isListening ? 'bg-green-500 animate-pulse' : 
            isProcessing ? 'bg-yellow-500 animate-pulse' : 
            'bg-muted'
          }`} />
        </div>

        {/* Voice Button */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            size="lg"
            className={`w-20 h-20 rounded-full ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isProcessing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
              />
            ) : isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
        </div>

        {/* Status Text */}
        <p className="text-center text-sm text-muted-foreground mb-4">
          {isListening ? 'Listening...' : 
           isProcessing ? 'Processing...' : 
           'Tap to speak'}
        </p>

        {/* Conversation History */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 max-h-40 overflow-y-auto"
            >
              {messages.slice(-3).map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: message.type === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-xs p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-primary/10 text-primary ml-4' 
                      : 'bg-muted text-foreground mr-4'
                  }`}
                >
                  {message.content}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
