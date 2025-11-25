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
   * Match style rules based on preferences and occasion with enhanced ML-based matching
   */
  private matchStyleRules(
    preferences: StylePreferences,
    occasion?: string
  ): string[] {
    const styles: string[] = [];

    // Add user preferred styles with weights
    if (preferences.preferredStyles) {
      styles.push(...preferences.preferredStyles);
    }

    // Enhanced occasion-based style matching with more granular styles
    if (occasion) {
      const occasionStyles: Record<string, string[]> = {
        wedding: ['elegant', 'formal', 'sophisticated', 'classic', 'timeless'],
        casual: ['casual', 'comfortable', 'relaxed', 'everyday', 'effortless'],
        business: ['professional', 'formal', 'polished', 'tailored', 'structured'],
        party: ['trendy', 'bold', 'fashion-forward', 'eye-catching', 'vibrant'],
        date: ['chic', 'stylish', 'flattering', 'alluring', 'elegant'],
        work: ['professional', 'versatile', 'polished', 'comfortable', 'modest'],
        vacation: ['comfortable', 'breathable', 'stylish', 'lightweight', 'versatile'],
        formal: ['elegant', 'sophisticated', 'tailored', 'luxurious', 'refined'],
        outdoor: ['durable', 'functional', 'comfortable', 'weather-appropriate', 'practical'],
      };
      const occasionStyle = occasionStyles[occasion.toLowerCase()];
      if (occasionStyle) {
        styles.push(...occasionStyle);
      }
    }

    // Add seasonal considerations if available
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 12 || currentMonth <= 2) {
      styles.push('warm', 'layered');
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      styles.push('light', 'spring-appropriate');
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      styles.push('lightweight', 'breathable', 'summer-appropriate');
    } else {
      styles.push('transitional', 'versatile');
    }

    // Remove duplicates and return
    return styles.length > 0 ? [...new Set(styles)] : ['versatile'];
  }

  /**
   * Advanced style compatibility scoring
   */
  private calculateStyleCompatibility(
    productStyles: string[],
    userStyles: string[]
  ): number {
    if (!productStyles || productStyles.length === 0) return 0.5;
    if (!userStyles || userStyles.length === 0) return 0.5;

    const productSet = new Set(productStyles.map(s => s.toLowerCase()));
    const userSet = new Set(userStyles.map(s => s.toLowerCase()));

    // Calculate intersection
    let matches = 0;
    for (const style of productSet) {
      if (userSet.has(style)) {
        matches++;
      }
    }

    // Calculate compatibility score (intersection over union)
    const union = new Set([...productSet, ...userSet]).size;
    const jaccardSimilarity = union > 0 ? matches / union : 0;

    return Math.min(1.0, jaccardSimilarity + 0.3); // Add base score
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
   * Calculate return risk for recommendations with enhanced ML factors
   */
  private async calculateReturnRisk(
    userId: string,
    recommendations: any[],
    returnsHistory: any[]
  ): Promise<number> {
    if (!recommendations || recommendations.length === 0) {
      return 0.25; // Default risk
    }

    let baseRisk = 0.25; // Industry average baseline

    // Factor 1: User's historical return rate with statistical confidence
    if (returnsHistory.length > 0) {
      const totalOrders = returnsHistory.length + 5; // Estimate total orders (returns + successful)
      const userReturnRate = returnsHistory.length / totalOrders;
      
      // Weight by sample size (more history = more reliable)
      const confidenceWeight = Math.min(1.0, returnsHistory.length / 20);
      baseRisk = (userReturnRate * confidenceWeight) + (0.25 * (1 - confidenceWeight));
    }

    // Factor 2: Recommendation quality and confidence
    const avgConfidence = recommendations.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / recommendations.length;
    const confidenceAdjustment = (1 - avgConfidence) * 0.2; // Lower confidence increases risk

    // Factor 3: Size prediction accuracy
    const sizeAccuracy = await this.estimateSizeAccuracy(userId, returnsHistory);
    const sizeRiskFactor = (1 - sizeAccuracy) * 0.15;

    // Factor 4: Style match quality
    const avgStyleMatch = recommendations.reduce((sum, r) => {
      const styleMatch = r.styleMatch || 0.5;
      return sum + styleMatch;
    }, 0) / recommendations.length;
    const styleRiskFactor = (1 - avgStyleMatch) * 0.1;

    // Factor 5: Product return rate from catalog (if available)
    const productReturnRates = await Promise.all(
      recommendations.map(async (r) => {
        try {
          const productReturns = await vultrPostgres.query(
            'SELECT COUNT(*) as return_count FROM returns WHERE product_id = $1',
            [r.productId || r.id]
          );
          return productReturns[0]?.return_count || 0;
        } catch {
          return 0;
        }
      })
    );
    const avgProductReturnRate = productReturnRates.reduce((sum, r) => sum + r, 0) / productReturnRates.length;
    const productRiskFactor = Math.min(0.1, avgProductReturnRate / 100);

    // Combine all factors
    const totalRisk = baseRisk + confidenceAdjustment + sizeRiskFactor + styleRiskFactor + productRiskFactor;

    // Clamp between realistic bounds
    return Math.max(0.05, Math.min(0.7, totalRisk));
  }

  /**
   * Estimate size prediction accuracy based on return history
   */
  private async estimateSizeAccuracy(userId: string, returnsHistory: any[]): Promise<number> {
    if (!returnsHistory || returnsHistory.length === 0) {
      return 0.75; // Default accuracy for new users
    }

    // Count size-related returns
    const sizeReturns = returnsHistory.filter(
      (r) => r.reason?.toLowerCase().includes('size') ||
             r.reason?.toLowerCase().includes('fit') ||
             r.reason?.toLowerCase().includes('small') ||
             r.reason?.toLowerCase().includes('large')
    );

    // Calculate accuracy (fewer size returns = higher accuracy)
    const sizeReturnRate = sizeReturns.length / returnsHistory.length;
    const accuracy = 1 - (sizeReturnRate * 0.7); // Scale factor

    return Math.max(0.5, Math.min(0.95, accuracy));
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

