/**
 * LLM Service for AI-powered intent extraction and response generation
 * Uses OpenAI GPT models for natural language understanding and generation
 */

import OpenAI from 'openai';
import env from '../config/env.js';

export interface IntentAnalysis {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  context?: Record<string, any>;
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  userPreferences?: Record<string, any>;
  timestamp: number;
}

export class LLMService {
  private client: OpenAI | null = null;
  private readonly DEFAULT_MODEL = 'gpt-4o-mini'; // Fast and cost-effective
  private readonly FALLBACK_MODEL = 'gpt-3.5-turbo';
  private readonly MAX_TOKENS = 500;
  private readonly MAX_CONTEXT_MESSAGES = 20;

  constructor() {
    const apiKey = env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        this.client = new OpenAI({
          apiKey: apiKey,
        });
        console.log('✅ OpenAI LLM client initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize OpenAI client:', error);
        this.client = null;
      }
    } else {
      console.warn('⚠️ OPENAI_API_KEY not found, LLM features will use fallback methods');
    }
  }

  /**
   * Extract intent and entities using LLM
   * Falls back to keyword matching if LLM is unavailable
   */
  async extractIntentAndEntities(
    text: string,
    conversationHistory?: any[],
    userProfile?: any
  ): Promise<IntentAnalysis> {
    if (!this.client) {
      return this.fallbackIntentExtraction(text);
    }

    try {
      const systemPrompt = `You are an AI assistant for a fashion e-commerce platform. Analyze user queries and extract:
1. Intent (one of: search_product, get_recommendations, ask_about_size, check_availability, add_to_cart, get_style_advice, return_product, track_order, save_preference, general_question)
2. Entities: color, category, size, brand, occasion, priceRange, style
3. Sentiment: positive, neutral, or negative
4. Confidence score (0-1)

Respond with valid JSON only:
{
  "intent": "string",
  "entities": { "color": "string", "category": "string", "size": "string", "brand": "string", "occasion": "string", "priceRange": { "min": number, "max": number } },
  "confidence": number,
  "sentiment": "positive|neutral|negative"
}`;

      const userContext = conversationHistory 
        ? `Previous conversation context:\n${conversationHistory.slice(-3).map((m: any) => `${m.type}: ${m.message}`).join('\n')}`
        : '';

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${userContext}\n\nUser query: "${text}"` }
        ],
        temperature: 0.3,
        max_tokens: this.MAX_TOKENS,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      const parsed = JSON.parse(content);
      return {
        intent: parsed.intent || 'general_question',
        entities: parsed.entities || {},
        confidence: Math.min(0.95, Math.max(0.5, parsed.confidence || 0.7)),
        sentiment: parsed.sentiment || 'neutral',
        context: parsed.context,
      };
    } catch (error) {
      console.warn('LLM intent extraction failed, using fallback:', error);
      return this.fallbackIntentExtraction(text);
    }
  }

  /**
   * Generate contextual response using LLM
   * Falls back to rule-based responses if LLM is unavailable
   */
  async generateResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    conversationHistory: any[],
    userProfile?: any,
    preferences?: any
  ): Promise<string> {
    if (!this.client) {
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }

    try {
      const systemPrompt = `You are a friendly and helpful fashion shopping assistant named Style Shepherd. 
Your personality:
- Warm, conversational, and enthusiastic about fashion
- Proactive in offering style advice
- Remember user preferences and reference them naturally
- Keep responses concise (1-2 sentences for voice, 2-3 for text)
- Use the user's name when available
- Be helpful but not pushy

User profile: ${userProfile ? JSON.stringify(userProfile).substring(0, 200) : 'New user'}
User preferences: ${preferences ? JSON.stringify(preferences).substring(0, 200) : 'None yet'}`;

      // Build conversation context (last 5 messages)
      const recentHistory = conversationHistory.slice(-5);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      for (const msg of recentHistory) {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.message,
        });
      }

      // Add current query
      messages.push({
        role: 'user',
        content: query,
      });

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
      });

      const content = response.choices[0]?.message?.content;
      return content?.trim() || this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    } catch (error) {
      console.warn('LLM response generation failed, using fallback:', error);
      return this.fallbackResponse(query, intentAnalysis, userProfile, preferences);
    }
  }

  /**
   * Summarize conversation history for long contexts
   */
  async summarizeConversation(
    conversationHistory: any[],
    maxMessages: number = this.MAX_CONTEXT_MESSAGES
  ): Promise<ConversationSummary> {
    if (!this.client || conversationHistory.length <= maxMessages) {
      return {
        summary: 'Recent conversation',
        keyPoints: conversationHistory.slice(-5).map((m: any) => m.message.substring(0, 50)),
        timestamp: Date.now(),
      };
    }

    try {
      const messages = conversationHistory
        .slice(0, -maxMessages) // Messages to summarize
        .map((m: any) => `${m.type}: ${m.message}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation, extracting key points, user preferences mentioned, and important context. Return JSON: { "summary": "string", "keyPoints": ["string"], "userPreferences": {} }',
          },
          {
            role: 'user',
            content: messages,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || 'Conversation summary',
          keyPoints: parsed.keyPoints || [],
          userPreferences: parsed.userPreferences,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.warn('Conversation summarization failed:', error);
    }

    return {
      summary: 'Recent conversation',
      keyPoints: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Analyze sentiment of user query
   */
  async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (!this.client) {
      // Simple keyword-based sentiment
      const lowerText = text.toLowerCase();
      const positiveWords = ['love', 'great', 'perfect', 'amazing', 'wonderful', 'excellent', 'thanks', 'thank you'];
      const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'wrong', 'disappointed', 'frustrated', 'angry'];

      if (positiveWords.some(w => lowerText.includes(w))) return 'positive';
      if (negativeWords.some(w => lowerText.includes(w))) return 'negative';
      return 'neutral';
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the user message. Respond with only one word: "positive", "neutral", or "negative".',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const sentiment = response.choices[0]?.message?.content?.trim().toLowerCase();
      if (sentiment === 'positive' || sentiment === 'negative') {
        return sentiment;
      }
      return 'neutral';
    } catch (error) {
      console.warn('Sentiment analysis failed:', error);
      return 'neutral';
    }
  }

  /**
   * Fallback intent extraction using keyword matching
   */
  private fallbackIntentExtraction(text: string): IntentAnalysis {
    const lowerText = text.toLowerCase();
    const entities: Record<string, any> = {};
    let detectedIntent = 'general_question';
    let confidence = 0.5;

    // Intent detection
    if (lowerText.match(/\b(remember|save|store|prefer|my preference|i like|i wear)\b/i)) {
      detectedIntent = 'save_preference';
      confidence = 0.85;
    } else if (lowerText.match(/\b(find|search|show|get|looking for)\b/i)) {
      detectedIntent = 'search_product';
      confidence = 0.8;
    } else if (lowerText.match(/\b(recommend|suggest|what should|advice)\b/i)) {
      detectedIntent = 'get_recommendations';
      confidence = 0.85;
    } else if (lowerText.match(/\b(size|fit|measurement|small|medium|large)\b/i)) {
      detectedIntent = 'ask_about_size';
      confidence = 0.75;
    } else if (lowerText.match(/\b(add|cart|buy|purchase)\b/i)) {
      detectedIntent = 'add_to_cart';
      confidence = 0.8;
    } else if (lowerText.match(/\b(return|refund|exchange)\b/i)) {
      detectedIntent = 'return_product';
      confidence = 0.9;
    } else if (lowerText.match(/\b(order|track|shipping|delivery)\b/i)) {
      detectedIntent = 'track_order';
      confidence = 0.85;
    }

    // Entity extraction
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'gray', 'grey', 'navy', 'beige', 'brown'];
    const categories = ['dress', 'shirt', 'pants', 'jeans', 'jacket', 'coat', 'shoes', 'boots', 'sneakers', 'heels', 'skirt', 'top', 'blouse'];
    const occasions = ['wedding', 'party', 'casual', 'formal', 'business', 'date', 'work', 'weekend', 'vacation'];
    const sizes = ['xs', 'small', 's', 'medium', 'm', 'large', 'l', 'xl', 'xxl'];
    const brands = ['nike', 'adidas', 'zara', 'h&m', 'gucci', 'prada', 'versace', 'calvin klein', 'tommy hilfiger', 'levi\'s', 'levis'];

    for (const color of colors) {
      if (lowerText.includes(color)) {
        entities.color = color;
        break;
      }
    }

    for (const category of categories) {
      if (lowerText.includes(category)) {
        entities.category = category;
        break;
      }
    }

    for (const occasion of occasions) {
      if (lowerText.includes(occasion)) {
        entities.occasion = occasion;
        break;
      }
    }

    for (const size of sizes) {
      if (lowerText.includes(size)) {
        entities.size = size.toUpperCase();
        break;
      }
    }

    for (const brand of brands) {
      if (lowerText.includes(brand)) {
        entities.brand = brand;
        break;
      }
    }

    const priceMatch = lowerText.match(/\$?(\d+)(?:\s*-\s*\$?(\d+))?/);
    if (priceMatch) {
      entities.priceRange = {
        min: parseInt(priceMatch[1]),
        max: priceMatch[2] ? parseInt(priceMatch[2]) : undefined,
      };
    }

    return {
      intent: detectedIntent,
      entities,
      confidence: Math.min(0.95, confidence),
      sentiment: 'neutral',
    };
  }

  /**
   * Fallback response generation
   */
  private fallbackResponse(
    query: string,
    intentAnalysis: IntentAnalysis,
    userProfile?: any,
    preferences?: any
  ): string {
    const userName = userProfile?.name || userProfile?.firstName || 'there';
    const { intent, entities } = intentAnalysis;

    switch (intent) {
      case 'search_product':
        const productDesc = [];
        if (entities.color) productDesc.push(entities.color);
        if (entities.category) productDesc.push(entities.category);
        const searchDesc = productDesc.length > 0 ? productDesc.join(' ') : 'items';
        return `I'll help you find ${searchDesc}${entities.occasion ? ` for ${entities.occasion}` : ''}. Let me search our collection for you, ${userName}!`;

      case 'get_recommendations':
        const prefText = preferences?.stylePreferences?.length
          ? ` based on your preference for ${preferences.stylePreferences.join(' and ')}`
          : '';
        return `Based on your style preferences${prefText}${entities.occasion ? ` and the ${entities.occasion} occasion` : ''}, I have some great recommendations for you!`;

      case 'ask_about_size':
        return `I can help you find the perfect size! ${entities.size ? `You mentioned size ${entities.size}. ` : ''}Would you like me to check your measurements and recommend the best fit?`;

      case 'add_to_cart':
        return `Great choice! I'll add that to your cart. Would you like to continue shopping or proceed to checkout?`;

      case 'return_product':
        return `I can help you with your return. Do you have an order number, or would you like me to look up your recent orders?`;

      case 'track_order':
        return `Let me check the status of your order for you. One moment please!`;

      default:
        return `Hi ${userName}! I'm here to help you find the perfect fashion items. You can ask me to search for products, get recommendations, check sizes, or help with your orders. What would you like to explore today?`;
    }
  }

  /**
   * Check if LLM service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const llmService = new LLMService();

