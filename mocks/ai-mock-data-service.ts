/**
 * Service for loading and accessing AI mock data
 * Provides utilities to work with comprehensive retail voice shopping assistant mock data
 */

import type {
  EnhancedUserProfile,
  EnhancedProduct,
  ConversationHistory,
  AIRecommendationOutput,
  EnhancedOrder,
  OrderReturnRiskAnalysis,
  AIMockData,
} from './ai-mock-data-types';

// Load mock data
// For Node.js/server: Uses resolveJsonModule from tsconfig
// For browser: Use fetch() in async initialization
let mockDataCache: AIMockData | null = null;

async function loadMockData(): Promise<AIMockData> {
  if (mockDataCache) {
    return mockDataCache;
  }

  // Try to load via fetch (works in browser)
  if (typeof window !== 'undefined' || typeof fetch !== 'undefined') {
    try {
      const response = await fetch('/mocks/ai-mock-data.json');
      mockDataCache = await response.json() as AIMockData;
      return mockDataCache;
    } catch (error) {
      console.warn('Failed to load mock data via fetch, trying sync import:', error);
    }
  }

  // Fallback: try sync import (Node.js with resolveJsonModule)
  // This will throw if JSON can't be imported - caller should handle
  throw new Error('Mock data must be loaded asynchronously via fetch() in browser, or use sync import in Node.js');
}

// Synchronous accessor - requires JSON to be importable (Node.js with resolveJsonModule)
function getMockDataSync(): AIMockData {
  if (mockDataCache) {
    return mockDataCache;
  }
  
  // Try to import directly (works in Node.js/TypeScript with resolveJsonModule: true)
  // This is a best-effort approach - if it fails, use async loading
  try {
    // @ts-ignore - Dynamic import of JSON - may not work in all environments
    const data = require('./ai-mock-data.json');
    mockDataCache = data as AIMockData;
    return mockDataCache;
  } catch (error) {
    // If direct require fails, we need async loading
    throw new Error(
      'Mock data not loaded. For Node.js, ensure resolveJsonModule: true in tsconfig.json. ' +
      'For browser, call ensureLoaded() first or use fetch.'
    );
  }
}

export class AIMockDataService {
  private static instance: AIMockDataService;
  private data: AIMockData | null = null;
  private loadPromise: Promise<void> | null = null;

