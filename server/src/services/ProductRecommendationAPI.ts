/**
 * Product Recommendation API Service
 * Leverages Vultr GPU instances for ML-powered recommendations
 */

import env from '../config/env.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import {
  ExternalServiceError,
  ApiTimeoutError,
  DatabaseError,
  CacheError,
} from '../lib/errors.js';

const API_TIMEOUT_MS = 10000; // 10 seconds

export interface UserPreferences {
  favoriteColors?: string[];
  preferredBrands?: string[];
  preferredStyles?: string[];
  preferredSizes?: string[];
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
}

export interface RecommendationContext {
  occasion?: string;
  budget?: number;
  sessionType?: 'browsing' | 'searching' | 'voice_shopping';
  recentViews?: string[];
  searchQuery?: string;
}

export interface RecommendationResult {
  productId: string;
  score: number;
  confidence: number;
  reasons: string[];
  returnRisk: number;
}

export class ProductRecommendationAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = env.VULTR_API_ENDPOINT || 'http://localhost:8000';
  }

  /**
   * Get personalized product recommendations
   * Uses Vultr GPU for ML inference
   */
  async getRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): Promise<RecommendationResult[]> {
    // Check cache first
    const cacheKey = `recommendations:${JSON.stringify({ userPreferences, context })}`;
    try {
      const cached = await vultrValkey.get<RecommendationResult[]>(cacheKey);
      if (cached) {
        console.log('Returning cached recommendations');
        return cached;
      }
    } catch (cacheError) {
      // Cache errors are non-critical, continue to API call
      console.warn('Cache lookup failed, proceeding to API call:', cacheError);
    }

    try {
      // Call Vultr GPU service for ML inference with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          user_prefs: userPreferences,
          context: context,
          use_gpu: true, // Leverage Vultr GPU capabilities
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr ML API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      const results = await response.json() as RecommendationResult[];

      // Cache results for 30 minutes (non-critical)
      try {
        await vultrValkey.set(cacheKey, results, 1800);
      } catch (cacheError) {
        console.warn('Failed to cache recommendations:', cacheError);
      }

      return results;
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        // Fallback to database-based recommendations
        console.warn('Vultr recommendation API error, falling back to local logic:', error);
        return this.getFallbackRecommendations(userPreferences, context);
      }
      
      if (error.name === 'AbortError') {
        throw new ApiTimeoutError('Vultr ML API', API_TIMEOUT_MS, `${this.baseURL}/recommend`);
      }
      
      // Unknown error, try fallback
      console.warn('Unknown error in recommendation API, falling back:', error);
      return this.getFallbackRecommendations(userPreferences, context);
    }
  }

  /**
   * Fallback recommendation logic using PostgreSQL with enhanced scoring
   */
  private async getFallbackRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): Promise<RecommendationResult[]> {
    try {
      // Enhanced query with better scoring algorithm
      const query = `
        SELECT 
          id as "productId",
          name,
          price,
          category,
          brand,
          color,
          COALESCE(style, '') as style,
          rating,
          reviews_count,
          stock,
          (
            -- Color match (30% weight)
            CASE 
              WHEN $1::text[] IS NOT NULL AND color = ANY($1::text[]) THEN 0.3
              WHEN $1::text[] IS NOT NULL AND LOWER(color) = ANY(SELECT LOWER(unnest($1::text[]))) THEN 0.25
              ELSE 0.05
            END +
            -- Brand match (20% weight)
            CASE 
              WHEN $2::text[] IS NOT NULL AND brand = ANY($2::text[]) THEN 0.2
              WHEN $2::text[] IS NOT NULL AND LOWER(brand) = ANY(SELECT LOWER(unnest($2::text[]))) THEN 0.15
              ELSE 0.05
            END +
            -- Rating score (25% weight)
            CASE 
              WHEN rating >= 4.5 THEN 0.25
              WHEN rating >= 4.0 THEN 0.2
              WHEN rating >= 3.5 THEN 0.15
              WHEN rating >= 3.0 THEN 0.1
              ELSE 0.05
            END +
            -- Review count bonus (10% weight) - more reviews = more trusted
            CASE 
              WHEN reviews_count >= 100 THEN 0.1
              WHEN reviews_count >= 50 THEN 0.08
              WHEN reviews_count >= 20 THEN 0.05
              ELSE 0.02
            END +
            -- Price value score (10% weight) - better value = higher score
            CASE 
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric * 0.7 THEN 0.1
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric THEN 0.08
              WHEN $3::numeric IS NOT NULL AND price <= $3::numeric * 1.2 THEN 0.05
              ELSE 0.02
            END +
            -- Stock availability (5% weight)
            CASE 
              WHEN stock >= 10 THEN 0.05
              WHEN stock >= 5 THEN 0.03
              WHEN stock > 0 THEN 0.01
              ELSE 0
            END
          ) as score
        FROM catalog
        WHERE 
          stock > 0
          AND ($3::numeric IS NULL OR price <= $3::numeric * 1.2)
        ORDER BY score DESC, rating DESC, reviews_count DESC
        LIMIT 50
      `;

      const results = await vultrPostgres.query<{
        productId: string;
        score: number;
        name?: string;
        price?: number;
        category?: string;
        brand?: string;
        color?: string;
        style?: string;
        rating?: number;
        reviews_count?: number;
      }>(query, [
        userPreferences.favoriteColors || null,
        userPreferences.preferredBrands || null,
        context.budget || null,
      ]);

      // Apply diversity filtering to avoid too many similar items
      const diversified = this.applyDiversityFilter(results, 20);

      return diversified.map((r) => ({
        productId: r.productId,
        score: Math.min(1.0, r.score), // Normalize score
        confidence: this.calculateConfidence(r),
        reasons: this.generateReasons(r, userPreferences),
        returnRisk: this.estimateReturnRisk(r),
      }));
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      // If database fails, return empty array (graceful degradation)
      console.error('Fallback recommendations failed:', error);
      return [];
    }
  }

  /**
   * Apply diversity filter to recommendations
   */
  private applyDiversityFilter<T extends { productId: string; category?: string; brand?: string; color?: string }>(
    results: T[],
    limit: number
  ): T[] {
    const selected: T[] = [];
    const usedCategories = new Set<string>();
    const usedBrands = new Set<string>();
    const usedColors = new Set<string>();

    for (const result of results) {
      if (selected.length >= limit) break;

      const category = result.category?.toLowerCase() || '';
      const brand = result.brand?.toLowerCase() || '';
      const color = result.color?.toLowerCase() || '';

      // Allow some duplicates but encourage diversity
      const categoryPenalty = usedCategories.has(category) ? 0.1 : 0;
      const brandPenalty = usedBrands.has(brand) ? 0.05 : 0;
      const colorPenalty = usedColors.has(color) ? 0.05 : 0;

      // Skip if too many duplicates already
      if (categoryPenalty + brandPenalty + colorPenalty > 0.15 && selected.length > 5) {
        continue;
      }

      selected.push(result);
      if (category) usedCategories.add(category);
      if (brand) usedBrands.add(brand);
      if (color) usedColors.add(color);
    }

    return selected;
  }

  /**
   * Calculate confidence score based on product attributes
   */
  private calculateConfidence(product: {
    rating?: number;
    reviews_count?: number;
    score?: number;
  }): number {
    let confidence = 0.5; // Base confidence

    // Rating confidence
    if (product.rating) {
      confidence += (product.rating / 5) * 0.2;
    }

    // Review count confidence (more reviews = higher confidence)
    if (product.reviews_count) {
      const reviewConfidence = Math.min(0.2, (product.reviews_count / 100) * 0.2);
      confidence += reviewConfidence;
    }

    // Score confidence
    if (product.score) {
      confidence += product.score * 0.1;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Generate human-readable reasons for recommendation
   */
  private generateReasons(
    product: {
      color?: string;
      brand?: string;
      rating?: number;
      price?: number;
      category?: string;
    },
    preferences: UserPreferences
  ): string[] {
    const reasons: string[] = [];

    if (product.color && preferences.favoriteColors?.includes(product.color)) {
      reasons.push(`Matches your preferred color: ${product.color}`);
    }

    if (product.brand && preferences.preferredBrands?.includes(product.brand)) {
      reasons.push(`From your favorite brand: ${product.brand}`);
    }

    if (product.rating && product.rating >= 4.0) {
      reasons.push(`Highly rated (${product.rating.toFixed(1)}/5.0)`);
    }

    if (product.price && preferences.bodyMeasurements) {
      reasons.push('Good value for money');
    }

    return reasons.length > 0 ? reasons : ['Recommended based on preferences'];
  }

  /**
   * Estimate return risk for a product
   */
  private estimateReturnRisk(product: {
    rating?: number;
    reviews_count?: number;
    score?: number;
  }): number {
    let risk = 0.25; // Base risk

    // Lower rating = higher risk
    if (product.rating) {
      if (product.rating < 3.0) {
        risk += 0.15;
      } else if (product.rating < 3.5) {
        risk += 0.1;
      } else if (product.rating >= 4.5) {
        risk -= 0.1;
      }
    }

    // Fewer reviews = higher uncertainty = slightly higher risk
    if (product.reviews_count && product.reviews_count < 10) {
      risk += 0.05;
    }

    return Math.max(0.1, Math.min(0.6, risk));
  }

  /**
   * Visual similarity search using Vultr GPU
   */
  async findSimilarProducts(imageUrl: string, limit: number = 10): Promise<RecommendationResult[]> {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/visual-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          limit,
          use_gpu: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr Visual Search API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      return await response.json() as RecommendationResult[];
    } catch (error: any) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiTimeoutError('Vultr Visual Search API', API_TIMEOUT_MS, `${this.baseURL}/visual-search`);
      }
      
      // Unknown error, return empty array (graceful degradation)
      console.error('Visual search error:', error);
      return [];
    }
  }

  /**
   * Size prediction using ML model on Vultr GPU
   */
  async predictOptimalSize(
    bodyMeasurements: UserPreferences['bodyMeasurements'],
    productId: string
  ): Promise<{ recommendedSize: string; confidence: number }> {
    if (!bodyMeasurements) {
      return { recommendedSize: 'M', confidence: 0.5 };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(`${this.baseURL}/size-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': env.VULTR_API_KEY ? `Bearer ${env.VULTR_API_KEY}` : '',
        },
        body: JSON.stringify({
          measurements: bodyMeasurements,
          product_id: productId,
          use_gpu: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ExternalServiceError(
          'Vultr Size Prediction API',
          `Request failed with status ${response.status}: ${errorText}`,
          undefined,
          { status: response.status, statusText: response.statusText }
        );
      }

      return await response.json() as { recommendedSize: string; confidence: number };
    } catch (error: any) {
      if (error instanceof ExternalServiceError && error.name === 'AbortError') {
        throw new ApiTimeoutError('Vultr Size Prediction API', API_TIMEOUT_MS, `${this.baseURL}/size-prediction`);
      }
      
      // For size prediction, return default on error (graceful degradation)
      console.warn('Size prediction error, using default:', error);
      return { recommendedSize: 'M', confidence: 0.5 };
    }
  }

  /**
   * Batch get recommendations for multiple users (optimized for performance)
   */
  async batchGetRecommendations(
    requests: Array<{ userPreferences: UserPreferences; context: RecommendationContext; userId?: string }>
  ): Promise<RecommendationResult[][]> {
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 10;
    const results: RecommendationResult[][] = [];

    for (let i = 0; i < requests.length; i += BATCH_SIZE) {
      const batch = requests.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((req) => this.getRecommendations(req.userPreferences, req.context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Record user feedback for recommendations (for continuous learning)
   */
  async recordFeedback(
    userId: string,
    productId: string,
    feedback: {
      type: 'view' | 'click' | 'purchase' | 'skip' | 'dismiss';
      recommendationId?: string;
      timestamp?: Date;
    }
  ): Promise<void> {
    try {
      // Store feedback in database for ML model training
      await vultrPostgres.query(
        `INSERT INTO recommendation_feedback 
         (user_id, product_id, feedback_type, recommendation_id, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          productId,
          feedback.type,
          feedback.recommendationId || null,
          feedback.timestamp || new Date(),
        ]
      );

      // Note: Cache invalidation would be implemented with proper cache key tracking
      // For now, cache will expire naturally based on TTL
    } catch (error) {
      console.error('Failed to record feedback:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get personalized recommendations with learning from past interactions
   */
  async getRecommendationsWithLearning(
    userPreferences: UserPreferences,
    context: RecommendationContext,
    userId?: string
  ): Promise<RecommendationResult[]> {
    // Get base recommendations
    const recommendations = await this.getRecommendations(userPreferences, context);

    if (!userId) {
      return recommendations;
    }

      // Enhance with learning from user's past interactions
      try {
        // First check if table exists, if not return base recommendations
        let userInteractions: any[] = [];
        try {
          userInteractions = await vultrPostgres.query(
            `SELECT product_id, feedback_type, COUNT(*) as interaction_count
             FROM recommendation_feedback
             WHERE user_id = $1
             GROUP BY product_id, feedback_type`,
            [userId]
          );
        } catch (tableError: any) {
          // Table might not exist yet, that's okay
          if (!tableError.message?.includes('does not exist')) {
            throw tableError;
          }
          console.log('recommendation_feedback table not found, using base recommendations');
        }

      // Boost scores for products with positive feedback
      const positiveProducts = new Set(
        userInteractions
          .filter((i: any) => i.feedback_type === 'purchase' || i.feedback_type === 'click')
          .map((i: any) => i.product_id)
      );

      // Lower scores for products with negative feedback
      const negativeProducts = new Set(
        userInteractions
          .filter((i: any) => i.feedback_type === 'skip' || i.feedback_type === 'dismiss')
          .map((i: any) => i.product_id)
      );

      // Apply learning adjustments
      return recommendations.map((rec) => {
        let adjustedScore = rec.score;
        
        if (positiveProducts.has(rec.productId)) {
          adjustedScore *= 1.2; // Boost positive products
        }
        
        if (negativeProducts.has(rec.productId)) {
          adjustedScore *= 0.7; // Reduce negative products
        }

        return {
          ...rec,
          score: Math.min(1.0, adjustedScore),
          reasons: [
            ...rec.reasons,
            ...(positiveProducts.has(rec.productId) ? ['Based on your past positive interactions'] : []),
          ],
        };
      }).sort((a, b) => b.score - a.score); // Re-sort by adjusted score
    } catch (error) {
      console.error('Failed to apply learning, returning base recommendations:', error);
      return recommendations;
    }
  }
}

export const productRecommendationAPI = new ProductRecommendationAPI();

