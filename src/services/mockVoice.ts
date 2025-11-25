import { VoiceResponse } from '@/types/fashion';
import { productService } from './productService';
import { fashionAIEngine } from './fashionAIEngine';
import { mockAuth } from './mockAuth';

export interface VoiceIntent {
  keywords: string[];
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  brand?: string;
  color?: string;
  size?: string;
  occasion?: string;
  style?: string;
  action?: 'search' | 'filter' | 'recommend' | 'help';
}

class MockVoiceService {
  private readonly PROCESSING_DELAY = 1200;
  private readonly TTS_DELAY = 500;

  // Expanded mock transcriptions with more variety
  private readonly MOCK_TRANSCRIPTIONS = [
    "Show me some blue dresses for a summer wedding",
    "I'm looking for running shoes that won't hurt my feet",
    "What jackets do you have in my size?",
    "Find me casual shirts under $50",
    "I need a formal outfit for a wedding next month",
    "Do you have anything in red that would match my style?",
    "What's trending right now in women's fashion?",
    "Show me black leather jackets",
    "I want comfortable jeans in size 32",
    "Find me a white blazer for work",
    "What do you have in medium size?",
    "Show me summer dresses under $100",
    "I need sneakers for running",
    "What's your best selling item?",
    "Find me something for a date night",
    "I'm looking for a gift under $75",
    "Show me eco-friendly clothing options",
    "What brands do you carry?",
    "I need a winter coat",
    "Find me accessories to match this outfit",
  ];

