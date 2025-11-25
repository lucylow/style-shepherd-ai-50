/**
 * SmartInference Service - AI Recommendations and Intent Analysis
 * 
 * Powers core AI features using Raindrop SmartInference:
 * - Product recommendations
 * - Voice intent analysis
 * - Style advice
 * - Return risk prediction
 */

import { styleInference } from '@/integrations/raindrop/config';
import { UserProfile } from './userMemoryService';
import { Product } from '@/types/fashion';

export interface RecommendationInput {
  userId: string;
  userProfile?: UserProfile;
  productFeatures?: {
    category?: string;
    color?: string;
    price?: number;
    style?: string;
  };
  context?: {
    recentViews?: string[];
    searchQuery?: string;
    sessionType?: 'browsing' | 'searching' | 'voice_shopping';
  };
}

export interface RecommendationResult {
  productId: string;
  score: number;
  confidence: number;
  explanation: string;
  factors: {
    styleMatch: number;
    priceFit: number;
    returnRisk: number;
    novelty: number;
  };
}

export interface IntentAnalysisResult {
  intent: 'size_recommendation' | 'style_advice' | 'product_search' | 'returns_prediction' | 'general';
  confidence: number;
  entities: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface StyleAdviceResult {
  advice: string;
  confidence: number;
  recommendedProducts?: string[];
  styleMatch: number;
}

class StyleInferenceService {
  /**
   * Predict product recommendation score
   */
  async predictRecommendation(input: RecommendationInput): Promise<RecommendationResult> {
    try {
      const result = await styleInference.predict({
        type: 'recommendation',
        userId: input.userId,
        userProfile: input.userProfile,
        productFeatures: input.productFeatures,
        context: input.context,
      });
      
      return {
        productId: result.productId || '',
        score: result.score || 0,
        confidence: result.confidence || 0.8,
        explanation: result.explanation || 'Recommended based on your preferences',
        factors: {
          styleMatch: result.factors?.styleMatch || 0.5,
          priceFit: result.factors?.priceFit || 0.5,
          returnRisk: result.factors?.returnRisk || 0.5,
          novelty: result.factors?.novelty || 0.3,
        },
      };
    } catch (error) {
      console.error('Failed to predict recommendation:', error);
      // Fallback to default
      return {
        productId: '',
        score: 0.5,
        confidence: 0.5,
        explanation: 'Unable to generate recommendation',
        factors: {
          styleMatch: 0.5,
          priceFit: 0.5,
          returnRisk: 0.5,
          novelty: 0.3,
        },
      };
    }
  }

  /**
   * Analyze voice intent from user utterance
   */
  async analyzeIntent(utterance: string, userId?: string): Promise<IntentAnalysisResult> {
    try {
      const result = await styleInference.predict({
        type: 'intent_analysis',
        utterance,
        userId,
      });
      
      return {
        intent: result.intent || 'general',
        confidence: result.confidence || 0.7,
        entities: result.entities || [],
        sentiment: result.sentiment || 'neutral',
      };
    } catch (error) {
      console.error('Failed to analyze intent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Generate style advice
   */
  async generateStyleAdvice(
    userId: string,
    userProfile: UserProfile | null,
    context?: { productId?: string; occasion?: string }
  ): Promise<StyleAdviceResult> {
    try {
      const result = await styleInference.predict({
        type: 'style_advice',
        userId,
        userProfile,
        context,
      });
      
      return {
        advice: result.advice || 'Consider your personal style preferences',
        confidence: result.confidence || 0.8,
        recommendedProducts: result.recommendedProducts || [],
        styleMatch: result.styleMatch || 0.7,
      };
    } catch (error) {
      console.error('Failed to generate style advice:', error);
      return {
        advice: 'Unable to generate style advice at this time',
        confidence: 0.5,
        recommendedProducts: [],
        styleMatch: 0.5,
      };
    }
  }

  /**
   * Predict return risk for a product
   */
  async predictReturnRisk(
    productId: string,
    userId: string,
    userProfile: UserProfile | null,
    selectedSize?: string
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    confidence: number;
  }> {
    try {
      const result = await styleInference.predict({
        type: 'return_risk',
        productId,
        userId,
        userProfile,
        selectedSize,
      });
      
      return {
        riskScore: result.riskScore || 0.5,
        riskLevel: result.riskLevel || 'medium',
        factors: result.factors || [],
        confidence: result.confidence || 0.8,
      };
    } catch (error) {
      console.error('Failed to predict return risk:', error);
      return {
        riskScore: 0.5,
        riskLevel: 'medium',
        factors: [],
        confidence: 0.5,
      };
    }
  }

  /**
   * Batch predict recommendations for multiple products
   */
  async batchPredictRecommendations(
    userId: string,
    products: Product[],
    userProfile: UserProfile | null
  ): Promise<RecommendationResult[]> {
    try {
      const inputs = products.map(product => ({
        type: 'recommendation',
        userId,
        userProfile,
        productFeatures: {
          category: product.category,
          color: product.color,
          price: product.price,
          style: product.name,
        },
      }));
      
      const results = await styleInference.batchPredict(inputs);
      
      return results.map((result: any, index: number) => ({
        productId: products[index].id,
        score: result.score || 0.5,
        confidence: result.confidence || 0.8,
        explanation: result.explanation || 'Recommended product',
        factors: {
          styleMatch: result.factors?.styleMatch || 0.5,
          priceFit: result.factors?.priceFit || 0.5,
          returnRisk: result.factors?.returnRisk || 0.5,
          novelty: result.factors?.novelty || 0.3,
        },
      }));
    } catch (error) {
      console.error('Failed to batch predict recommendations:', error);
      return products.map(product => ({
        productId: product.id,
        score: 0.5,
        confidence: 0.5,
        explanation: 'Unable to generate recommendation',
        factors: {
          styleMatch: 0.5,
          priceFit: 0.5,
          returnRisk: 0.5,
          novelty: 0.3,
        },
      }));
    }
  }
}

export const styleInferenceService = new StyleInferenceService();

