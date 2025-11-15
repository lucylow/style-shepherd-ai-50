import { useState } from 'react';
import { Mic, MicOff, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

interface VoiceInterfaceProps {
  onVoiceCommand?: (command: string) => void;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
}

export const VoiceInterface = ({ onVoiceCommand }: VoiceInterfaceProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();

  const startListening = () => {
    setIsListening(true);
    toast({
      title: "Listening...",
      description: "Speak your fashion request",
    });

    // Mock: In real implementation, this would use Web Speech API or MediaRecorder
    setTimeout(() => {
      stopListening();
    }, 3000);
  };

  const stopListening = () => {
    setIsListening(false);
    setIsProcessing(true);

    // Mock voice processing
    setTimeout(() => {
      const mockCommand = "Show me casual summer dresses under $200";
      setMessages(prev => [
        ...prev,
        { type: 'user', content: mockCommand },
        { type: 'assistant', content: "I found some great casual summer dresses for you! Check out the recommendations below." }
      ]);
      setIsProcessing(false);
      onVoiceCommand?.(mockCommand);
    }, 1500);
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
