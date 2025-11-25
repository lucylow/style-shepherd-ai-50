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
   * Fallback recommendation logic using PostgreSQL
   */
  private async getFallbackRecommendations(
    userPreferences: UserPreferences,
    context: RecommendationContext
  ): Promise<RecommendationResult[]> {
    try {
      const query = `
        SELECT 
          id as "productId",
          name,
          price,
          category,
          brand,
          color,
          rating,
          reviews_count,
          CASE 
            WHEN $1::text[] IS NOT NULL AND color = ANY($1::text[]) THEN 0.3
            ELSE 0.1
          END +
          CASE 
            WHEN $2::text[] IS NOT NULL AND brand = ANY($2::text[]) THEN 0.2
            ELSE 0.05
          END +
          CASE 
            WHEN rating >= 4.0 THEN 0.2
            WHEN rating >= 3.0 THEN 0.1
            ELSE 0.05
          END as score
        FROM catalog
        WHERE 
          ($3::numeric IS NULL OR price <= $3::numeric)
          AND stock > 0
        ORDER BY score DESC, rating DESC
        LIMIT 20
      `;

      const results = await vultrPostgres.query<{
        productId: string;
        score: number;
      }>(query, [
        userPreferences.favoriteColors || null,
        userPreferences.preferredBrands || null,
        context.budget || null,
      ]);

      return results.map((r) => ({
        productId: r.productId,
        score: r.score,
        confidence: 0.7,
        reasons: ['Based on your preferences and product ratings'],
        returnRisk: 0.25, // Default risk
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
}

export const productRecommendationAPI = new ProductRecommendationAPI();