  /**
   * Process voice command with improved intent extraction
   */
  async processVoiceCommand(
    userId: string,
    audioData: Blob,
    context: any = {}
  ): Promise<VoiceResponse> {
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, this.PROCESSING_DELAY));

      // Get mock transcription (in real app, this would use STT service)
      const transcription = this.getMockTranscription(context);
      
      // Get user profile for personalized AI response
      const currentUser = mockAuth.getCurrentUser();
      const userProfile = currentUser ? mockAuth.getUserProfile(currentUser.id) : null;
      
      // Use Fashion AI Engine for intelligent processing
      let aiResponse;
      try {
        aiResponse = await fashionAIEngine.processVoiceQuery(
          transcription,
          userProfile,
          context
        );
      } catch (error) {
        console.warn('Fashion AI Engine failed, using fallback:', error);
        aiResponse = this.generateFallbackResponse(transcription);
      }
      
      // Parse intent for product search with improved extraction
      const intent = this.parseIntent(transcription);
      
      // Build search filters from intent
      const searchFilters: any = {
        query: intent.keywords.join(' '),
      };

      if (intent.maxPrice) searchFilters.maxPrice = intent.maxPrice;
      if (intent.minPrice) searchFilters.minPrice = intent.minPrice;
      if (intent.category) searchFilters.category = intent.category;
      if (intent.brand) searchFilters.brand = intent.brand;
      if (intent.color) searchFilters.query = `${searchFilters.query} ${intent.color}`.trim();
      
      // Get relevant products
      let products = [];
      try {
        products = await productService.searchProducts(searchFilters);
      } catch (error) {
        console.warn('Product search failed:', error);
        products = [];
      }

      // Enhance response text if products found
      let responseText = aiResponse.text;
      if (products.length > 0 && intent.action === 'search') {
        responseText = this.enhanceResponseWithProducts(responseText, products.length, intent);
      } else if (products.length === 0 && intent.action === 'search') {
        responseText = this.generateNoResultsResponse(intent);
      }

      return {
        text: responseText,
        products: products.slice(0, 6), // Show more products
        confidence: aiResponse.confidence || 0.85,
      };
    } catch (error) {
      console.error('Voice command processing failed:', error);
      return {
        text: "I'm sorry, I couldn't process that request. Could you please try again?",
        products: [],
        confidence: 0,
      };
    }
  }

  /**
   * Get mock transcription (with context awareness)
   */
  private getMockTranscription(context: any): string {
    // If context has a specific query, use it
    if (context.query && typeof context.query === 'string') {
      return context.query;
    }

    // Otherwise, randomly select from mock transcriptions
    return this.MOCK_TRANSCRIPTIONS[
      Math.floor(Math.random() * this.MOCK_TRANSCRIPTIONS.length)
    ];
  }

  /**
   * Enhanced intent parsing with better extraction
   */
  private parseIntent(transcription: string): VoiceIntent {
    const lowerText = transcription.toLowerCase();
    const words = lowerText.split(/\s+/);
    const intent: VoiceIntent = {
      keywords: [],
      action: 'search',
    };

    // Product categories
    const categories = [
      'dress', 'dresses', 'shirt', 'shirts', 'blouse', 'blouses',
      'pants', 'jeans', 'trousers', 'jacket', 'jackets', 'coat', 'coats',
      'shoe', 'shoes', 'sneakers', 'boots', 'heels', 'sandals',
      'skirt', 'skirts', 'shorts', 'sweater', 'sweaters', 'hoodie', 'hoodies',
      'blazer', 'blazers', 'suit', 'suits', 'accessories', 'jewelry',
    ];

    // Extract category
    for (const category of categories) {
      if (lowerText.includes(category)) {
        intent.category = category.replace(/s$/, ''); // Remove plural
        intent.keywords.push(category);
        break;
      }
    }

    // Colors
    const colors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
      'black', 'white', 'gray', 'grey', 'brown', 'beige', 'navy',
      'maroon', 'teal', 'turquoise', 'coral', 'burgundy',
    ];

    for (const color of colors) {
      if (lowerText.includes(color)) {
        intent.color = color;
        intent.keywords.push(color);
        break;
      }
    }

    // Brands (common fashion brands)
    const brands = [
      'nike', 'adidas', 'levi', 'levis', 'zara', 'h&m', 'hm',
      'gap', 'old navy', 'calvin klein', 'tommy hilfiger',
    ];

    for (const brand of brands) {
      if (lowerText.includes(brand)) {
        intent.brand = brand;
        intent.keywords.push(brand);
        break;
      }
    }

    // Sizes
    const sizePattern = /\b(size|sized?)\s+(\w+)/i;
    const sizeMatch = transcription.match(sizePattern);
    if (sizeMatch) {
      intent.size = sizeMatch[2];
    }

    // Price extraction (improved)
    const pricePatterns = [
      /under\s+\$?(\d+)/i,
      /less\s+than\s+\$?(\d+)/i,
      /below\s+\$?(\d+)/i,
      /\$?(\d+)\s+or\s+less/i,
      /maximum\s+\$?(\d+)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = transcription.match(pattern);
      if (match) {
        intent.maxPrice = parseInt(match[1]);
        break;
      }
    }

    // Minimum price
    const minPricePattern = /(?:over|above|more than|at least)\s+\$?(\d+)/i;
    const minPriceMatch = transcription.match(minPricePattern);
    if (minPriceMatch) {
      intent.minPrice = parseInt(minPriceMatch[1]);
    }

    // Occasions
    const occasions = ['wedding', 'work', 'casual', 'formal', 'party', 'date', 'gym', 'running'];
    for (const occasion of occasions) {
      if (lowerText.includes(occasion)) {
        intent.occasion = occasion;
        intent.keywords.push(occasion);
        break;
      }
    }

    // Styles
    const styles = ['vintage', 'modern', 'classic', 'trendy', 'casual', 'formal', 'sporty'];
    for (const style of styles) {
      if (lowerText.includes(style)) {
        intent.style = style;
        intent.keywords.push(style);
        break;
      }
    }

    // Action detection
    if (lowerText.includes('show') || lowerText.includes('find') || lowerText.includes('search')) {
      intent.action = 'search';
    } else if (lowerText.includes('recommend') || lowerText.includes('suggest')) {
      intent.action = 'recommend';
    } else if (lowerText.includes('help') || lowerText.includes('what can')) {
      intent.action = 'help';
    }

    // If no keywords found, use general terms from transcription
    if (intent.keywords.length === 0) {
      intent.keywords = words.filter(w => w.length > 3).slice(0, 5);
    }

    return intent;
  }

  /**
   * Generate fallback response when AI engine fails
   */
  private generateFallbackResponse(transcription: string): { text: string; confidence: number } {
    const intent = this.parseIntent(transcription);
    const productCount = Math.floor(Math.random() * 5) + 3; // 3-7 products

    return {
      text: this.generateResponse(intent, productCount),
      confidence: 0.7,
    };
  }

  /**
   * Generate response text
   */
  private generateResponse(intent: VoiceIntent, productCount: number): string {
    const responses = [
      `I found ${productCount} items that match your style! Let me show you the best options.`,
      `Great choice! I've curated ${productCount} pieces perfect for you.`,
      `I have ${productCount} recommendations that fit your preferences.`,
      `Here are ${productCount} items I think you'll love based on your request.`,
      `Perfect! I found ${productCount} options that should work well for you.`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Enhance response with product information
   */
  private enhanceResponseWithProducts(
    baseText: string,
    productCount: number,
    intent: VoiceIntent
  ): string {
    if (productCount === 0) {
      return baseText;
    }

    const enhancements = [
      ` I found ${productCount} great options for you.`,
      ` Here are ${productCount} items that match what you're looking for.`,
      ` I've selected ${productCount} products that should work well.`,
    ];

    return baseText + enhancements[Math.floor(Math.random() * enhancements.length)];
  }

  /**
   * Generate response when no products found
   */
  private generateNoResultsResponse(intent: VoiceIntent): string {
    const responses = [
      "I couldn't find any items matching your criteria. Would you like to try a different search?",
      "I don't have anything that matches those exact requirements. Let me show you some similar options instead.",
      "Unfortunately, I couldn't find products matching that description. Would you like to browse our catalog?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  /**
   * Mock text-to-speech (returns a mock audio URL)
   */
  async textToSpeech(text: string, voiceId?: string): Promise<string> {
    try {
      await new Promise(resolve => setTimeout(resolve, this.TTS_DELAY));
      // In a real implementation, this would return an actual audio URL
      const timestamp = Date.now();
      const voice = voiceId || 'default';
      return `data:audio/mp3;base64,mock_audio_data_${voice}_${timestamp}`;
    } catch (error) {
      console.error('TTS generation failed:', error);
      throw new Error('Failed to generate speech');
    }
  }

  /**
   * Get available mock transcriptions (for testing)
   */
  getMockTranscriptions(): string[] {
    return [...this.MOCK_TRANSCRIPTIONS];
  }
}

export const mockVoiceService = new MockVoiceService();
