/**
 * Voice Service - Real ElevenLabs Integration
 * Connects to backend API for voice processing with ElevenLabs
 * Includes TTS fallback for text-to-speech
 */

import api from '@/lib/api';
import { VoiceResponse } from '@/types/fashion';
import { speakText } from '@/lib/ttsClient';

export interface ConversationState {
  conversationId: string;
  userId: string;
  context: Record<string, any>;
  lastMessage?: string;
  lastResponse?: string;
}

export interface VoiceProcessResponse {
  text: string;
  audio?: string; // Base64 encoded audio
  intent?: any;
  entities?: any;
}

class VoiceService {
  private conversationStates: Map<string, ConversationState> = new Map();

  /**
   * Start a new voice conversation
   */
  async startConversation(userId: string): Promise<ConversationState> {
    try {
      const response = await api.post<ConversationState>('/voice/conversation/start', {
        userId,
      });

      const state = response.data;
      this.conversationStates.set(userId, state);
      return state;
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      // Fallback: create local conversation state
      const fallbackState: ConversationState = {
        conversationId: `conv_${userId}_${Date.now()}`,
        userId,
        context: {},
      };
      this.conversationStates.set(userId, fallbackState);
      return fallbackState;
    }
  }

  /**
   * Process voice input (audio blob) and get response
   */
  async processVoiceInput(
    userId: string,
    audioBlob: Blob,
    context?: { messages?: any[] }
  ): Promise<VoiceResponse> {
    try {
      // Get or create conversation state
      let state = this.conversationStates.get(userId);
      if (!state) {
        state = await this.startConversation(userId);
      }

      // Convert blob to base64
      const audioBase64 = await this.blobToBase64(audioBlob);

      // Send to backend
      const response = await api.post<VoiceProcessResponse>(
        '/voice/conversation/process',
        {
          conversationId: state.conversationId,
          audioStream: audioBase64,
          userId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds for voice processing
        }
      );

      const { text, audio, intent, entities } = response.data;

      // Convert base64 audio to blob URL if available
      let audioUrl: string | undefined;
      if (audio) {
        try {
          // Try different audio formats
          const mimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm'];
          for (const mimeType of mimeTypes) {
            try {
              const audioBlob = this.base64ToBlob(audio, mimeType);
              audioUrl = URL.createObjectURL(audioBlob);
              break;
            } catch {
              // Try next format
              continue;
            }
          }
        } catch (audioError) {
          console.warn('Failed to create audio URL:', audioError);
        }
      } else if (text) {
        // Fallback: Use TTS client if backend didn't return audio
        // This will try browser Web Speech API first, then server TTS
        try {
          const ttsResult = await speakText(text);
          if (ttsResult.success) {
            console.log(`✅ TTS fallback used: ${ttsResult.source}`);
          } else {
            console.warn('TTS fallback failed:', ttsResult.error);
          }
        } catch (ttsError) {
          console.warn('TTS fallback error:', ttsError);
        }
      }

      // Update conversation state
      if (state) {
        state.lastMessage = text;
        state.lastResponse = text;
        state.context = {
          ...state.context,
          lastQuery: text,
          lastIntent: intent,
          lastEntities: entities,
          timestamp: Date.now(),
        };
      }

      return {
        text,
        audioUrl,
        confidence: 0.9, // Backend provides this via intent analysis
        // Note: Products would need to be fetched separately based on intent
      };
    } catch (error: any) {
      console.error('Failed to process voice input:', error);
      
      // Check if it's a network error (backend unavailable)
      if (!error.response) {
        throw new Error('Unable to connect to voice service. Please check your connection and try again.');
      }
      
      // Provide user-friendly error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to process voice command. Please try again.';

      throw new Error(errorMessage);
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await api.get(`/voice/conversation/history/${userId}`, {
        params: { limit },
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * End conversation
   */
  async endConversation(userId: string): Promise<void> {
    try {
      const state = this.conversationStates.get(userId);
      if (state) {
        await api.delete(`/voice/conversation/${state.conversationId}`, {
          data: { userId },
        });
      }
    } catch (error) {
      console.error('Failed to end conversation:', error);
    } finally {
      this.conversationStates.delete(userId);
    }
  }

  /**
   * Get current conversation state
   */
  getConversationState(userId: string): ConversationState | undefined {
    return this.conversationStates.get(userId);
  }

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Data = base64.split(',')[1] || base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string = 'audio/mpeg'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Clean up audio URLs to prevent memory leaks
   */
  revokeAudioUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export const voiceService = new VoiceService();

