/**
 * Retail Orchestrator - Main coordinator for multi-agent retail system
 * Orchestrates SearchAgent, ReturnsAgent, CartAgent, and PromotionsAgent
 */

import { userMemory } from '../lib/raindrop-config.js';
import { vultrValkey } from '../lib/vultr-valkey.js';
import { searchAgent, type SearchParams, type SearchResult } from './agents/SearchAgent.js';
import { returnsAgent, type ReturnRiskPrediction } from './agents/ReturnsAgent.js';
import { cartAgent, type CartBundle, type CartOptimizationParams } from './agents/CartAgent.js';
import { promotionsAgent, type NegotiationResult, type NegotiationParams } from './agents/PromotionsAgent.js';
import { AppError } from '../lib/errors.js';

export interface UserGoal {
  intent: string;
  params: {
    query?: string;
    preferences?: {
      colors?: string[];
      brands?: string[];
      styles?: string[];
      sizes?: string[];
      maxPrice?: number;
      minPrice?: number;
    };
    budget?: number;
    maxItems?: number;
  };
}

export interface AgenticCartResult {
  finalCart: CartBundle;
  analytics: CartAnalytics;
  recommendations: string[];
  sessionId: string;
}

export interface CartAnalytics {
  savings: number;
  savingsPercentage: number;
  riskDrop: number; // Percentage reduction in return risk
  riskDropPercentage: number;
  aovDelta: number; // Average order value change
  aovDeltaPercentage: number;
  totalItems: number;
  averageReturnRisk: number;
  bundleScore: number;
  negotiationSuccess: boolean;
  processingTime: number;
}

export class RetailOrchestrator {
  /**
   * Handle user shopping goal with full agentic workflow
   */
  async handleUserGoal(
    userId: string,
    goal: UserGoal
  ): Promise<AgenticCartResult> {
    const startTime = Date.now();
    const sessionId = `session_${userId}_${Date.now()}`;

    try {
      // Step 1: Search for relevant products (Agent-to-Site)
      console.log(`[${sessionId}] Step 1: Searching products...`);
      const searchParams: SearchParams = {
        query: goal.params.query || 'fashion items',
        preferences: goal.params.preferences,
        limit: goal.params.maxItems || 20,
      };

      const searchResults = await searchAgent.search(searchParams, userId);
      console.log(`[${sessionId}] Found ${searchResults.products.length} products`);

      if (searchResults.products.length === 0) {
        throw new AppError(
          'NO_PRODUCTS_FOUND',
          'No products found matching your criteria',
          404
        );
      }

      // Step 2: Predict return risk for each candidate item
      console.log(`[${sessionId}] Step 2: Predicting return risks...`);
      const scoredResults = await Promise.all(
        searchResults.products.map(async (product) => {
          const returnRisk = await returnsAgent.predict(
            userId,
            product,
            goal.params.preferences?.sizes?.[0]
          );
          return {
            product,
            returnRisk,
          };
        })
      );

      // Calculate baseline risk (average of all products)
      const baselineRisk = scoredResults.reduce(
        (sum, item) => sum + item.returnRisk.riskScore,
        0
      ) / scoredResults.length;

      // Step 3: Suggest optimal cart bundle
      console.log(`[${sessionId}] Step 3: Optimizing cart bundle...`);
      const cartParams: CartOptimizationParams = {
        products: scoredResults.map(item => ({
          product: item.product,
          returnRisk: item.returnRisk,
          size: goal.params.preferences?.sizes?.[0],
        })),
        maxItems: goal.params.maxItems || 10,
        budget: goal.params.budget,
        minimizeRisk: true,
        maximizeValue: true,
      };

      const bestBundle = await cartAgent.suggestBundle(cartParams, userId);
      console.log(`[${sessionId}] Bundle created with ${bestBundle.items.length} items`);

      // Step 4: Apply promotions (Agent-to-Agent negotiation)
      console.log(`[${sessionId}] Step 4: Negotiating promotions...`);
      const negotiationParams: NegotiationParams = {
        items: bestBundle.items,
        userId,
        totalAmount: bestBundle.totalPrice,
        retailers: [...new Set(bestBundle.items.map(item => item.product.merchantId).filter((id): id is string => !!id))],
      };

      const negotiationResult = await promotionsAgent.applyPromos(negotiationParams);
      console.log(`[${sessionId}] Negotiation ${negotiationResult.success ? 'succeeded' : 'failed'}`);

      // Apply promotions to final cart
      const finalCart = await this.applyPromotionsToCart(
        bestBundle,
        negotiationResult
      );

      // Step 5: Calculate analytics
      const analytics = this.calculateAnalytics(
        finalCart,
        baselineRisk,
        bestBundle.averageReturnRisk,
        negotiationResult,
        Date.now() - startTime
      );

      // Step 6: Persist interaction to SmartMemory
      await this.persistInteraction(userId, sessionId, goal, finalCart, analytics);

      // Combine recommendations
      const recommendations = [
        ...finalCart.recommendations,
        ...(negotiationResult.success
          ? [`🎉 Unlocked $${negotiationResult.totalSavings.toFixed(2)} in promotions!`]
          : []),
      ];

      return {
        finalCart,
        analytics,
        recommendations,
        sessionId,
      };
    } catch (error) {
      console.error(`[${sessionId}] Error in agentic workflow:`, error);
      throw error;
    }
  }

