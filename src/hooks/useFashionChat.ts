import { useState, useCallback } from 'react';
import { streamFashionChat } from '@/services/aiAssistant';
import { toast } from 'sonner';

type Message = { role: 'user' | 'assistant'; content: string };

export function useFashionChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (input: string) => {
      if (!input.trim() || isLoading) return;

      const userMsg: Message = { role: 'user', content: input };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      let assistantContent = '';

      const updateAssistantMessage = (chunk: string) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      };

      try {
        await streamFashionChat({
          messages: [...messages, userMsg],
          onDelta: updateAssistantMessage,
          onDone: () => setIsLoading(false),
          onError: (error) => {
            setIsLoading(false);
            toast.error(error.message || 'Failed to get response');
          },
        });
      } catch (error) {
        setIsLoading(false);
        console.error('Chat error:', error);
        toast.error('Failed to send message');
      }
    },
    [messages, isLoading]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
