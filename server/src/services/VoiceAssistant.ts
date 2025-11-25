/**
 * ElevenLabs Voice Assistant Service
 * Handles voice conversation and speech processing
 */

import env from '../config/env.js';
import { userMemory } from '../lib/raindrop-config.js';
import { vultrValkey } from '../lib/vultr-valkey.js';

export interface ConversationState {
  conversationId: string;
  userId: string;
  context: Record<string, any>;
  lastMessage?: string;
  lastResponse?: string;
}

export class VoiceAssistant {
  private client: any;

  constructor() {
    // Optional ElevenLabs integration - will use fallback if not available
    try {
      // Try to use elevenlabs package if available
      // In production, install: npm install elevenlabs
      // For now, client will be undefined and we'll use fallbacks
      this.client = undefined;
    } catch {
      this.client = undefined;
    }
  }

  /**
   * Start a new voice conversation
   */
  async startConversation(userId: string): Promise<ConversationState> {
    try {
      // Get user voice profile from SmartMemory
      const userProfile = await userMemory.get(userId);
      const voiceId = userProfile?.voicePreference || '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)

      // Create conversation with ElevenLabs
      // Note: Adjust API calls based on actual ElevenLabs SDK version
      let conversationId: string;
      
      try {
        // Try conversation API (if available in SDK version)
        if (this.client.conversation && typeof this.client.conversation.create === 'function') {
          const conversation = await this.client.conversation.create({
            voice_id: voiceId,
            model_id: 'eleven_multilingual_v2',
            settings: {
              stability: 0.5,
              similarity_boost: 0.8,
            },
          });
          conversationId = conversation.conversation_id || conversation.id || `conv_${Date.now()}`;
        } else {
          // Fallback: Generate conversation ID
          conversationId = `conv_${userId}_${Date.now()}`;
        }
      } catch (apiError) {
        console.warn('ElevenLabs conversation API not available, using fallback:', apiError);
        conversationId = `conv_${userId}_${Date.now()}`;
      }

      const state: ConversationState = {
        conversationId,
        userId,
        context: {},
      };

      // Cache conversation state in Valkey for fast access
      await vultrValkey.set(
        `conversation:${userId}`,
        state,
        3600 // 1 hour TTL
      );

      return state;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }

  /**
   * Process voice input and get response
   */
  async processVoiceInput(
    conversationId: string,
    audioStream: Buffer | ArrayBuffer,
    userId?: string
  ): Promise<{ text: string; audio?: Buffer }> {
    try {
      // Convert audio to text (speech-to-text)
      const textQuery = await this.speechToText(audioStream);

      // Get conversation state
      let state: ConversationState | null = null;
      if (userId) {
        state = await vultrValkey.get<ConversationState>(`conversation:${userId}`);
      }

      // Process with ElevenLabs conversation API
      let responseText = '';
      let responseAudio: Buffer | undefined;

      try {
        // Try conversation API (adjust based on actual SDK)
        if (this.client.conversation && typeof this.client.conversation.say === 'function') {
          const response = await this.client.conversation.say(conversationId, {
            audio: audioStream,
            text_query: textQuery,
          });
          responseText = response.text || responseText;
          responseAudio = response.audio;
        } else {
          // Fallback: Use text-to-speech API
          const userProfile = userId ? await userMemory.get(userId) : null;
          const voiceId = userProfile?.voicePreference || '21m00Tcm4TlvDq8ikWAM';
          
          // Generate response text (in production, use your AI/NLP service)
          responseText = `I understand you said: "${textQuery}". How can I help you find the perfect fashion items?`;
          
          // Generate audio response using text-to-speech
          if (this.client.textToSpeech && typeof this.client.textToSpeech.convert === 'function') {
            const audioResponse = await this.client.textToSpeech.convert(voiceId, {
              text: responseText,
              model_id: 'eleven_multilingual_v2',
            });
            responseAudio = Buffer.from(audioResponse);
          }
        }
      } catch (apiError) {
        console.warn('ElevenLabs API call failed, using fallback:', apiError);
        responseText = `I heard: "${textQuery}". Let me help you with that!`;
      }

      // Update conversation context
      if (state && userId) {
        state.lastMessage = textQuery;
        state.lastResponse = responseText;
        state.context = {
          ...state.context,
          lastQuery: textQuery,
          timestamp: Date.now(),
        };
        await vultrValkey.set(`conversation:${userId}`, state, 3600);
      }

      // Store conversation in SmartMemory for continuity
      if (userId) {
        await userMemory.append(`${userId}-conversation`, {
          message: textQuery,
          type: 'user',
          timestamp: Date.now(),
        });
        await userMemory.append(`${userId}-conversation`, {
          message: responseText,
          type: 'assistant',
          timestamp: Date.now(),
        });
      }

      return {
        text: responseText,
        audio: responseAudio,
      };
    } catch (error) {
      console.error('Failed to process voice input:', error);
      throw error;
    }
  }

  /**
   * Speech-to-text conversion
   * In production, this would use ElevenLabs or another STT service
   */
  private async speechToText(audioStream: Buffer | ArrayBuffer): Promise<string> {
    // This is a placeholder - in production, use ElevenLabs STT or similar
    // For now, return a mock response
    try {
      // If using ElevenLabs STT API:
      // const response = await this.client.speechToText.convert(audioStream);
      // return response.text;
      
      // Mock implementation
      return 'Find me a blue dress for a wedding';
    } catch (error) {
      console.error('Speech-to-text error:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await userMemory.get(`${userId}-conversation`) || [];
      return Array.isArray(history) ? history.slice(-limit) : [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * End conversation and clean up
   */
  async endConversation(conversationId: string, userId?: string): Promise<void> {
    try {
      if (userId) {
        await vultrValkey.delete(`conversation:${userId}`);
      }
      // ElevenLabs conversations are stateless, no cleanup needed
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }
}

export const voiceAssistant = new VoiceAssistant();

