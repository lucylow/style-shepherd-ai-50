/**
 * Cart Agent - Optimizes cart bundles and manages checkout
 * Suggests optimal cart combinations to minimize risk and maximize value
 */

import { userMemory, orderSQL } from '../../lib/raindrop-config.js';
import { vultrValkey } from '../../lib/vultr-valkey.js';
import type { Product } from './SearchAgent.js';
import type { ReturnRiskPrediction } from './ReturnsAgent.js';

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
  returnRisk?: ReturnRiskPrediction;
  finalPrice: number;
  originalPrice: number;
  discount?: number;
}

export interface CartBundle {
  items: CartItem[];
  totalPrice: number;
  totalSavings: number;
  averageReturnRisk: number;
  bundleScore: number; // Higher is better
  recommendations: string[];
}

export interface CartOptimizationParams {
  products: Array<{
    product: Product;
    quantity?: number;
    size?: string;
    returnRisk?: ReturnRiskPrediction;
  }>;
  maxItems?: number;
  budget?: number;
  minimizeRisk?: boolean;
  maximizeValue?: boolean;
}

export class CartAgent {
  private readonly MAX_CART_SIZE = 10;
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Suggest optimal cart bundle from candidate products
   */
  async suggestBundle(
    params: CartOptimizationParams,
    userId?: string
  ): Promise<CartBundle> {
    const startTime = Date.now();

    try {
      // Get user preferences and history
      let userProfile: any = null;
      if (userId) {
        try {
          userProfile = await userMemory.get(userId);
        } catch (error) {
          console.warn('Failed to get user profile:', error);
        }
      }

      // Score each product
      const scoredProducts = await Promise.all(
        params.products.map(async (item) => {
          const score = await this.scoreProduct(
            item.product,
            item.returnRisk,
            userProfile,
            params
          );
          return {
            ...item,
            score,
          };
        })
      );

      // Sort by score (descending)
      scoredProducts.sort((a, b) => b.score - a.score);

      // Build optimal bundle
      const bundle = await this.buildOptimalBundle(
        scoredProducts,
        params,
        userProfile
      );

      // Calculate bundle metrics
      const totalPrice = bundle.items.reduce(
        (sum, item) => sum + item.finalPrice * item.quantity,
        0
      );
      const totalSavings = bundle.items.reduce(
        (sum, item) => sum + (item.originalPrice - item.finalPrice) * item.quantity,
        0
      );
      const averageReturnRisk = bundle.items.length > 0
        ? bundle.items.reduce(
            (sum, item) => sum + (item.returnRisk?.riskScore || 0.25),
            0
          ) / bundle.items.length
        : 0.25;

      // Calculate bundle score (higher is better)
      const bundleScore = this.calculateBundleScore(
        bundle.items,
        totalPrice,
        totalSavings,
        averageReturnRisk,
        params
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        bundle.items,
        totalSavings,
        averageReturnRisk,
        userProfile
      );

      return {
        items: bundle.items,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        averageReturnRisk: Math.round(averageReturnRisk * 100) / 100,
        bundleScore: Math.round(bundleScore * 100) / 100,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Cart optimization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Score a product for inclusion in cart
   */
  private async scoreProduct(
    product: Product,
    returnRisk: ReturnRiskPrediction | undefined,
    userProfile: any,
    params: CartOptimizationParams
  ): Promise<number> {
    let score = 0.5; // Base score

    // Factor 1: Return risk (lower is better)
    const risk = returnRisk?.riskScore || 0.25;
    score += (1 - risk) * 0.3; // 30% weight

    // Factor 2: Price (if budget is set)
    if (params.budget) {
      if (product.price <= params.budget * 0.8) {
        score += 0.2; // Good price
      } else if (product.price > params.budget) {
        score -= 0.3; // Over budget
      }
    }

    // Factor 3: User preferences
    if (userProfile) {
      if (userProfile.preferences?.favoriteColors?.includes(product.color || '')) {
        score += 0.15;
      }
      if (userProfile.preferences?.preferredBrands?.includes(product.brand)) {
        score += 0.15;
      }
    }

    // Factor 4: Product rating
    if (product.rating) {
      score += (product.rating / 5) * 0.1;
    }

    // Factor 5: Availability
    if (product.inStock) {
      score += 0.1;
    } else {
      score -= 0.2;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Build optimal bundle from scored products
   */
  private async buildOptimalBundle(
    scoredProducts: Array<{
      product: Product;
      quantity?: number;
      size?: string;
      returnRisk?: ReturnRiskPrediction;
      score: number;
    }>,
    params: CartOptimizationParams,
    userProfile: any
  ): Promise<{ items: CartItem[] }> {
    const items: CartItem[] = [];
    let totalPrice = 0;
    const maxItems = params.maxItems || this.MAX_CART_SIZE;
    const budget = params.budget;

    for (const item of scoredProducts) {
      if (items.length >= maxItems) break;

      const quantity = item.quantity || 1;
      const itemPrice = item.product.price * quantity;

      // Check budget constraint
      if (budget && totalPrice + itemPrice > budget) {
        continue;
      }

      // Add item to bundle
      items.push({
        product: item.product,
        quantity,
        size: item.size,
        returnRisk: item.returnRisk,
        finalPrice: item.product.price,
        originalPrice: item.product.price,
      });

      totalPrice += itemPrice;
    }

    return { items };
  }

  /**
   * Calculate bundle score
   */
  private calculateBundleScore(
    items: CartItem[],
    totalPrice: number,
    totalSavings: number,
    averageReturnRisk: number,
    params: CartOptimizationParams
  ): number {
    let score = 0.5; // Base score

    // Factor 1: Value (savings)
    if (totalPrice > 0) {
      const savingsRatio = totalSavings / totalPrice;
      score += savingsRatio * 0.3;
    }

    // Factor 2: Risk (lower is better)
    score += (1 - averageReturnRisk) * 0.4;

    // Factor 3: Bundle size (more items = better, up to a point)
    const itemCount = items.length;
    if (itemCount > 0) {
      score += Math.min(itemCount / 5, 1) * 0.2;
    }

    // Factor 4: Optimization goals
    if (params.minimizeRisk) {
      score += (1 - averageReturnRisk) * 0.1;
    }
    if (params.maximizeValue) {
      if (totalPrice > 0) {
        score += (totalSavings / totalPrice) * 0.1;
      }
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Generate recommendations for the cart
   */
  private generateRecommendations(
    items: CartItem[],
    totalSavings: number,
    averageReturnRisk: number,
    userProfile: any
  ): string[] {
    const recommendations: string[] = [];

    if (totalSavings > 0) {
      recommendations.push(
        `💰 You saved $${totalSavings.toFixed(2)} via smart bundling!`
      );
    }

    if (averageReturnRisk < 0.3) {
      recommendations.push(
        `✅ Your cart's return risk is ${(averageReturnRisk * 100).toFixed(0)}% (low risk)`
      );
    } else if (averageReturnRisk > 0.6) {
      recommendations.push(
        `⚠️ Your cart's return risk is ${(averageReturnRisk * 100).toFixed(0)}% - consider reviewing size recommendations`
      );
    }

    // Check for missing sizes
    const itemsWithoutSize = items.filter(item => !item.size);
    if (itemsWithoutSize.length > 0) {
      recommendations.push(
        `📏 ${itemsWithoutSize.length} item(s) need size selection - use our size recommendation tool`
      );
    }

    // Check for high-risk items
    const highRiskItems = items.filter(
      item => item.returnRisk && item.returnRisk.riskScore > 0.6
    );
    if (highRiskItems.length > 0) {
      recommendations.push(
        `⚠️ ${highRiskItems.length} item(s) have high return risk - review before checkout`
      );
    }

    return recommendations;
  }

  /**
   * Optimize existing cart (reorder, remove high-risk items, etc.)
   */
  async optimizeCart(
    items: CartItem[],
    userId?: string
  ): Promise<CartBundle> {
    return this.suggestBundle(
      {
        products: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          size: item.size,
          returnRisk: item.returnRisk,
        })),
        minimizeRisk: true,
        maximizeValue: true,
      },
      userId
    );
  }
}

export const cartAgent = new CartAgent();

