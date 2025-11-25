/**
 * ElevenLabs Voice Assistant Service
 * Enhanced with LLM-powered intent extraction, response generation, and Whisper STT
 * Handles voice conversation and speech processing
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../config/env.js';
import { userMemory, orderSQL, productBuckets, styleInference } from '../lib/raindrop-config.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { ttsService } from './TTSService.js';
import { aiDataFlowOrchestrator, AIRequest } from './AIDataFlowOrchestrator.js';
import { conversationMemoryOptimizer, ConversationMessage } from './ConversationMemoryOptimizer.js';
import { llmService } from './LLMService.js';
import { sttService } from './STTService.js';
import { productRecommendationAPI } from './ProductRecommendationAPI.js';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import {
  AppError,
  ValidationError,
  ExternalServiceError,
  ServiceUnavailableError,
  CacheError,
  CacheConnectionError,
  toAppError,
  isAppError,
  type ErrorDetails,
} from '../lib/errors.js';

/**
 * Voice-specific error classes
 */
export class VoiceServiceError extends ExternalServiceError {
  constructor(message: string, originalError?: Error, details?: ErrorDetails) {
    super('VoiceService', message, originalError, {
      ...details,
      serviceType: 'voice-assistant',
    });
  }
}

export class TranscriptionError extends VoiceServiceError {
  constructor(message: string = 'Failed to transcribe audio input', originalError?: Error, details?: ErrorDetails) {
    super(message, originalError, { ...details, operation: 'transcription' });
  }
}

export class TTSGenerationError extends VoiceServiceError {
  constructor(message: string = 'Failed to generate speech', originalError?: Error, details?: ErrorDetails) {
    super(message, originalError, { ...details, operation: 'text-to-speech' });
  }
}

export class ConversationStateError extends ValidationError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, { ...details, operation: 'conversation-state' });
  }
}

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
  emotion?: 'empathetic' | 'energetic' | 'reassuring' | 'playful' | 'professional';
  context?: 'support' | 'shopping' | 'advice' | 'confirmation';
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

export interface UserProfile {
  userId: string;
  voicePreference?: string;
  sizePreferences?: Record<string, string>;
  preferences?: {
    favoriteColors?: string[];
    preferredStyles?: string[];
    preferredBrands?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IntentAnalysis {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  context?: Record<string, any>;
  emotion?: 'empathetic' | 'energetic' | 'reassuring' | 'playful' | 'professional';
  requiresFollowUp?: boolean;
  suggestedActions?: string[];
}

export class VoiceAssistant {
  private client: ElevenLabsClient | null;
  private apiKey: string | null;
  private readonly DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
  private readonly DEFAULT_MODEL = 'eleven_multilingual_v2';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms
  
  // Data validation constants
  private readonly MAX_TEXT_LENGTH = 5000;
  private readonly MAX_PREFERENCE_ITEMS = 100;
  private readonly VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46', '48', '50'];
  private readonly VALID_VOICE_IDS = [
    '21m00Tcm4TlvDq8ikWAM', // Rachel
    'ThT5KcBeYPX3keUQqHPh', // George
    'EXAVITQu4vr4xnSDxMaL', // Bella
    'ErXwobaYiN019PkySvjV', // Antoni
    'MF3mGyEYCl7XYWbV9V6O', // Elli
    'TxGEqnHWrfWFTfGW9XjX', // Josh
    'VR6AewLTigWG4xSOukaG', // Arnold
    'pNInz6obpgDQGcFmaJgB', // Adam
    'yoZ06aMxZJJ28mfd3POQ', // Sam
  ];

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
      const appError = toAppError(error);
      console.error('❌ Failed to initialize ElevenLabs client:', {
        error: appError.message,
        code: appError.code,
        details: appError.details,
      });
      this.client = null;
      // Don't throw - allow service to operate with fallbacks
    }
  }