  private constructor() {
    // Initialize by attempting to load data
    this.loadPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.data = await loadMockData();
    } catch (error) {
      console.warn('Failed to load mock data asynchronously, will try sync:', error);
      try {
        this.data = getMockDataSync();
      } catch (syncError) {
        console.error('Failed to load mock data synchronously:', syncError);
      }
    }
  }

  private ensureData(): AIMockData {
    if (!this.data) {
      try {
        this.data = getMockDataSync();
      } catch (error) {
        throw new Error('Mock data not available. Ensure ai-mock-data.json exists and is loadable.');
      }
    }
    return this.data;
  }

  async ensureLoaded(): Promise<void> {
    if (this.loadPromise) {
      await this.loadPromise;
    }
    this.ensureData();
  }

  static getInstance(): AIMockDataService {
    if (!AIMockDataService.instance) {
      AIMockDataService.instance = new AIMockDataService();
    }
    return AIMockDataService.instance;
  }

  /**
   * Get all user profiles
   */
  getUserProfiles(): EnhancedUserProfile[] {
    const data = this.ensureData();
    return [...data.userProfiles];
  }

  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): EnhancedUserProfile | undefined {
    const data = this.ensureData();
    return data.userProfiles.find((profile) => profile.userId === userId);
  }

  /**
   * Get all products
   */
  getProducts(): EnhancedProduct[] {
    const data = this.ensureData();
    return [...data.products];
  }

  /**
   * Get product by ID
   */
  getProduct(productId: string): EnhancedProduct | undefined {
    const data = this.ensureData();
    return data.products.find((product) => product.productId === productId);
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): EnhancedProduct[] {
    const data = this.ensureData();
    return data.products.filter((product) => product.category === category);
  }

  /**
   * Get products by brand
   */
  getProductsByBrand(brand: string): EnhancedProduct[] {
    const data = this.ensureData();
    return data.products.filter((product) => product.brand === brand);
  }

  /**
   * Get conversation history for a user
   */
  getConversationHistory(userId: string): ConversationHistory[] {
    const data = this.ensureData();
    return data.conversations.filter((conv) => conv.userId === userId);
  }

  /**
   * Get conversation by session ID
   */
  getConversationBySession(sessionId: string): ConversationHistory | undefined {
    const data = this.ensureData();
    return data.conversations.find((conv) => conv.sessionId === sessionId);
  }

  /**
   * Get recommendations for a user
   */
  getRecommendations(userId: string): AIRecommendationOutput[] {
    const data = this.ensureData();
    return data.recommendations.filter((rec) => rec.userId === userId);
  }

  /**
   * Get latest recommendations for a user
   */
  getLatestRecommendations(userId: string): AIRecommendationOutput | undefined {
    const userRecommendations = this.getRecommendations(userId);
    if (userRecommendations.length === 0) return undefined;

    // Sort by timestamp (most recent first)
    return userRecommendations.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  }

  /**
   * Get all orders
   */
  getOrders(): EnhancedOrder[] {
    const data = this.ensureData();
    return [...data.orders];
  }

  /**
   * Get orders for a user
   */
  getOrdersByUser(userId: string): EnhancedOrder[] {
    const data = this.ensureData();
    return data.orders.filter((order) => order.userId === userId);
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): EnhancedOrder | undefined {
    const data = this.ensureData();
    return data.orders.find((order) => order.orderId === orderId);
  }

  /**
   * Get return risk analysis for an order
   */
  getReturnRiskAnalysis(orderId: string): OrderReturnRiskAnalysis | undefined {
    const data = this.ensureData();
    return data.returnRiskAnalyses.find((analysis) => analysis.orderId === orderId);
  }

  /**
   * Find recommended size for a user and product
   */
  findRecommendedSize(userId: string, productId: string): {
    size: string;
    confidenceScore: number;
    returnRisk: number;
    reasoning: string;
  } | null {
    const recommendations = this.getLatestRecommendations(userId);
    if (!recommendations) return null;

    const productRec = recommendations.recommendations.find(
      (rec) => rec.productId === productId
    );
    
    if (!productRec) return null;

    return {
      size: productRec.recommendedSize,
      confidenceScore: productRec.confidenceScore,
      returnRisk: productRec.returnRisk,
      reasoning: productRec.reasoning,
    };
  }

  /**
   * Get user's size history for a brand
   */
  getSizeHistoryByBrand(userId: string, brand: string) {
    const profile = this.getUserProfile(userId);
    if (!profile) return [];

    return profile.sizeHistory.filter((entry) => entry.brand === brand);
  }

  /**
   * Get user's return history
   */
  getUserReturnHistory(userId: string) {
    const profile = this.getUserProfile(userId);
    if (!profile) return [];

    return [...profile.returnHistory];
  }

  /**
   * Calculate size match score based on measurements
   */
  calculateSizeMatch(
    userId: string,
    productId: string,
    size: string
  ): number {
    const profile = this.getUserProfile(userId);
    const product = this.getProduct(productId);
    
    if (!profile || !product || !product.sizeChart[size]) {
      return 0;
    }

    const userMeasurements = profile.measurements;
    const sizeChart = product.sizeChart[size];

    let matchScore = 0;
    let factors = 0;

    // Check chest match
    if (userMeasurements.chest_cm && sizeChart.chest_cm) {
      const diff = Math.abs(userMeasurements.chest_cm - sizeChart.chest_cm);
      const match = Math.max(0, 1 - diff / 10); // Within 10cm is good match
      matchScore += match;
      factors++;
    }

    // Check waist match
    if (userMeasurements.waist_cm && sizeChart.waist_cm) {
      const diff = Math.abs(userMeasurements.waist_cm - sizeChart.waist_cm);
      const match = Math.max(0, 1 - diff / 8); // Within 8cm is good match
      matchScore += match;
      factors++;
    }

    // Check hips match
    if (userMeasurements.hips_cm && sizeChart.hips_cm) {
      const diff = Math.abs(userMeasurements.hips_cm - sizeChart.hips_cm);
      const match = Math.max(0, 1 - diff / 10); // Within 10cm is good match
      matchScore += match;
      factors++;
    }

    return factors > 0 ? matchScore / factors : 0;
  }

  /**
   * Get products matching user preferences
   */
  getProductsMatchingPreferences(userId: string): EnhancedProduct[] {
    const data = this.ensureData();
    const profile = this.getUserProfile(userId);
    if (!profile) return [];

    const prefs = profile.stylePreferences;
    const matchingProducts: EnhancedProduct[] = [];

    for (const product of data.products) {
      let match = false;

      // Check color match
      if (prefs.colors && prefs.colors.length > 0) {
        const colorMatch = product.attributes.colors.some((color) =>
          prefs.colors?.some((prefColor) =>
            color.toLowerCase().includes(prefColor.toLowerCase())
          )
        );
        if (colorMatch) match = true;
      }

      // Check pattern match
      if (prefs.patterns && prefs.patterns.length > 0) {
        const patternMatch = product.attributes.patterns.some((pattern) =>
          prefs.patterns?.includes(pattern)
        );
        if (patternMatch) match = true;
      }

      // Check brand match
      if (prefs.brands && prefs.brands.includes(product.brand)) {
        match = true;
      }

      // Check occasion match (if product category aligns)
      if (prefs.occasion) {
        const occasionCategoryMap: Record<string, string[]> = {
          office: ['Blazers', 'Shirts', 'Dresses'],
          casual: ['Shirts', 'Pants', 'Dresses'],
          formal: ['Blazers', 'Dresses'],
        };

        const matchesOccasion = prefs.occasion.some((occ) => {
          const categories = occasionCategoryMap[occ] || [];
          return categories.includes(product.category);
        });

        if (matchesOccasion) match = true;
      }

      if (match) {
        matchingProducts.push(product);
      }
    }

    return matchingProducts;
  }
}

// Export singleton instance
export const aiMockDataService = AIMockDataService.getInstance();

// Helper to initialize data (for async environments)
export async function initializeAIMockData(): Promise<void> {
  await aiMockDataService.ensureLoaded();
}

