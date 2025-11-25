/**
 * ElevenLabs Voice Assistant Service
 * Enhanced with LLM-powered intent extraction, response generation, and Whisper STT
 * Handles voice conversation and speech processing
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../config/env.js';
import { userMemory } from '../lib/raindrop-config.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { ttsService } from './TTSService.js';
import { aiDataFlowOrchestrator, AIRequest } from './AIDataFlowOrchestrator.js';
import { conversationMemoryOptimizer, ConversationMessage } from './ConversationMemoryOptimizer.js';
import { llmService } from './LLMService.js';
import { sttService } from './STTService.js';
import { createHash } from 'crypto';

export interface ConversationState {
  conversationId: string;
  userId: string;
  context: Record<string, any>;
  lastMessage?: string;
  lastResponse?: string;
  voiceSettings?: VoiceSettings;
  preferences?: UserVoicePreferences;
}

export interface VoiceSettings {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface UserVoicePreferences {
  voicePreference?: string;
  sizePreferences?: Record<string, string>; // brand -> size mapping
  colorPreferences?: string[];
  stylePreferences?: string[];
  brandPreferences?: string[];
}

export interface STTResult {
  text: string;
  confidence?: number;
  source: 'openai' | 'elevenlabs' | 'fallback';
}

export class VoiceAssistant {
  private client: ElevenLabsClient | null;
  private apiKey: string | null;
  private readonly DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  private readonly DEFAULT_MODEL = 'eleven_multilingual_v2';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms

  constructor() {
    // Support both ELEVENLABS_API_KEY and ELEVEN_LABS_API_KEY (legacy)
    this.apiKey = (env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY) || null;
    
    // Initialize ElevenLabs client with API key
    try {
      if (this.apiKey) {
        this.client = new ElevenLabsClient({
          apiKey: this.apiKey,
        });
        console.log('✅ ElevenLabs client initialized successfully');
      } else {
        console.warn('⚠️ ElevenLabs API key not found in environment, voice features will use fallbacks');
        this.client = null;
      }
    } catch (error) {
      console.error('❌ Failed to initialize ElevenLabs client:', error);
      this.client = null;
    }
  }

  /**
   * Start a new voice conversation with enhanced settings
   */
  async startConversation(userId: string): Promise<ConversationState> {
    try {
      // Get user voice profile and preferences from SmartMemory
      const userProfile = await this.getOrCreateUserProfile(userId);
      
      // Get user voice preferences
      const preferences = await this.getUserVoicePreferences(userId);
      
      // Determine voice settings from user preferences
      const voiceSettings: VoiceSettings = {
        voiceId: preferences.voicePreference || userProfile?.voicePreference || this.DEFAULT_VOICE_ID,
        modelId: this.DEFAULT_MODEL,
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5,
        useSpeakerBoost: true,
      };

      // Create conversation ID
      const conversationId = `conv_${userId}_${Date.now()}`;
      
      // Store voice settings for this conversation in cache
        if (this.client) {
          await vultrValkey.set(
            `conversation:${conversationId}:settings`,
          voiceSettings,
          3600 // 1 hour TTL
        );
      }

      const state: ConversationState = {
        conversationId,
        userId,
        context: {
          sessionStart: Date.now(),
          messageCount: 0,
        },
        voiceSettings,
        preferences,
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
   * Process voice input with enhanced features:
   * - Improved STT
   * - Preference memory storage
   * - Context-aware responses
   * - Error handling with retries
   * - Enhanced data flow with orchestrator
   */
  async processVoiceInput(
    conversationId: string,
    audioStream: Buffer | ArrayBuffer,
    userId?: string
  ): Promise<{ text: string; audio?: Buffer; intent?: any; entities?: any; preferencesSaved?: boolean }> {
    // Use orchestrator for better data flow management
    const requestId = `voice_${conversationId}_${Date.now()}`;
    const dedupeKey = userId ? `voice_${userId}_${this.hashAudio(audioStream)}` : undefined;

    const request: AIRequest<{ conversationId: string; audioStream: Buffer | ArrayBuffer; userId?: string }> = {
      id: requestId,
      type: 'voice',
      payload: { conversationId, audioStream, userId },
      userId,
      timestamp: Date.now(),
      dedupeKey,
      priority: 'high',
    };

    // Process through orchestrator for caching, deduplication, and circuit breaking
    try {
      const response = await aiDataFlowOrchestrator.processRequest(
        request,
        async (req) => {
          return this.processVoiceInputInternal(req.payload.conversationId, req.payload.audioStream, req.payload.userId);
        },
        {
          cacheKey: dedupeKey ? `voice:${userId}:${this.hashAudio(audioStream)}` : undefined,
          cacheTTL: 300, // Cache voice requests for 5 minutes
          serviceName: 'voice-assistant',
          skipDeduplication: !dedupeKey, // Skip if no dedupe key
          skipCache: false, // Enable caching
        }
      );

      return response.data;
    } catch (error) {
      // Fallback to direct processing if orchestrator fails
      console.warn('Orchestrator failed, falling back to direct processing:', error);
      return this.processVoiceInputInternal(conversationId, audioStream, userId);
    }
  }

  /**
   * Internal voice processing (original implementation)
   */
  private async processVoiceInputInternal(
    conversationId: string,
    audioStream: Buffer | ArrayBuffer,
    userId?: string
  ): Promise<{ text: string; audio?: Buffer; intent?: any; entities?: any; preferencesSaved?: boolean }> {
    let lastError: Error | null = null;
    
    // Retry logic for processing
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
    try {
      // Convert audio to text (speech-to-text) using enhanced STT service
        const sttResult = await sttService.transcribe(audioStream, {
          prompt: userId ? await this.getContextPrompt(userId) : undefined,
        });
        const textQuery = sttResult.text;

      // Skip if transcription failed
      if (!textQuery || textQuery === '[Audio transcription needed - please configure STT service]') {
        throw new Error('Failed to transcribe audio input');
      }

      // Get conversation state and user profile
      let state: ConversationState | null = null;
      let userProfile: any = null;
      
      if (userId) {
        [state, userProfile] = await Promise.all([
          vultrValkey.get<ConversationState>(`conversation:${userId}`),
          userMemory.get(userId),
        ]);
      }

      // Get conversation history for context (needed before intent extraction)
      const conversationHistory = userId 
        ? await this.getConversationHistory(userId, 10)
        : [];

        // Enhanced intent and entity extraction using LLM (with fallback)
      const intentAnalysis = await llmService.extractIntentAndEntities(
        textQuery,
        conversationHistory,
        userProfile
      );
        
        // Check if user wants to save preferences
        const preferencesToSave = this.detectPreferencesFromQuery(textQuery, intentAnalysis);

        // Generate intelligent response using LLM (with fallback)
      let responseText = await llmService.generateResponse(
        textQuery,
        intentAnalysis,
        conversationHistory,
        userProfile,
          state?.preferences
        );

        // Save user preferences if detected
        let preferencesSaved = false;
        if (preferencesToSave && userId) {
          try {
            await this.saveUserPreferences(userId, preferencesToSave);
            preferencesSaved = true;
            
            // Update preferences in conversation state
            if (state) {
              state.preferences = {
                ...state.preferences,
                ...preferencesToSave,
              };
            }
            
            // Enhance response to confirm preference saving
            if (preferencesToSave.sizePreferences || preferencesToSave.voicePreference) {
              responseText += ' I\'ve saved that preference for you!';
            }
          } catch (prefError) {
            console.warn('Failed to save user preferences:', prefError);
          }
        }

        // Get voice settings for TTS
        const voiceSettings = state?.voiceSettings || {
          voiceId: state?.preferences?.voicePreference || this.DEFAULT_VOICE_ID,
          modelId: this.DEFAULT_MODEL,
          stability: 0.5,
          similarityBoost: 0.8,
        };

      // Process with TTS service (fallback chain: local TTS → ElevenLabs)
      let responseAudio: Buffer | undefined;

      try {
          const ttsResult = await this.generateSpeechWithRetry(
            responseText,
            voiceSettings,
            attempt
          );
          responseAudio = ttsResult;
          console.log(`✅ TTS generated successfully (attempt ${attempt + 1})`);
      } catch (ttsError) {
          console.warn(`TTS attempt ${attempt + 1} failed:`, ttsError);
          if (attempt === this.MAX_RETRIES - 1) {
            console.warn('All TTS attempts failed, continuing with text-only response');
          }
        // Continue with text-only response
      }

      // Update conversation context with enhanced metadata
      if (state && userId) {
        state.lastMessage = textQuery;
        state.lastResponse = responseText;
        state.context = {
          ...state.context,
          lastQuery: textQuery,
          lastIntent: intentAnalysis.intent,
          lastEntities: intentAnalysis.entities,
          timestamp: Date.now(),
          confidence: intentAnalysis.confidence,
            messageCount: (state.context.messageCount || 0) + 1,
            sttSource: sttResult.source,
          };
          if (preferencesSaved && preferencesToSave) {
            state.preferences = {
              ...state.preferences,
              ...preferencesToSave,
            };
          }
        await vultrValkey.set(`conversation:${userId}`, state, 3600);
      } else if (userId) {
        // Create new state if it doesn't exist
        const newConversationId = `conv_${userId}_${Date.now()}`;
        const newState: ConversationState = {
          conversationId: newConversationId,
          userId,
          context: {
            lastQuery: textQuery,
            lastIntent: intentAnalysis.intent,
            lastEntities: intentAnalysis.entities,
            timestamp: Date.now(),
            confidence: intentAnalysis.confidence,
              messageCount: 1,
              sttSource: sttResult.source,
          },
          lastMessage: textQuery,
          lastResponse: responseText,
            preferences: preferencesToSave || undefined,
        };
        await vultrValkey.set(`conversation:${userId}`, newState, 3600);
      }

      // Store conversation in SmartMemory for continuity with metadata (with optimization)
      if (userId) {
        const conversationKey = `${userId}-conversation`;
        const newMessages: ConversationMessage[] = [
          {
            message: textQuery,
            type: 'user',
            intent: intentAnalysis.intent,
            entities: intentAnalysis.entities,
            timestamp: Date.now(),
            metadata: { sttSource: sttResult.source },
          },
          {
            message: responseText,
            type: 'assistant',
            timestamp: Date.now(),
            metadata: { preferencesSaved },
          },
        ];

        // Get existing conversation and optimize if needed
        try {
          const existingMessages = await userMemory.get(conversationKey) || [];
          const allMessages = Array.isArray(existingMessages) 
            ? [...existingMessages, ...newMessages]
            : newMessages;

          // Optimize conversation if it's getting large
          if (allMessages.length > 20) {
            const optimized = await conversationMemoryOptimizer.optimizeConversation(allMessages);
            await userMemory.set(conversationKey, optimized);
          } else {
            await userMemory.append(conversationKey, newMessages[0]);
            await userMemory.append(conversationKey, newMessages[1]);
          }
        } catch (memoryError) {
          // Fallback to simple append if optimization fails
          console.warn('Conversation optimization failed, using simple append:', memoryError);
          await userMemory.append(conversationKey, newMessages[0]);
          await userMemory.append(conversationKey, newMessages[1]);
        }
      }

      return {
        text: responseText,
        audio: responseAudio,
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
          preferencesSaved,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Voice processing attempt ${attempt + 1} failed:`, error);
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(this.RETRY_DELAY * Math.pow(2, attempt));
        }
      }
    }

    // All retries failed
    console.error('Failed to process voice input after all retries:', lastError);
    throw lastError || new Error('Failed to process voice input');
  }

  /**
   * Process text query (for text-based assistant endpoint)
   * Returns structured response with text, intent, entities, and optional audio
   */
  async processTextQuery(
    query: string,
    userId?: string,
    options?: { audioPreferred?: boolean }
  ): Promise<{
    text: string;
    intent?: string;
    entities?: Record<string, any>;
    audio?: Buffer;
  }> {
    try {
      // Get user profile and conversation state
      let userProfile: any = null;
      let state: ConversationState | null = null;
      
      if (userId) {
        [state, userProfile] = await Promise.all([
          vultrValkey.get<ConversationState>(`conversation:${userId}`),
          userMemory.get(userId),
        ]);
      }
      
      // Get conversation history
      const conversationHistory = userId 
        ? await this.getConversationHistory(userId, 10)
        : [];

      // Extract intent and entities using LLM
      const intentAnalysis = await llmService.extractIntentAndEntities(
        query,
        conversationHistory,
        userProfile
      );

      // Generate contextual response using LLM
      const responseText = await llmService.generateResponse(
        query,
        intentAnalysis,
        conversationHistory,
        userProfile,
        state?.preferences
      );

      // Generate audio if preferred
      let responseAudio: Buffer | undefined;
      if (options?.audioPreferred) {
        try {
          const voiceId = userProfile?.voicePreference || this.DEFAULT_VOICE_ID;
          const stability = intentAnalysis.confidence > 0.85 ? 0.7 : 0.5;
          const similarityBoost = intentAnalysis.confidence > 0.85 ? 0.85 : 0.75;
          
          const ttsResult = await ttsService.textToSpeech(responseText, voiceId, {
            stability,
            similarityBoost,
            useCache: true,
          });
          responseAudio = ttsResult.audio;
        } catch (ttsError) {
          console.warn('TTS generation failed for text query:', ttsError);
        }
      }

      // Update conversation state
      if (state && userId) {
        state.lastMessage = query;
        state.lastResponse = responseText;
        state.context = {
          ...state.context,
          lastQuery: query,
          lastIntent: intentAnalysis.intent,
          lastEntities: intentAnalysis.entities,
          timestamp: Date.now(),
          confidence: intentAnalysis.confidence,
        };
        await vultrValkey.set(`conversation:${userId}`, state, 3600);
      }

      return {
        text: responseText,
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        audio: responseAudio,
      };
    } catch (error) {
      console.error('Failed to process text query:', error);
      throw error;
    }
  }

  /**
   * Generate speech with retry logic and enhanced settings
   * Uses TTS service with fallback chain: Cache → Local TTS → ElevenLabs (direct API or SDK)
   */
  private async generateSpeechWithRetry(
    text: string,
    voiceSettings: VoiceSettings,
    attempt: number = 0
  ): Promise<Buffer> {
    try {
      // Use enhanced TTS service with fallback chain and caching
      // The service handles: cache → local TTS → ElevenLabs (direct API preferred, SDK fallback)
      const ttsResult = await ttsService.textToSpeech(text, voiceSettings.voiceId, {
        stability: voiceSettings.stability,
        similarityBoost: voiceSettings.similarityBoost,
        useCache: true, // Enable caching for better performance
      });
      
      console.log(`✅ TTS generated via ${ttsResult.source}`);
      return ttsResult.audio;
    } catch (error) {
      // If TTS service fails completely, try direct ElevenLabs SDK as last resort
      if (this.client && attempt === 0) {
        console.warn('TTS service failed, trying direct ElevenLabs SDK as last resort');
        try {
          const audioResponse = await this.client.textToSpeech.convert(voiceSettings.voiceId, {
            text: text,
            modelId: voiceSettings.modelId,
            voiceSettings: {
              stability: voiceSettings.stability,
              similarityBoost: voiceSettings.similarityBoost,
              style: voiceSettings.style,
              useSpeakerBoost: voiceSettings.useSpeakerBoost,
            },
          });

          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of audioResponse) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        } catch (sdkError) {
          console.error('Direct ElevenLabs SDK also failed:', sdkError);
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }

  /**
   * Get context prompt for STT (helps with accuracy)
   */
  private async getContextPrompt(userId: string): Promise<string | undefined> {
    try {
      const state = await vultrValkey.get<ConversationState>(`conversation:${userId}`);
      const history = await this.getConversationHistory(userId, 3);
      
      if (history.length > 0 || state?.lastMessage) {
        const recentContext = history
          .slice(-3)
          .map((m: any) => m.message)
          .join('. ');
        return `Context: ${recentContext}. ${state?.lastMessage || ''}`;
      }
    } catch (error) {
      // Non-critical, continue without context
    }
    return undefined;
  }

  /**
   * Save user preferences to memory (similar to Python example)
   */
  private async saveUserPreferences(
    userId: string,
    preferences: Partial<UserVoicePreferences>
  ): Promise<void> {
    try {
      // Get existing preferences
      const existing = await this.getUserVoicePreferences(userId);
      
      // Merge with new preferences
      const updated: UserVoicePreferences = {
        ...existing,
        ...preferences,
        // Merge nested objects
        sizePreferences: {
          ...existing.sizePreferences,
          ...preferences.sizePreferences,
        },
        colorPreferences: [
          ...(existing.colorPreferences || []),
          ...(preferences.colorPreferences || []),
        ].filter((v, i, arr) => arr.indexOf(v) === i), // Remove duplicates
        stylePreferences: [
          ...(existing.stylePreferences || []),
          ...(preferences.stylePreferences || []),
        ].filter((v, i, arr) => arr.indexOf(v) === i),
        brandPreferences: [
          ...(existing.brandPreferences || []),
          ...(preferences.brandPreferences || []),
        ].filter((v, i, arr) => arr.indexOf(v) === i),
      };

      // Store in SmartMemory
      await userMemory.set(`${userId}-voice-preferences`, updated);
      
      // Also store in Valkey cache for fast access
      await vultrValkey.set(`voice-preferences:${userId}`, updated, 86400); // 24h TTL
      
      // Store in conversation history for context
      await userMemory.append(`${userId}-preferences-log`, {
        preferences: updated,
        timestamp: Date.now(),
      });
      
      console.log(`✅ Saved preferences for user ${userId}:`, preferences);
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user voice preferences from memory
   */
  private async getUserVoicePreferences(userId: string): Promise<UserVoicePreferences> {
    try {
      // Try cache first
      const cached = await vultrValkey.get<UserVoicePreferences>(`voice-preferences:${userId}`);
      if (cached) {
        return cached;
      }

      // Try SmartMemory
      const fromMemory = await userMemory.get(`${userId}-voice-preferences`);
      if (fromMemory) {
        // Cache it
        await vultrValkey.set(`voice-preferences:${userId}`, fromMemory, 86400);
        return fromMemory;
      }

      // Try user profile
      const userProfile = await userMemory.get(userId);
      if (userProfile?.voicePreference || userProfile?.preferences) {
        const preferences: UserVoicePreferences = {
          voicePreference: userProfile.voicePreference,
          sizePreferences: userProfile.sizePreferences,
          colorPreferences: userProfile.preferences?.favoriteColors,
          stylePreferences: userProfile.preferences?.preferredStyles,
          brandPreferences: userProfile.preferences?.preferredBrands,
        };
        
        // Cache it
        await vultrValkey.set(`voice-preferences:${userId}`, preferences, 86400);
        return preferences;
      }

      return {};
    } catch (error) {
      console.error('Failed to get user voice preferences:', error);
      return {};
    }
  }

  /**
   * Get or create user profile
   */
  private async getOrCreateUserProfile(userId: string): Promise<any> {
    try {
      let profile = await userMemory.get(userId);
      if (!profile) {
        profile = {
          userId,
          createdAt: new Date().toISOString(),
        };
        await userMemory.set(userId, profile);
      }
      return profile;
    } catch (error) {
      console.error('Failed to get/create user profile:', error);
      return null;
    }
  }

  /**
   * Detect preferences from user query (size, voice, color, etc.)
   */
  private detectPreferencesFromQuery(
    text: string,
    intentAnalysis: { intent: string; entities: Record<string, any> }
  ): Partial<UserVoicePreferences> | null {
    const lowerText = text.toLowerCase();
    const preferences: Partial<UserVoicePreferences> = {};
    let hasPreferences = false;

    // Detect size preferences (e.g., "I'm a medium in Levi's")
    const sizePattern = /\b(?:i'?m|i am|wear|my size is|i wear)\s+(?:a\s+)?(\w+)\s+(?:in|for|with)\s+([\w\s&]+)/i;
    const sizeMatch = lowerText.match(sizePattern);
    if (sizeMatch) {
      const size = sizeMatch[1].toUpperCase();
      const brand = sizeMatch[2].trim();
      preferences.sizePreferences = { [brand]: size };
      hasPreferences = true;
    } else if (intentAnalysis.entities.size && intentAnalysis.entities.brand) {
      // Extract from entities
      preferences.sizePreferences = {
        [intentAnalysis.entities.brand]: intentAnalysis.entities.size,
      };
      hasPreferences = true;
    }

    // Detect voice preference (e.g., "use a male voice", "I prefer Rachel's voice")
    const voicePattern = /\b(?:use|prefer|want|like)\s+(?:a\s+)?(?:male|female|man|woman|rachel|george|adam|etc)[''s]?\s+voice/i;
    if (voicePattern.test(lowerText)) {
      // Extract voice name or gender preference
      // This is a simplified extraction - in production, use NLP to map to actual voice IDs
      if (lowerText.includes('rachel')) {
        preferences.voicePreference = '21m00Tcm4TlvDq8ikWAM';
        hasPreferences = true;
      } else if (lowerText.includes('george')) {
        preferences.voicePreference = 'ThT5KcBeYPX3keUQqHPh';
        hasPreferences = true;
      }
    }

    // Detect color preferences
    if (intentAnalysis.entities.color) {
      preferences.colorPreferences = [intentAnalysis.entities.color];
      hasPreferences = true;
    }

    // Detect style preferences
    if (intentAnalysis.entities.category) {
      preferences.stylePreferences = [intentAnalysis.entities.category];
      hasPreferences = true;
    }

    // Detect brand preferences
    if (intentAnalysis.entities.brand) {
      preferences.brandPreferences = [intentAnalysis.entities.brand];
      hasPreferences = true;
    }

    return hasPreferences ? preferences : null;
  }

  /**
   * Generate contextual response (delegates to LLM service)
   * Kept for backward compatibility
   */
  private async generateContextualResponse(
    query: string,
    intentAnalysis: { intent: string; entities: Record<string, any>; confidence: number },
    history: any[],
    userProfile: any,
    context: Record<string, any>,
    preferences?: UserVoicePreferences
  ): Promise<string> {
    return llmService.generateResponse(query, intentAnalysis, history, userProfile, preferences);
  }

  /**
   * Extract intent and entities (delegates to LLM service)
   * Kept for backward compatibility - actual calls use llmService directly
   */
  private async extractIntentAndEntities(text: string, userId?: string): Promise<{
    intent: string;
    entities: Record<string, any>;
    confidence: number;
    context?: Record<string, any>;
  }> {
    const conversationHistory = userId 
      ? await this.getConversationHistory(userId, 10)
      : [];
    const userProfile = userId ? await userMemory.get(userId) : null;
    
    return llmService.extractIntentAndEntities(text, conversationHistory, userProfile);
  }

  /**
   * Get conversation history with smart summarization for long contexts
   */
  async getConversationHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await userMemory.get(`${userId}-conversation`) || [];
      const fullHistory = Array.isArray(history) ? history : [];
      
      // If history is too long, summarize older messages
      if (fullHistory.length > limit * 2) {
        const recentMessages = fullHistory.slice(-limit);
        const olderMessages = fullHistory.slice(0, -limit);
        
        // Summarize older messages using LLM
        const summary = await llmService.summarizeConversation(olderMessages, limit);
        
        // Return summary + recent messages
        return [
          {
            type: 'system',
            message: `Previous conversation summary: ${summary.summary}`,
            timestamp: summary.timestamp,
            summary: true,
          },
          ...recentMessages,
        ];
      }
      
      return fullHistory.slice(-limit);
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Get user preferences (public API)
   */
  async getUserPreferences(userId: string): Promise<UserVoicePreferences> {
    return this.getUserVoicePreferences(userId);
  }

  /**
   * Update user preferences (public API)
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserVoicePreferences>
  ): Promise<void> {
    await this.saveUserPreferences(userId, preferences);
  }

  /**
   * Stream audio response (for real-time audio streaming)
   * Accepts Express Response or any WritableStream
   */
  async streamAudio(
    text: string,
    voiceId: string,
    responseStream: { write: (chunk: any) => boolean; end: () => void; destroyed?: boolean; writable?: boolean }
  ): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('ElevenLabs client not initialized');
      }

      // Get voice settings
      const voiceSettings: VoiceSettings = {
        voiceId: voiceId || this.DEFAULT_VOICE_ID,
        modelId: this.DEFAULT_MODEL,
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5,
        useSpeakerBoost: true,
      };

      // Use ElevenLabs streaming API
      const audioStream = await this.client.textToSpeech.convert(voiceSettings.voiceId, {
        text: text,
        modelId: voiceSettings.modelId,
        voiceSettings: {
          stability: voiceSettings.stability,
          similarityBoost: voiceSettings.similarityBoost,
          style: voiceSettings.style,
          useSpeakerBoost: voiceSettings.useSpeakerBoost,
        },
      });

      // Stream chunks directly to response
      for await (const chunk of audioStream) {
        // Check if stream is still writable (handle both Express Response and generic streams)
        const isWritable = responseStream.writable !== false && 
                          (responseStream.destroyed === undefined || !responseStream.destroyed);
        
        if (!isWritable) {
          break;
        }
        
        try {
          responseStream.write(chunk);
        } catch (writeError) {
          console.warn('Error writing chunk to stream:', writeError);
          break;
        }
      }

      responseStream.end();
    } catch (error) {
      console.error('Stream audio error:', error);
      // Try to close the stream if there's an error
      try {
        if (typeof responseStream.end === 'function') {
          responseStream.end();
        }
      } catch {
        // Ignore errors when closing stream
      }
      throw error;
    }
  }

  /**
   * Generate audio buffer for streaming (non-streaming version)
   */
  async generateStreamingAudio(text: string, voiceId: string): Promise<Buffer> {
    const voiceSettings: VoiceSettings = {
      voiceId: voiceId || this.DEFAULT_VOICE_ID,
      modelId: this.DEFAULT_MODEL,
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.5,
      useSpeakerBoost: true,
    };

    return this.generateSpeechWithRetry(text, voiceSettings);
  }

  /**
   * End conversation and clean up
   */
  async endConversation(conversationId: string, userId?: string): Promise<void> {
    try {
      if (userId) {
        await vultrValkey.delete(`conversation:${userId}`);
        await vultrValkey.delete(`conversation:${conversationId}:settings`);
      }
      // ElevenLabs conversations are stateless, no cleanup needed
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }

  /**
   * Utility: Hash audio stream for deduplication
   */
  private hashAudio(audioStream: Buffer | ArrayBuffer): string {
    const buffer = audioStream instanceof Buffer 
      ? audioStream 
      : Buffer.from(new Uint8Array(audioStream));
    
    // Use first 1KB + last 1KB + length for fast hashing
    const sample = Buffer.concat([
      buffer.slice(0, Math.min(1024, buffer.length)),
      buffer.slice(Math.max(0, buffer.length - 1024)),
      Buffer.from(buffer.length.toString()),
    ]);
    
    return createHash('sha256').update(sample).digest('hex').substring(0, 16);
  }

  /**
   * Utility: Sleep function for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const voiceAssistant = new VoiceAssistant();