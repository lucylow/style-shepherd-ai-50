/**
 * Promotions Agent - Agent-to-Agent Pattern
 * Negotiates with retailer AI agents for discounts and bundle deals
 */

import { vultrValkey } from '../../lib/vultr-valkey.js';
import type { CartItem } from './CartAgent.js';

export interface Promotion {
  id: string;
  type: 'discount' | 'bundle' | 'free_shipping' | 'cashback';
  discount?: number; // Percentage (0-100)
  amount?: number; // Fixed amount
  description: string;
  applicableItems: string[]; // Product IDs
  minPurchase?: number;
  expiresAt?: Date;
}

export interface NegotiationResult {
  success: boolean;
  promotions: Promotion[];
  totalSavings: number;
  negotiationTime: number;
  retailerResponses: RetailerResponse[];
}

export interface RetailerResponse {
  retailerId: string;
  retailerName: string;
  accepted: boolean;
  promotion?: Promotion;
  reason?: string;
}

export interface NegotiationParams {
  items: CartItem[];
  userId?: string;
  totalAmount: number;
  retailers: string[]; // Merchant IDs
}

export class PromotionsAgent {
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly NEGOTIATION_TIMEOUT = 5000; // 5 seconds

  /**
   * Apply promotions to cart (Agent-to-Agent negotiation)
   */
  async applyPromos(params: NegotiationParams): Promise<NegotiationResult> {
    const startTime = Date.now();

    try {
      // Get unique retailers from items
      const retailers = new Set(
        params.items
          .map(item => item.product.merchantId)
          .filter((id): id is string => !!id)
      );

      // Negotiate with each retailer's AI agent
      const negotiations = await Promise.all(
        Array.from(retailers).map(retailerId =>
          this.negotiateWithRetailer(retailerId, params)
        )
      );

      // Apply promotions to items
      const promotions: Promotion[] = [];
      const retailerResponses: RetailerResponse[] = [];

      for (const negotiation of negotiations) {
        if (negotiation.accepted && negotiation.promotion) {
          promotions.push(negotiation.promotion);
        }
        retailerResponses.push(negotiation);
      }

      // Calculate total savings
      const totalSavings = this.calculateTotalSavings(params.items, promotions);

      // Apply discounts to items
      const itemsWithPromos = this.applyDiscountsToItems(params.items, promotions);

      return {
        success: promotions.length > 0,
        promotions,
        totalSavings,
        negotiationTime: Date.now() - startTime,
        retailerResponses,
      };
    } catch (error) {
      console.error('Promotion negotiation failed:', error);
      return {
        success: false,
        promotions: [],
        totalSavings: 0,
        negotiationTime: Date.now() - startTime,
        retailerResponses: [],
      };
    }
  }

  /**
   * Negotiate with a retailer's AI agent (Agent-to-Agent pattern)
   */
  private async negotiateWithRetailer(
    retailerId: string,
    params: NegotiationParams
  ): Promise<RetailerResponse> {
    // In production, this would:
    // 1. Call retailer's AI agent API
    // 2. Send cart details and negotiation request
    // 3. Receive promotion offer
    // 4. Accept/negotiate further if needed

    // For now, simulate negotiation with mock logic
    const retailerItems = params.items.filter(
      item => item.product.merchantId === retailerId
    );

    if (retailerItems.length === 0) {
      return {
        retailerId,
        retailerName: this.getRetailerName(retailerId),
        accepted: false,
        reason: 'No items from this retailer in cart',
      };
    }

    const retailerTotal = retailerItems.reduce(
      (sum, item) => sum + item.finalPrice * item.quantity,
      0
    );

    // Simulate retailer AI agent decision
    // Higher cart value = better chance of promotion
    let promotion: Promotion | undefined;

    if (retailerTotal >= 100) {
      // Bundle discount for high-value carts
      promotion = {
        id: `promo_${retailerId}_${Date.now()}`,
        type: 'bundle',
        discount: 15,
        description: `15% bundle discount on orders over $100`,
        applicableItems: retailerItems.map(item => item.product.id),
        minPurchase: 100,
      };
    } else if (retailerTotal >= 50) {
      // Smaller discount for medium-value carts
      promotion = {
        id: `promo_${retailerId}_${Date.now()}`,
        type: 'discount',
        discount: 10,
        description: `10% discount on orders over $50`,
        applicableItems: retailerItems.map(item => item.product.id),
        minPurchase: 50,
      };
    } else if (retailerItems.length >= 3) {
      // Free shipping for multiple items
      promotion = {
        id: `promo_${retailerId}_${Date.now()}`,
        type: 'free_shipping',
        description: `Free shipping on 3+ items`,
        applicableItems: retailerItems.map(item => item.product.id),
      };
    }

    // Store negotiation state in Valkey (for multi-step negotiations)
    if (promotion) {
      try {
        await vultrValkey.set(
          `negotiation:${retailerId}:${params.userId || 'guest'}`,
          {
            promotion,
            timestamp: Date.now(),
          },
          300 // 5 minutes
        );
      } catch (error) {
        console.warn('Failed to cache negotiation state:', error);
      }
    }

    return {
      retailerId,
      retailerName: this.getRetailerName(retailerId),
      accepted: !!promotion,
      promotion,
      reason: promotion
        ? 'Promotion offered by retailer AI agent'
        : 'No promotion available for this cart value',
    };
  }

  /**
   * Calculate total savings from promotions
   */
  private calculateTotalSavings(
    items: CartItem[],
    promotions: Promotion[]
  ): number {
    let totalSavings = 0;

    for (const promotion of promotions) {
      const applicableItems = items.filter(item =>
        promotion.applicableItems.includes(item.product.id)
      );

      for (const item of applicableItems) {
        if (promotion.discount) {
          const discountAmount =
            (item.finalPrice * item.quantity * promotion.discount) / 100;
          totalSavings += discountAmount;
        } else if (promotion.amount) {
          totalSavings += promotion.amount;
        }
      }
    }

    return Math.round(totalSavings * 100) / 100;
  }

  /**
   * Apply discounts to cart items
   */
  private applyDiscountsToItems(
    items: CartItem[],
    promotions: Promotion[]
  ): CartItem[] {
    return items.map(item => {
      const applicablePromos = promotions.filter(promo =>
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
        originalPrice: item.originalPrice,
        discount: discount > 0 ? Math.round(discount * 100) / 100 : undefined,
      };
    });
  }

  /**
   * Get retailer name from ID
   */
  private getRetailerName(retailerId: string): string {
    const retailerNames: Record<string, string> = {
      merchant_1: 'StyleCo Store',
      merchant_2: 'FashionHub',
      merchant_3: 'DesignerBrand Boutique',
    };

    return retailerNames[retailerId] || retailerId;
  }

  /**
   * Get available promotions for a user
   */
  async getAvailablePromotions(userId?: string): Promise<Promotion[]> {
    // In production, this would fetch from retailer APIs or database
    // For now, return mock promotions
    return [
      {
        id: 'promo_1',
        type: 'discount',
        discount: 10,
        description: '10% off your first order',
        applicableItems: [],
        minPurchase: 25,
      },
      {
        id: 'promo_2',
        type: 'free_shipping',
        description: 'Free shipping on orders over $50',
        applicableItems: [],
        minPurchase: 50,
      },
    ];
  }
}

export const promotionsAgent = new PromotionsAgent();

