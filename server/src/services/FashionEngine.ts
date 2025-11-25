/**
 * Fashion Engine Service
 * Core logic for size prediction, style matching, and recommendations
 */

import { userMemory } from '../lib/raindrop-config.js';
import { orderSQL } from '../lib/raindrop-config.js';
import { productRecommendationAPI } from './ProductRecommendationAPI.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';

export interface BodyMeasurements {
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
}

export interface StylePreferences {
  favoriteColors?: string[];
  preferredBrands?: string[];
  preferredStyles?: string[];
  preferredSizes?: string[];
}

export interface PersonalizedRecommendation {
  size: string;
  style: string[];
  budget: number;
  confidence: number;
  products: any[];
  returnRisk: number;
}

export class FashionEngine {
  private sizeMapping: Map<string, any>;

  constructor() {
    this.sizeMapping = new Map();
    this.loadStyleRules();
  }

  /**
   * Get personalized recommendation based on user profile
   */
  async getPersonalizedRecommendation(
    userId: string,
    occasion?: string,
    budget?: number
  ): Promise<PersonalizedRecommendation> {
    // Get user profile from SmartMemory
    const userProfile = await userMemory.get(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Fetch user data in parallel
    const [bodyMeasurements, styleHistory, returnsHistory] = await Promise.all([
      userMemory.get(`${userId}-measurements`) as Promise<BodyMeasurements | null>,
      userMemory.get(`${userId}-style-history`) as Promise<any[] | null>,
      this.getReturnsHistory(userId),
    ]);

    // Predict optimal size
    const size = await this.predictOptimalSize(
      bodyMeasurements || userProfile.bodyMeasurements,
      returnsHistory
    );

    // Match style rules
    const style = this.matchStyleRules(
      userProfile.preferences || {},
      occasion
    );

    // Get product recommendations
    const recommendations = await productRecommendationAPI.getRecommendations(
      userProfile.preferences || {},
      { occasion, budget }
    );

    // Calculate return risk
    const returnRisk = await this.calculateReturnRisk(
      userId,
      recommendations,
      returnsHistory
    );

    return {
      size,
      style,
      budget: budget || 500,
      confidence: this.calculateConfidenceScore(styleHistory),
      products: recommendations.slice(0, 10),
      returnRisk,
    };
  }

  /**
   * Predict optimal size using ML model on Vultr GPU
   */
  async predictOptimalSize(
    measurements: BodyMeasurements | null | undefined,
    returnsHistory: any[]
  ): Promise<string> {
    if (!measurements) {
      return 'M'; // Default size
    }

    // Use Vultr GPU service for size prediction
    try {
      const result = await productRecommendationAPI.predictOptimalSize(
        measurements,
        'default-product'
      );
      return result.recommendedSize;
    } catch (error) {
      console.error('Size prediction error, using fallback:', error);
      // Fallback logic based on measurements
      return this.predictSizeFallback(measurements, returnsHistory);
    }
  }

  /**
   * Fallback size prediction logic
   */
  private predictSizeFallback(
    measurements: BodyMeasurements,
    returnsHistory: any[]
  ): string {
    // Simple heuristic-based size prediction
    if (measurements.waist) {
      if (measurements.waist < 28) return 'XS';
      if (measurements.waist < 32) return 'S';
      if (measurements.waist < 36) return 'M';
      if (measurements.waist < 40) return 'L';
      return 'XL';
    }

    // Learn from returns history
    if (returnsHistory.length > 0) {
      const sizeIssues = returnsHistory.filter(
        (r) => r.reason?.toLowerCase().includes('size')
      );
      if (sizeIssues.length > 0) {
        // Return most common successful size (would need to track this)
        return 'M';
      }
    }

    return 'M'; // Default
  }

  /**
   * Match style rules based on preferences and occasion
   */
  private matchStyleRules(
    preferences: StylePreferences,
    occasion?: string
  ): string[] {
    const styles: string[] = [];

    // Add user preferred styles
    if (preferences.preferredStyles) {
      styles.push(...preferences.preferredStyles);
    }

    // Add occasion-based styles
    if (occasion) {
      const occasionStyles: Record<string, string[]> = {
        wedding: ['elegant', 'formal', 'sophisticated'],
        casual: ['casual', 'comfortable', 'relaxed'],
        business: ['professional', 'formal', 'polished'],
        party: ['trendy', 'bold', 'fashion-forward'],
      };
      const occasionStyle = occasionStyles[occasion.toLowerCase()];
      if (occasionStyle) {
        styles.push(...occasionStyle);
      }
    }

    return styles.length > 0 ? styles : ['versatile'];
  }

  /**
   * Filter products by budget
   */
  filterByBudget(products: any[], budget: number): any[] {
    return products.filter((p) => p.price <= budget);
  }

  /**
   * Calculate confidence score based on style history
   */
  private calculateConfidenceScore(styleHistory: any[] | null): number {
    if (!styleHistory || styleHistory.length === 0) {
      return 0.5; // Base confidence for new users
    }

    // More history = higher confidence
    const historyLength = styleHistory.length;
    const baseConfidence = Math.min(0.9, 0.5 + historyLength * 0.05);

    return baseConfidence;
  }

  /**
   * Calculate return risk for recommendations
   */
  private async calculateReturnRisk(
    userId: string,
    recommendations: any[],
    returnsHistory: any[]
  ): Promise<number> {
    if (returnsHistory.length === 0) {
      return 0.25; // Industry average
    }

    // Calculate user's historical return rate
    const userReturnRate = returnsHistory.length / (returnsHistory.length + 10); // Rough estimate

    // Factor in recommendation quality
    const avgConfidence = recommendations.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / recommendations.length;

    // Lower return risk for higher confidence recommendations
    const adjustedRisk = userReturnRate * (1 - avgConfidence * 0.5);

    return Math.max(0.1, Math.min(0.5, adjustedRisk));
  }

  /**
   * Get returns history from database
   */
  private async getReturnsHistory(userId: string): Promise<any[]> {
    try {
      return await orderSQL.query(
        'SELECT * FROM returns WHERE user_id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Failed to get returns history:', error);
      return [];
    }
  }

  /**
   * Load style rules (can be extended with ML models)
   */
  private loadStyleRules(): void {
    // This would load style matching rules from a database or config
    // For now, it's a placeholder
  }
}

export const fashionEngine = new FashionEngine();