  /**
   * Start a new voice conversation with enhanced settings
   */
  async startConversation(userId: string): Promise<ConversationState> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new ValidationError('Invalid userId: must be a non-empty string', {
          field: 'userId',
          value: userId,
        });
      }

      const sanitizedUserId = userId.trim();

      // Get user voice profile and preferences from SmartMemory
      let userProfile: UserProfile | null = null;
      try {
        userProfile = await this.getOrCreateUserProfile(sanitizedUserId);
      } catch (error) {
        const appError = toAppError(error);
        console.warn('Failed to get/create user profile, continuing with defaults:', {
          userId: sanitizedUserId,
          error: appError.message,
        });
        userProfile = null;
      }
      
      // Get user voice preferences
      let preferences: UserVoicePreferences = {};
      try {
        preferences = await this.getUserVoicePreferences(sanitizedUserId);
      } catch (error) {
        const appError = toAppError(error);
        console.warn('Failed to get user voice preferences, using defaults:', {
          userId: sanitizedUserId,
          error: appError.message,
        });
        preferences = {};
      }
      
      // Determine voice settings from user preferences (with validation)
      const voiceSettings = this.validateVoiceSettings({
        voiceId: preferences.voicePreference || userProfile?.voicePreference || this.DEFAULT_VOICE_ID,
        modelId: this.DEFAULT_MODEL,
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5,
        useSpeakerBoost: true,
      });

      // Create conversation ID
      const conversationId = `conv_${sanitizedUserId}_${Date.now()}`;
      
      // Store voice settings for this conversation in cache
      try {
        if (this.client) {
          await vultrValkey.set(
            `conversation:${conversationId}:settings`,
            voiceSettings,
            3600 // 1 hour TTL
          );
        }
      } catch (error) {
        const appError = toAppError(error);
        if (appError instanceof CacheConnectionError || appError instanceof CacheError) {
          console.warn('Failed to cache voice settings, continuing without cache:', appError.message);
        } else {
          throw new CacheError('Failed to store conversation voice settings', error as Error, {
            conversationId,
            operation: 'cache-voice-settings',
          });
        }
      }

      const state: ConversationState = {
        conversationId,
        userId: sanitizedUserId,
        context: {
          sessionStart: Date.now(),
          messageCount: 0,
        },
        voiceSettings,
        preferences,
      };

      // Cache conversation state in Valkey for fast access
      try {
        await vultrValkey.set(
          `conversation:${sanitizedUserId}`,
          state,
          3600 // 1 hour TTL
        );
      } catch (error) {
        const appError = toAppError(error);
        if (appError instanceof CacheConnectionError || appError instanceof CacheError) {
          console.warn('Failed to cache conversation state, continuing without cache:', appError.message);
        } else {
          throw new CacheError('Failed to store conversation state', error as Error, {
            userId: sanitizedUserId,
            conversationId,
            operation: 'cache-conversation-state',
          });
        }
      }

      return state;
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      
      const appError = toAppError(error);
      throw new VoiceServiceError(
        'Failed to start conversation',
        error as Error,
        {
          userId,
          operation: 'start-conversation',
        }
      );
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
    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') {
      throw new ValidationError('Invalid conversationId: must be a non-empty string', {
        field: 'conversationId',
        value: conversationId,
      });
    }

    if (!audioStream || (audioStream instanceof Buffer && audioStream.length === 0) || 
        (audioStream instanceof ArrayBuffer && audioStream.byteLength === 0)) {
      throw new ValidationError('Invalid audioStream: must be a non-empty buffer or ArrayBuffer', {
        field: 'audioStream',
        operation: 'process-voice-input',
      });
    }

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
      const appError = toAppError(error);
      console.warn('Orchestrator failed, falling back to direct processing:', {
        error: appError.message,
        code: appError.code,
        conversationId,
        userId,
      });
      
      try {
        return await this.processVoiceInputInternal(conversationId, audioStream, userId);
      } catch (fallbackError) {
        // If fallback also fails, throw the original orchestrator error wrapped properly
        throw new VoiceServiceError(
          'Voice processing failed through both orchestrator and direct processing',
          error as Error,
          {
            conversationId,
            userId,
            originalOrchestratorError: appError.message,
            fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            operation: 'process-voice-input',
          }
        );
      }
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
    let lastError: AppError | null = null;
    
    // Retry logic for processing
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
    try {
      // Convert audio to text (speech-to-text) using enhanced STT service
      let sttResult: STTResult;
      let contextPrompt: string | undefined;
      
      try {
        contextPrompt = userId ? await this.getContextPrompt(userId) : undefined;
      } catch (error) {
        // Non-critical, continue without context prompt
        console.warn('Failed to get context prompt, continuing without it:', {
          userId,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        contextPrompt = undefined;
      }

      try {
        sttResult = await sttService.transcribe(audioStream, {
          prompt: contextPrompt,
        });
      } catch (error) {
        const appError = toAppError(error);
        throw new TranscriptionError(
          `Speech-to-text transcription failed: ${appError.message}`,
          error as Error,
          {
            attempt: attempt + 1,
            conversationId,
            userId,
            audioLength: audioStream instanceof Buffer ? audioStream.length : audioStream.byteLength,
          }
        );
      }

      if (!sttResult || !sttResult.text) {
        throw new TranscriptionError(
          'STT service returned empty transcription',
          undefined,
          {
            attempt: attempt + 1,
            conversationId,
            userId,
            sttSource: sttResult?.source,
          }
        );
      }

      // Validate and sanitize transcribed text
      let textQuery: string;
      try {
        textQuery = this.sanitizeText(sttResult.text);
      } catch (error) {
        throw new TranscriptionError(
          'Transcribed text validation failed',
          error as Error,
          {
            attempt: attempt + 1,
            conversationId,
            userId,
            rawText: sttResult.text?.substring(0, 100), // Log first 100 chars
            sttSource: sttResult.source,
          }
        );
      }

      // Skip if transcription failed
      if (!textQuery || textQuery === '[Audio transcription needed - please configure STT service]') {
        throw new TranscriptionError(
          'STT service not properly configured or returned placeholder text',
          undefined,
          {
            attempt: attempt + 1,
            conversationId,
            userId,
            rawText: sttResult.text,
            sttSource: sttResult.source,
          }
        );
      }

      // Get conversation state and user profile
      let state: ConversationState | null = null;
      let userProfile: any = null;
      
      if (userId) {
        try {
          [state, userProfile] = await Promise.all([
            vultrValkey.get<ConversationState>(`conversation:${userId}`).catch((error) => {
              const appError = toAppError(error);
              console.warn('Failed to get conversation state from cache:', {
                userId,
                error: appError.message,
              });
              return null;
            }),
            userMemory.get(userId).catch((error: unknown) => {
              const appError = toAppError(error);
              console.warn('Failed to get user profile from memory:', {
                userId,
                error: appError.message,
              });
              return null;
            }),
          ]);
        } catch (error) {
          const appError = toAppError(error);
          console.warn('Failed to retrieve user context, continuing without it:', {
            userId,
            error: appError.message,
          });
          state = null;
          userProfile = null;
        }
      }

      // Get conversation history for context (needed before intent extraction)
      let conversationHistory: any[] = [];
      try {
        conversationHistory = userId 
          ? await this.getConversationHistory(userId, 10)
          : [];
      } catch (error) {
        const appError = toAppError(error);
        console.warn('Failed to get conversation history, continuing without context:', {
          userId,
          error: appError.message,
        });
        conversationHistory = [];
      }

        // Enhanced intent and entity extraction using SmartInference (preferred) or LLM (fallback)
      let intentAnalysis: IntentAnalysis;
      try {
        // Try SmartInference first for better accuracy and lower latency
        try {
          if (styleInference && typeof styleInference.predict === 'function') {
            const inferenceResult = await styleInference.predict({
              utterance: textQuery,
              context: {
                conversationHistory: conversationHistory.slice(-5),
                userProfile: userProfile ? { userId: userProfile.userId, preferences: userProfile.preferences } : null,
                sessionContext: state?.context || {},
              },
              model: 'intent-analysis-model',
            });
            
            // Map SmartInference result to IntentAnalysis format
            intentAnalysis = {
              intent: inferenceResult.intent || 'general_question',
              entities: inferenceResult.entities || {},
              confidence: inferenceResult.confidence || 0.7,
              sentiment: inferenceResult.sentiment || 'neutral',
              emotion: inferenceResult.emotion || this.determineEmotionFromIntent(inferenceResult.intent, inferenceResult.sentiment),
              requiresFollowUp: inferenceResult.requiresFollowUp || false,
              suggestedActions: inferenceResult.suggestedActions || [],
              context: inferenceResult.context || {},
            };
            console.log('✅ Intent extracted via SmartInference');
          } else {
            throw new Error('SmartInference not available');
          }
        } catch (inferenceError) {
          // Fallback to LLM service
          console.warn('SmartInference failed, using LLM fallback:', inferenceError);
          const llmResult = await llmService.extractIntentAndEntities(
            textQuery,
            conversationHistory,
            userProfile
          );
          intentAnalysis = {
            ...llmResult,
            emotion: this.determineEmotionFromIntent(llmResult.intent, llmResult.sentiment),
            requiresFollowUp: this.requiresFollowUp(llmResult.intent),
            suggestedActions: this.getSuggestedActions(llmResult.intent, llmResult.entities),
          };
        }
      } catch (error) {
        const appError = toAppError(error);
        throw new ExternalServiceError(
          'IntentExtraction',
          `Failed to extract intent and entities: ${appError.message}`,
          error as Error,
          {
            textQuery: textQuery.substring(0, 100),
            conversationId,
            userId,
            attempt: attempt + 1,
          }
        );
      }
        
        // Check if user wants to save preferences
        let preferencesToSave: Partial<UserVoicePreferences> | null = null;
        try {
          preferencesToSave = this.detectPreferencesFromQuery(textQuery, intentAnalysis);
          if (preferencesToSave) {
            preferencesToSave = this.validateAndNormalizePreferences(preferencesToSave);
          }
        } catch (error) {
          const appError = toAppError(error);
          console.warn('Failed to detect/validate preferences, continuing without saving:', {
            userId,
            error: appError.message,
          });
          preferencesToSave = null;
        }

        // Generate intelligent response using LLM (with fallback)
      let responseText: string;
      try {
        responseText = await llmService.generateResponse(
          textQuery,
          intentAnalysis,
          conversationHistory,
          userProfile,
          state?.preferences
        );
        
        // Sanitize response text
        responseText = this.sanitizeText(responseText);
      } catch (error) {
        const appError = toAppError(error);
        throw new ExternalServiceError(
          'LLMService',
          `Failed to generate response: ${appError.message}`,
          error as Error,
          {
            textQuery: textQuery.substring(0, 100),
            intent: intentAnalysis.intent,
            conversationId,
            userId,
            attempt: attempt + 1,
          }
        );
      }

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
              } as UserVoicePreferences;
            }
            
            // Enhance response to confirm preference saving
            if (preferencesToSave.sizePreferences || preferencesToSave.voicePreference) {
              responseText += ' I\'ve saved that preference for you!';
            }
          } catch (prefError) {
            const appError = toAppError(prefError);
            console.warn('Failed to save user preferences:', {
              userId,
              error: appError.message,
              code: appError.code,
              preferences: Object.keys(preferencesToSave),
            });
            // Continue without saving preferences - non-critical
          }
        }

        // Get emotion-aware voice settings for TTS (with validation)
        const voiceSettings = this.getEmotionAwareVoiceSettings(
          intentAnalysis,
          state?.voiceSettings || {
            voiceId: state?.preferences?.voicePreference || this.DEFAULT_VOICE_ID,
            modelId: this.DEFAULT_MODEL,
            stability: 0.5,
            similarityBoost: 0.8,
          }
        );

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
          const appError = toAppError(ttsError);
          console.warn(`TTS attempt ${attempt + 1} failed:`, {
            error: appError.message,
            code: appError.code,
            voiceId: voiceSettings.voiceId,
            textLength: responseText.length,
          });
          
          // Only throw error on last attempt if TTS is critical
          // Otherwise continue with text-only response
          if (attempt === this.MAX_RETRIES - 1) {
            console.warn('All TTS attempts failed, continuing with text-only response');
            // Don't throw - text-only response is acceptable
          }
        // Continue with text-only response for non-critical TTS failures
      }

      // Update conversation context with enhanced metadata (with validation)
      if (userId) {
        try {
          if (state) {
            state.lastMessage = textQuery;
            state.lastResponse = responseText;
            state.context = {
              ...state.context,
              lastQuery: textQuery,
              lastIntent: intentAnalysis.intent,
              lastEntities: intentAnalysis.entities,
              timestamp: Date.now(),
              confidence: this.clamp(intentAnalysis.confidence, 0, 1),
              messageCount: Math.max(0, (state.context.messageCount || 0) + 1),
              sttSource: sttResult.source,
            };
            if (preferencesSaved && preferencesToSave) {
              const existingPrefs = state.preferences || {};
              state.preferences = this.validateAndNormalizePreferences({
                ...existingPrefs,
                ...preferencesToSave,
              }) as UserVoicePreferences;
            }
            
            // Validate state before saving
            const validatedState = this.validateConversationState(state);
            if (validatedState) {
              await vultrValkey.set(`conversation:${userId}`, validatedState, 3600);
            }
          } else {
            // Create new state if it doesn't exist (with validation)
            const newConversationId = `conv_${userId}_${Date.now()}`;
            const newState: ConversationState = {
              conversationId: newConversationId,
              userId,
              context: {
                lastQuery: textQuery,
                lastIntent: intentAnalysis.intent,
                lastEntities: intentAnalysis.entities,
                timestamp: Date.now(),
                confidence: this.clamp(intentAnalysis.confidence, 0, 1),
                messageCount: 1,
                sttSource: sttResult.source,
              },
              lastMessage: textQuery,
              lastResponse: responseText,
              preferences: preferencesToSave ? this.validateAndNormalizePreferences(preferencesToSave) as UserVoicePreferences : undefined,
            };
            
            const validatedState = this.validateConversationState(newState);
            if (validatedState) {
              await vultrValkey.set(`conversation:${userId}`, validatedState, 3600);
            }
          }
        } catch (error) {
          const appError = toAppError(error);
          if (appError instanceof CacheConnectionError || appError instanceof CacheError) {
            console.warn('Failed to update conversation state in cache, continuing:', {
              userId,
              error: appError.message,
            });
            // Non-critical - continue without caching
          } else {
            throw new CacheError(
              'Failed to update conversation state',
              error as Error,
              {
                userId,
                conversationId: state?.conversationId,
                operation: 'update-conversation-state',
              }
            );
          }
        }
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
            try {
              const optimized = await conversationMemoryOptimizer.optimizeConversation(allMessages);
              await userMemory.set(conversationKey, optimized);
            } catch (optimizationError) {
              // Fallback to simple append if optimization fails
              console.warn('Conversation optimization failed, using simple append:', {
                userId,
                error: optimizationError instanceof Error ? optimizationError.message : String(optimizationError),
              });
              await userMemory.append(conversationKey, newMessages[0]);
              await userMemory.append(conversationKey, newMessages[1]);
            }
          } else {
            await userMemory.append(conversationKey, newMessages[0]);
            await userMemory.append(conversationKey, newMessages[1]);
          }
        } catch (memoryError) {
          // Non-critical - log but continue
          const appError = toAppError(memoryError);
          console.warn('Failed to store conversation in memory:', {
            userId,
            error: appError.message,
            code: appError.code,
          });
          // Continue without storing - conversation can still work
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
        // Convert error to AppError for consistent handling
        const appError = isAppError(error) ? error : toAppError(error);
        lastError = appError;
        
        console.error(`Voice processing attempt ${attempt + 1} failed:`, {
          error: appError.message,
          code: appError.code,
          statusCode: appError.statusCode,
          details: appError.details,
          conversationId,
          userId,
          attempt: attempt + 1,
          stack: appError.stack,
        });
        
        // Check if error is retryable (only retry operational errors)
        const isRetryable = appError.isOperational && 
                           !(appError instanceof ValidationError) &&
                           attempt < this.MAX_RETRIES - 1;
        
        // Wait before retrying (exponential backoff)
        if (isRetryable) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else if (attempt < this.MAX_RETRIES - 1) {
          // Still wait for other errors (except validation)
          if (!(appError instanceof ValidationError)) {
            await this.sleep(this.RETRY_DELAY * Math.pow(2, attempt));
          }
        }
      }
    }

    // All retries failed
    if (lastError) {
      console.error('Failed to process voice input after all retries:', {
        error: lastError.message,
        code: lastError.code,
        statusCode: lastError.statusCode,
        conversationId,
        userId,
        totalAttempts: this.MAX_RETRIES,
      });
      throw lastError;
    }
    
    // Fallback error if lastError is somehow null
    throw new VoiceServiceError(
      'Failed to process voice input: all retry attempts exhausted',
      undefined,
      {
        conversationId,
        userId,
        totalAttempts: this.MAX_RETRIES,
        operation: 'process-voice-input-internal',
      }
    );
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
      // Validate and sanitize input query
      let sanitizedQuery: string;
      try {
        sanitizedQuery = this.sanitizeText(query);
      } catch (error) {
        throw new ValidationError(
          'Invalid query input: must be a non-empty string',
          {
            field: 'query',
            value: typeof query === 'string' ? query.substring(0, 100) : query,
            reason: error instanceof Error ? error.message : String(error),
          }
        );
      }

      // Get user profile and conversation state
      let userProfile: any = null;
      let state: ConversationState | null = null;
      
      if (userId) {
        try {
          [state, userProfile] = await Promise.all([
            vultrValkey.get<ConversationState>(`conversation:${userId}`).catch((error) => {
              console.warn('Failed to get conversation state from cache:', {
                userId,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            }),
            userMemory.get(userId).catch((error: unknown) => {
              console.warn('Failed to get user profile from memory:', {
                userId,
                error: error instanceof Error ? error.message : String(error),
              });
              return null;
            }),
          ]);
        } catch (error) {
          console.warn('Failed to retrieve user context, continuing without it:', {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      // Get conversation history
      let conversationHistory: any[] = [];
      try {
        conversationHistory = userId 
          ? await this.getConversationHistory(userId, 10)
          : [];
      } catch (error) {
        console.warn('Failed to get conversation history, continuing without context:', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        conversationHistory = [];
      }

      // Extract intent and entities using LLM
      let intentAnalysis: IntentAnalysis;
      try {
        intentAnalysis = await llmService.extractIntentAndEntities(
          sanitizedQuery,
          conversationHistory,
          userProfile
        );
      } catch (error) {
        throw new ExternalServiceError(
          'LLMService',
          `Failed to extract intent and entities: ${error instanceof Error ? error.message : String(error)}`,
          error as Error,
          {
            query: sanitizedQuery.substring(0, 100),
            userId,
            operation: 'extract-intent-entities',
          }
        );
      }

      // Generate contextual response using LLM
      let responseText: string;
      try {
        responseText = await llmService.generateResponse(
          sanitizedQuery,
          intentAnalysis,
          conversationHistory,
          userProfile,
          state?.preferences
        );
        
        // Sanitize response text
        responseText = this.sanitizeText(responseText);
      } catch (error) {
        throw new ExternalServiceError(
          'LLMService',
          `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`,
          error as Error,
          {
            query: sanitizedQuery.substring(0, 100),
            intent: intentAnalysis.intent,
            userId,
            operation: 'generate-response',
          }
        );
      }

      // Generate audio if preferred
      let responseAudio: Buffer | undefined;
      if (options?.audioPreferred) {
        try {
          const voiceId = (userProfile?.voicePreference && this.VALID_VOICE_IDS.includes(userProfile.voicePreference))
            ? userProfile.voicePreference
            : this.DEFAULT_VOICE_ID;
          const confidence = this.clamp(intentAnalysis.confidence, 0, 1);
          const stability = confidence > 0.85 ? 0.7 : 0.5;
          const similarityBoost = confidence > 0.85 ? 0.85 : 0.75;
          
          const ttsResult = await ttsService.textToSpeech(responseText, voiceId, {
            stability,
            similarityBoost,
            useCache: true,
          });
          responseAudio = ttsResult.audio;
        } catch (ttsError) {
          const appError = toAppError(ttsError);
          console.warn('TTS generation failed for text query:', {
            error: appError.message,
            code: appError.code,
            userId,
            textLength: responseText.length,
          });
          // Continue without audio - non-critical
        }
      }

      // Update conversation state (with validation)
      if (state && userId) {
        try {
          state.lastMessage = sanitizedQuery;
          state.lastResponse = responseText;
          state.context = {
            ...state.context,
            lastQuery: sanitizedQuery,
            lastIntent: intentAnalysis.intent,
            lastEntities: intentAnalysis.entities,
            timestamp: Date.now(),
            confidence: this.clamp(intentAnalysis.confidence, 0, 1),
          };
          
          const validatedState = this.validateConversationState(state);
          if (validatedState) {
            await vultrValkey.set(`conversation:${userId}`, validatedState, 3600);
          }
        } catch (error) {
          const appError = toAppError(error);
          if (appError instanceof CacheConnectionError || appError instanceof CacheError) {
            console.warn('Failed to update conversation state in cache:', {
              userId,
              error: appError.message,
            });
            // Non-critical - continue without caching
          } else {
            throw new CacheError(
              'Failed to update conversation state',
              error as Error,
              {
                userId,
                conversationId: state?.conversationId,
                operation: 'update-conversation-state',
              }
            );
          }
        }
      }

      return {
        text: responseText,
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        audio: responseAudio,
      };
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      
      const appError = toAppError(error);
      throw new VoiceServiceError(
        `Failed to process text query: ${appError.message}`,
        error as Error,
        {
          userId,
          query: typeof query === 'string' ? query.substring(0, 100) : query,
          operation: 'process-text-query',
        }
      );
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
    // Validate inputs
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Invalid text for TTS: must be a non-empty string', {
        field: 'text',
        operation: 'generate-speech',
      });
    }

    const MAX_TEXT_LENGTH = 5000;
    const sanitizedText = text.trim().substring(0, MAX_TEXT_LENGTH);
    const validatedSettings = this.validateVoiceSettings(voiceSettings);

    try {
      // Use enhanced TTS service with fallback chain and caching
      // The service handles: cache → local TTS → ElevenLabs (direct API preferred, SDK fallback)
      const ttsResult = await ttsService.textToSpeech(sanitizedText, validatedSettings.voiceId, {
        stability: validatedSettings.stability,
        similarityBoost: validatedSettings.similarityBoost,
        useCache: true, // Enable caching for better performance
      });
      
      if (!ttsResult || !ttsResult.audio || ttsResult.audio.length === 0) {
        throw new TTSGenerationError(
          'TTS service returned empty audio',
          undefined,
          {
            voiceId: validatedSettings.voiceId,
            textLength: sanitizedText.length,
            source: ttsResult?.source,
          }
        );
      }
      
      console.log(`✅ TTS generated via ${ttsResult.source}`);
      return ttsResult.audio;
    } catch (error) {
      const appError = toAppError(error);
      
      // If TTS service fails completely, try direct ElevenLabs SDK as last resort
      if (this.client && attempt === 0) {
        console.warn('TTS service failed, trying direct ElevenLabs SDK as last resort:', {
          error: appError.message,
          code: appError.code,
        });
        
        try {
          if (!this.apiKey) {
            throw new ServiceUnavailableError(
              'ElevenLabs',
              'API key not configured, cannot use direct SDK fallback'
            );
          }

          const audioResponse = await this.client.textToSpeech.convert(validatedSettings.voiceId, {
            text: sanitizedText,
            modelId: validatedSettings.modelId,
            voiceSettings: {
              stability: validatedSettings.stability,
              similarityBoost: validatedSettings.similarityBoost,
              style: validatedSettings.style,
              useSpeakerBoost: validatedSettings.useSpeakerBoost,
            },
          });

          // Convert ReadableStream to buffer
          const chunks: Uint8Array[] = [];
          try {
            const nodeStream = Readable.fromWeb(audioResponse as any);
            for await (const chunk of nodeStream) {
              chunks.push(chunk);
            }
            
            if (chunks.length === 0) {
              throw new TTSGenerationError(
                'Direct SDK returned empty audio stream',
                undefined,
                {
                  voiceId: validatedSettings.voiceId,
                  textLength: sanitizedText.length,
                }
              );
            }
            
            return Buffer.concat(chunks);
          } catch (streamError) {
            throw new TTSGenerationError(
              `Failed to convert audio stream to buffer: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
              streamError as Error,
              {
                voiceId: validatedSettings.voiceId,
                operation: 'stream-conversion',
              }
            );
          }
        } catch (sdkError) {
          const sdkAppError = toAppError(sdkError);
          console.error('Direct ElevenLabs SDK also failed:', {
            error: sdkAppError.message,
            code: sdkAppError.code,
            originalError: appError.message,
          });
          
          // Wrap both errors
          throw new TTSGenerationError(
            `Both TTS service and direct SDK failed. TTS Service: ${appError.message}. SDK: ${sdkAppError.message}`,
            error as Error,
            {
              voiceId: validatedSettings.voiceId,
              ttsServiceError: appError.message,
              sdkError: sdkAppError.message,
              attempt,
            }
          );
        }
      }
      
      // If no fallback available or fallback also failed, throw TTS error
      throw new TTSGenerationError(
        `TTS generation failed: ${appError.message}`,
        error as Error,
        {
          voiceId: validatedSettings.voiceId,
          textLength: sanitizedText.length,
          attempt,
          hasSDKFallback: !!this.client,
        }
      );
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
      const appError = toAppError(error);
      
      // Check if it's a cache/memory error - might be recoverable
      if (appError instanceof CacheConnectionError || appError instanceof CacheError) {
        console.error('Failed to save user preferences due to cache/memory error:', {
          userId,
          error: appError.message,
          code: appError.code,
          preferences: Object.keys(preferences),
        });
        throw new CacheError(
          'Failed to save user preferences: cache/memory unavailable',
          error as Error,
          {
            userId,
            operation: 'save-preferences',
            preferences: Object.keys(preferences),
          }
        );
      }
      
      console.error('Failed to save user preferences:', {
        userId,
        error: appError.message,
        code: appError.code,
        details: appError.details,
      });
      
      if (isAppError(error)) {
        throw error;
      }
      
      throw new VoiceServiceError(
        `Failed to save user preferences: ${appError.message}`,
        error as Error,
        {
          userId,
          preferences: Object.keys(preferences),
          operation: 'save-preferences',
        }
      );
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
      const appError = toAppError(error);
      console.warn('Failed to get user voice preferences, returning empty preferences:', {
        userId,
        error: appError.message,
        code: appError.code,
      });
      // Return empty preferences as fallback - non-critical
      return {};
    }
  }

  /**
   * Get or create user profile (with validation)
   */
  private async getOrCreateUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        console.error('Invalid userId provided to getOrCreateUserProfile');
        return null;
      }
      
      let profile = await userMemory.get(userId) as UserProfile | null;
      if (!profile) {
        profile = {
          userId: userId.trim(),
          createdAt: new Date().toISOString(),
        };
        try {
          await userMemory.set(userId, profile);
        } catch (setError) {
          const appError = toAppError(setError);
          console.warn('Failed to save new user profile to memory:', {
            userId,
            error: appError.message,
          });
          // Still return the profile even if saving fails
        }
      }
      
      // Validate and normalize profile data
      if (profile && profile.voicePreference && !this.isValidVoiceId(profile.voicePreference)) {
        console.warn(`Invalid voice preference in profile for user ${userId}, removing`);
        delete profile.voicePreference;
      }
      
      return profile;
    } catch (error) {
      const appError = toAppError(error);
      console.error('Failed to get/create user profile:', {
        userId,
        error: appError.message,
        code: appError.code,
      });
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
      const appError = toAppError(error);
      console.warn('Failed to get conversation history, returning empty array:', {
        userId,
        limit,
        error: appError.message,
        code: appError.code,
      });
      // Return empty array as fallback - non-critical
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
      // Validate inputs
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new ValidationError('Invalid text for streaming: must be a non-empty string', {
          field: 'text',
          operation: 'stream-audio',
        });
      }

      if (!responseStream || typeof responseStream.write !== 'function' || typeof responseStream.end !== 'function') {
        throw new ValidationError('Invalid response stream: must have write() and end() methods', {
          field: 'responseStream',
          operation: 'stream-audio',
        });
      }

      if (!this.client) {
        throw new ServiceUnavailableError(
          'ElevenLabs',
          'ElevenLabs client not initialized. Voice streaming unavailable.'
        );
      }

      if (!this.apiKey) {
        throw new ServiceUnavailableError(
          'ElevenLabs',
          'ElevenLabs API key not configured. Voice streaming unavailable.'
        );
      }

      // Validate and sanitize text
      const sanitizedText = this.sanitizeText(text).substring(0, this.MAX_TEXT_LENGTH);
      
      // Get voice settings (with validation)
      const voiceSettings = this.validateVoiceSettings({
        voiceId: voiceId || this.DEFAULT_VOICE_ID,
        modelId: this.DEFAULT_MODEL,
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.5,
        useSpeakerBoost: true,
      });

      // Use ElevenLabs streaming API
      let audioStream: ReadableStream<Uint8Array>;
      try {
        audioStream = await this.client.textToSpeech.convert(voiceSettings.voiceId, {
          text: sanitizedText,
          modelId: voiceSettings.modelId,
          voiceSettings: {
            stability: voiceSettings.stability,
            similarityBoost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            useSpeakerBoost: voiceSettings.useSpeakerBoost,
          },
        });
      } catch (error) {
        throw new TTSGenerationError(
          `Failed to initiate audio stream from ElevenLabs: ${error instanceof Error ? error.message : String(error)}`,
          error as Error,
          {
            voiceId: voiceSettings.voiceId,
            textLength: sanitizedText.length,
            operation: 'stream-init',
          }
        );
      }

      // Convert ReadableStream to Node.js stream and pipe to response
      try {
        const nodeStream = Readable.fromWeb(audioStream as any);
        let bytesStreamed = 0;
        
        for await (const chunk of nodeStream) {
          // Check if stream is still writable (handle both Express Response and generic streams)
          const isWritable = responseStream.writable !== false && 
                            (responseStream.destroyed === undefined || !responseStream.destroyed);
          
          if (!isWritable) {
            console.warn('Response stream is no longer writable, stopping audio stream');
            break;
          }
          
          try {
            const writeSuccess = responseStream.write(chunk);
            if (!writeSuccess) {
              // Backpressure - wait for drain event would be ideal, but for simplicity we continue
              console.warn('Stream backpressure detected');
            }
            bytesStreamed += chunk.length || 0;
          } catch (writeError) {
            const appError = toAppError(writeError);
            console.warn('Error writing chunk to stream:', {
              error: appError.message,
              bytesStreamed,
            });
            break;
          }
        }

        // Successfully completed streaming
        responseStream.end();
        console.log(`✅ Audio streamed successfully: ${bytesStreamed} bytes`);
      } catch (streamError) {
        const appError = toAppError(streamError);
        throw new TTSGenerationError(
          `Failed to stream audio chunks: ${appError.message}`,
          streamError as Error,
          {
            voiceId: voiceSettings.voiceId,
            operation: 'stream-write',
          }
        );
      }
    } catch (error) {
      const appError = isAppError(error) ? error : toAppError(error);
      
      console.error('Stream audio error:', {
        error: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        details: appError.details,
      });
      
      // Try to close the stream if there's an error
      try {
        if (typeof responseStream.end === 'function' && 
            responseStream.destroyed !== true &&
            responseStream.writable !== false) {
          responseStream.end();
        }
      } catch (closeError) {
        // Ignore errors when closing stream - already in error state
        console.warn('Error closing stream after error:', {
          closeError: closeError instanceof Error ? closeError.message : String(closeError),
          originalError: appError.message,
        });
      }
      
      // Re-throw as appropriate error type
      if (isAppError(error)) {
        throw error;
      }
      
      throw new VoiceServiceError(
        `Failed to stream audio: ${appError.message}`,
        error as Error,
        {
          voiceId,
          textLength: typeof text === 'string' ? text.length : 0,
          operation: 'stream-audio',
        }
      );
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
        try {
          await vultrValkey.delete(`conversation:${userId}`);
        } catch (error) {
          const appError = toAppError(error);
          console.warn('Failed to delete conversation state from cache:', {
            userId,
            error: appError.message,
          });
          // Continue - non-critical cleanup operation
        }
        
        try {
          await vultrValkey.delete(`conversation:${conversationId}:settings`);
        } catch (error) {
          const appError = toAppError(error);
          console.warn('Failed to delete conversation settings from cache:', {
            conversationId,
            userId,
            error: appError.message,
          });
          // Continue - non-critical cleanup operation
        }
      }
      // ElevenLabs conversations are stateless, no cleanup needed
    } catch (error) {
      const appError = toAppError(error);
      console.warn('Failed to end conversation (non-critical):', {
        conversationId,
        userId,
        error: appError.message,
        code: appError.code,
      });
      // Don't throw - cleanup failures are non-critical
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

  /**
   * Data validation and sanitization utilities
   */
  
  /**
   * Sanitize and validate user input text
   */
  private sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input: must be a non-empty string');
    }
    
    // Trim whitespace
    let sanitized = text.trim();
    
    // Check length
    if (sanitized.length === 0) {
      throw new Error('Text input cannot be empty');
    }
    
    const MAX_TEXT_LENGTH = 5000;
    if (sanitized.length > MAX_TEXT_LENGTH) {
      console.warn(`Text input truncated from ${sanitized.length} to ${MAX_TEXT_LENGTH} characters`);
      sanitized = sanitized.substring(0, MAX_TEXT_LENGTH);
    }
    
    // Remove control characters but preserve newlines and tabs
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized;
  }

  /**
   * Clamp number between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Validate voice ID
   */
  private isValidVoiceId(voiceId: string): boolean {
    return this.VALID_VOICE_IDS.includes(voiceId);
  }

  /**
   * Validate and normalize voice settings
   */
  private validateVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
    const validated: VoiceSettings = {
      voiceId: settings.voiceId || this.DEFAULT_VOICE_ID,
      modelId: settings.modelId || this.DEFAULT_MODEL,
      stability: this.clamp(settings.stability ?? 0.5, 0, 1),
      similarityBoost: this.clamp(settings.similarityBoost ?? 0.8, 0, 1),
      style: settings.style !== undefined ? this.clamp(settings.style, 0, 1) : 0.5,
      useSpeakerBoost: settings.useSpeakerBoost ?? true,
    };
    
    // Validate voice ID
    if (!this.VALID_VOICE_IDS.includes(validated.voiceId)) {
      console.warn(`Invalid voice ID ${validated.voiceId}, using default`);
      validated.voiceId = this.DEFAULT_VOICE_ID;
    }
    
    return validated;
  }

  /**
   * Validate and normalize user preferences
   */
  private validateAndNormalizePreferences(
    preferences: Partial<UserVoicePreferences>
  ): Partial<UserVoicePreferences> {
    const validated: Partial<UserVoicePreferences> = {};
    const MAX_PREFERENCE_ITEMS = 100;
    
    // Validate voice preference
    if (preferences.voicePreference) {
      if (typeof preferences.voicePreference === 'string' && this.VALID_VOICE_IDS.includes(preferences.voicePreference)) {
        validated.voicePreference = preferences.voicePreference;
      } else {
        console.warn(`Invalid voice preference: ${preferences.voicePreference}`);
      }
    }
    
    // Validate and normalize size preferences
    if (preferences.sizePreferences && typeof preferences.sizePreferences === 'object') {
      const normalizedSizes: Record<string, string> = {};
      for (const [brand, size] of Object.entries(preferences.sizePreferences)) {
        if (typeof size === 'string' && size.trim()) {
          normalizedSizes[brand] = size.trim().toUpperCase();
        }
      }
      if (Object.keys(normalizedSizes).length > 0) {
        validated.sizePreferences = normalizedSizes;
      }
    }
    
    // Validate and normalize color preferences
    if (preferences.colorPreferences && Array.isArray(preferences.colorPreferences)) {
      const normalizedColors = preferences.colorPreferences
        .filter((color): color is string => typeof color === 'string' && color.trim().length > 0)
        .map(color => color.trim().toLowerCase())
        .filter((color, index, arr) => arr.indexOf(color) === index) // Remove duplicates
        .slice(0, MAX_PREFERENCE_ITEMS);
      
      if (normalizedColors.length > 0) {
        validated.colorPreferences = normalizedColors;
      }
    }
    
    // Validate and normalize style preferences
    if (preferences.stylePreferences && Array.isArray(preferences.stylePreferences)) {
      const normalizedStyles = preferences.stylePreferences
        .filter((style): style is string => typeof style === 'string' && style.trim().length > 0)
        .map(style => style.trim().toLowerCase())
        .filter((style, index, arr) => arr.indexOf(style) === index) // Remove duplicates
        .slice(0, MAX_PREFERENCE_ITEMS);
      
      if (normalizedStyles.length > 0) {
        validated.stylePreferences = normalizedStyles;
      }
    }
    
    // Validate and normalize brand preferences
    if (preferences.brandPreferences && Array.isArray(preferences.brandPreferences)) {
      const normalizedBrands = preferences.brandPreferences
        .filter((brand): brand is string => typeof brand === 'string' && brand.trim().length > 0)
        .map(brand => brand.trim())
        .filter((brand, index, arr) => arr.indexOf(brand) === index) // Remove duplicates
        .slice(0, MAX_PREFERENCE_ITEMS);
      
      if (normalizedBrands.length > 0) {
        validated.brandPreferences = normalizedBrands;
      }
    }
    
    return validated;
  }

  /**
   * Validate conversation state
   */
  private validateConversationState(state: Partial<ConversationState>): ConversationState | null {
    if (!state || !state.conversationId || !state.userId) {
      return null;
    }
    
    return {
      conversationId: String(state.conversationId),
      userId: String(state.userId),
      context: state.context || {},
      lastMessage: state.lastMessage ? this.sanitizeText(state.lastMessage) : undefined,
      lastResponse: state.lastResponse ? this.sanitizeText(state.lastResponse) : undefined,
      voiceSettings: state.voiceSettings ? this.validateVoiceSettings(state.voiceSettings) : undefined,
      preferences: state.preferences ? this.validateAndNormalizePreferences(state.preferences) as UserVoicePreferences : undefined,
    };
  }
}

export const voiceAssistant = new VoiceAssistant();