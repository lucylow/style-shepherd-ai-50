import { VoiceResponse } from '@/types/fashion';
import { mockProductService } from './mockProducts';

class MockVoiceService {
  async processVoiceCommand(
    userId: string,
    audioData: Blob,
    context: any = {}
  ): Promise<VoiceResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock transcription
    const mockTranscriptions = [
      "Show me some blue dresses",
      "I'm looking for running shoes",
      "What jackets do you have?",
      "Find me casual shirts under $50",
      "I need a formal outfit for a wedding",
    ];
    
    const transcription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
    
    // Parse intent from transcription
    const intent = this.parseIntent(transcription);
    
    // Get relevant products
    const products = await mockProductService.searchProducts({
      query: intent.keywords.join(' '),
      maxPrice: intent.maxPrice,
    });

    return {
      text: this.generateResponse(intent, products.length),
      products: products.slice(0, 4),
      confidence: 0.8 + Math.random() * 0.15,
    };
  }

  private parseIntent(transcription: string): {
    keywords: string[];
    maxPrice?: number;
    category?: string;
  } {
    const words = transcription.toLowerCase().split(' ');
    const keywords: string[] = [];
    let maxPrice: number | undefined;
    
    // Extract keywords
    const productKeywords = ['dress', 'shoe', 'jacket', 'shirt', 'pants', 'skirt'];
    productKeywords.forEach(keyword => {
      if (words.includes(keyword) || words.includes(keyword + 's')) {
        keywords.push(keyword);
      }
    });

    // Extract colors
    const colors = ['blue', 'red', 'black', 'white', 'green'];
    colors.forEach(color => {
      if (words.includes(color)) {
        keywords.push(color);
      }
    });

    // Extract price
    const priceMatch = transcription.match(/under \$?(\d+)/i);
    if (priceMatch) {
      maxPrice = parseInt(priceMatch[1]);
    }

    return { keywords, maxPrice };
  }

  private generateResponse(intent: any, productCount: number): string {
    const responses = [
      `I found ${productCount} items that match your style! Let me show you the best options.`,
      `Great choice! I've curated ${productCount} pieces perfect for you.`,
      `I have ${productCount} recommendations that fit your preferences.`,
      `Here are ${productCount} items I think you'll love based on your request.`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Mock method for text-to-speech (returns a mock audio URL)
  async textToSpeech(text: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // In a real implementation, this would return an actual audio URL
    return `data:audio/mp3;base64,mock_audio_data_${Date.now()}`;
  }
}

export const mockVoiceService = new MockVoiceService();