  /**
   * Apply promotions to cart bundle
   */
  private async applyPromotionsToCart(
    bundle: CartBundle,
    negotiationResult: NegotiationResult
  ): Promise<CartBundle> {
    if (!negotiationResult.success || negotiationResult.promotions.length === 0) {
      return bundle;
    }

    // Apply discounts to items
    const itemsWithPromos = bundle.items.map(item => {
      const applicablePromos = negotiationResult.promotions.filter(promo =>
        promo.applicableItems.includes(item.product.id)
      );

      let finalPrice = item.finalPrice;
      let discount = 0;

      for (const promo of applicablePromos) {
        if (promo.discount) {
          const discountAmount = (finalPrice * promo.discount) / 100;
          finalPrice -= discountAmount;
          discount += promo.discount;
        } else if (promo.amount) {
          finalPrice -= promo.amount;
          discount += (promo.amount / item.finalPrice) * 100;
        }
      }

      return {
        ...item,
        finalPrice: Math.max(0, Math.round(finalPrice * 100) / 100),
        discount: discount > 0 ? Math.round(discount * 100) / 100 : undefined,
      };
    });

    // Recalculate totals
    const totalPrice = itemsWithPromos.reduce(
      (sum, item) => sum + item.finalPrice * item.quantity,
      0
    );
    const totalSavings = bundle.totalSavings + negotiationResult.totalSavings;

    return {
      ...bundle,
      items: itemsWithPromos,
      totalPrice: Math.round(totalPrice * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      recommendations: [
        ...bundle.recommendations,
        `💰 Additional $${negotiationResult.totalSavings.toFixed(2)} saved via promotions!`,
      ],
    };
  }

  /**
   * Calculate analytics for business impact
   */
  private calculateAnalytics(
    finalCart: CartBundle,
    baselineRisk: number,
    optimizedRisk: number,
    negotiationResult: NegotiationResult,
    processingTime: number
  ): CartAnalytics {
    // Calculate risk reduction
    const riskDrop = baselineRisk - optimizedRisk;
    const riskDropPercentage = baselineRisk > 0
      ? (riskDrop / baselineRisk) * 100
      : 0;

    // Calculate AOV delta (simplified - in production, compare to user's historical AOV)
    const aovDelta = finalCart.totalPrice - 75; // Assume baseline AOV of $75
    const aovDeltaPercentage = aovDelta / 75 * 100;

    // Calculate savings percentage
    const savingsPercentage = finalCart.totalPrice > 0
      ? (finalCart.totalSavings / (finalCart.totalPrice + finalCart.totalSavings)) * 100
      : 0;

    return {
      savings: Math.round(finalCart.totalSavings * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      riskDrop: Math.round(riskDrop * 100) / 100,
      riskDropPercentage: Math.round(riskDropPercentage * 100) / 100,
      aovDelta: Math.round(aovDelta * 100) / 100,
      aovDeltaPercentage: Math.round(aovDeltaPercentage * 100) / 100,
      totalItems: finalCart.items.length,
      averageReturnRisk: Math.round(optimizedRisk * 100) / 100,
      bundleScore: finalCart.bundleScore,
      negotiationSuccess: negotiationResult.success,
      processingTime,
    };
  }

  /**
   * Persist interaction to SmartMemory
   */
  private async persistInteraction(
    userId: string,
    sessionId: string,
    goal: UserGoal,
    finalCart: CartBundle,
    analytics: CartAnalytics
  ): Promise<void> {
    try {
      const interaction = {
        sessionId,
        intent: goal.intent,
        params: goal.params,
        finalCart: {
          itemCount: finalCart.items.length,
          totalPrice: finalCart.totalPrice,
          totalSavings: finalCart.totalSavings,
          averageReturnRisk: finalCart.averageReturnRisk,
        },
        analytics,
        timestamp: Date.now(),
      };

      await userMemory.append(`${userId}-shop-session`, interaction);
    } catch (error) {
      console.warn('Failed to persist interaction to SmartMemory:', error);
      // Non-critical - continue without persistence
    }
  }

  /**
   * Get user shopping history
   */
  async getUserShoppingHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const history = await userMemory.get(`${userId}-shop-session`);
      if (Array.isArray(history)) {
        return history.slice(-limit).reverse();
      }
      return [];
    } catch (error) {
      console.warn('Failed to get shopping history:', error);
      return [];
    }
  }
}

export const retailOrchestrator = new RetailOrchestrator();

