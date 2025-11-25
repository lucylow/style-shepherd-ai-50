/**
 * Stripe Payment Service
 * Handles payments and returns prediction
 */

import Stripe from 'stripe';
import env from '../config/env.js';
import { orderSQL } from '../lib/raindrop-config.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import { productRecommendationAPI } from './ProductRecommendationAPI.js';
import {
  PaymentError,
  BusinessLogicError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
  ErrorCode,
} from '../lib/errors.js';

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  size: string;
}

export interface Order {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ReturnPrediction {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  suggestions: string[];
}

export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(order: Order): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    returnPrediction: ReturnPrediction;
  }> {
    // Validate order
    if (!order.userId) {
      throw new BusinessLogicError('User ID is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!order.items || order.items.length === 0) {
      throw new BusinessLogicError('Order must contain at least one item', ErrorCode.VALIDATION_ERROR);
    }
    if (order.totalAmount <= 0) {
      throw new BusinessLogicError('Order total must be greater than zero', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Calculate return risk before payment
      const returnPrediction = await this.createReturnPrediction(order);

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId: order.userId,
          orderId: `order_${Date.now()}`,
          returnRiskScore: returnPrediction.score.toString(),
        },
      });

      if (!paymentIntent.client_secret) {
        throw new PaymentError('Failed to create payment intent - no client secret returned');
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        returnPrediction,
      };
    } catch (error: any) {
      if (error instanceof PaymentError || error instanceof BusinessLogicError) {
        throw error;
      }
      
      // Stripe API errors
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError(
          `Payment service error: ${error.message || 'Unknown error'}`,
          error,
          { code: error.code, type: error.type }
        );
      }
      
      throw new ExternalServiceError('Stripe', 'Failed to create payment intent', error);
    }
  }

  /**
   * Create return prediction using Vultr ML service
   */
  async createReturnPrediction(order: Order): Promise<ReturnPrediction> {
    try {
      // Get user return history
      const returnHistory = await vultrPostgres.query(
        'SELECT * FROM returns WHERE user_id = $1',
        [order.userId]
      );

      // Get user profile for preferences
      const userProfile = await vultrPostgres.query(
        'SELECT preferences, body_measurements FROM user_profiles WHERE user_id = $1',
        [order.userId]
      );

      // Use Vultr ML service for prediction
      const prediction = await productRecommendationAPI.getRecommendations(
        userProfile[0]?.preferences || {},
        { budget: order.totalAmount }
      );

      // Calculate aggregate return risk
      const avgReturnRisk = prediction.reduce((sum, p) => sum + p.returnRisk, 0) / prediction.length;
      const userReturnRate = returnHistory.length / Math.max(1, returnHistory.length + 5);

      const riskScore = (avgReturnRisk * 0.6) + (userReturnRate * 0.4);
      const riskLevel = riskScore < 0.3 ? 'low' : riskScore < 0.6 ? 'medium' : 'high';

      // Store prediction in database
      await orderSQL.insert('return_predictions', {
        order_id: `order_${Date.now()}`,
        user_id: order.userId,
        prediction_score: riskScore,
        risk_factors: JSON.stringify([
          riskScore > 0.5 ? 'Size mismatch risk' : null,
          riskScore > 0.4 ? 'Color preference mismatch' : null,
          userReturnRate > 0.3 ? 'Higher than average return history' : null,
        ].filter(Boolean)),
        created_at: new Date().toISOString(),
      });

      return {
        score: riskScore,
        riskLevel,
        factors: [
          riskScore > 0.5 ? 'Size compatibility concerns' : 'Good size match',
          riskScore > 0.4 ? 'Style preference variance' : 'Style alignment',
          userReturnRate > 0.3 ? 'Historical return patterns' : 'Low return history',
        ],
        suggestions: this.getMitigationStrategies(riskLevel, riskScore),
      };
    } catch (error) {
      console.error('Return prediction error:', error);
      // Return default prediction
      return {
        score: 0.25,
        riskLevel: 'low',
        factors: ['Standard risk assessment'],
        suggestions: ['Review size chart', 'Check product reviews'],
      };
    }
  }

  /**
   * Get mitigation strategies based on risk level
   */
  private getMitigationStrategies(
    riskLevel: string,
    riskScore: number
  ): string[] {
    const strategies: string[] = [];

    if (riskLevel === 'high') {
      strategies.push('Consider trying our virtual fitting room');
      strategies.push('Review detailed size chart and measurements');
      strategies.push('Check customer reviews for sizing feedback');
    } else if (riskLevel === 'medium') {
      strategies.push('Review size recommendations based on your profile');
      strategies.push('Check product measurements');
    } else {
      strategies.push('This order has good compatibility with your profile');
    }

    return strategies;
  }

  /**
   * Confirm payment and create order
   */
  async confirmPayment(
    paymentIntentId: string,
    order: Order
  ): Promise<{ orderId: string; status: string }> {
    if (!paymentIntentId) {
      throw new BusinessLogicError('Payment intent ID is required', ErrorCode.VALIDATION_ERROR);
    }
    if (!order.userId) {
      throw new BusinessLogicError('User ID is required', ErrorCode.VALIDATION_ERROR);
    }

    try {
      // Verify payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new PaymentError(
          `Payment not succeeded: ${paymentIntent.status}`,
          undefined,
          { status: paymentIntent.status, paymentIntentId }
        );
      }

      // Create order in database
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await vultrPostgres.transaction(async (client) => {
        // Check inventory before creating order
        for (const item of order.items) {
          const productResult = await client.query(
            'SELECT stock FROM catalog WHERE id = $1',
            [item.productId]
          );
          
          if (productResult.length === 0) {
            throw new BusinessLogicError(
              `Product ${item.productId} not found`,
              ErrorCode.PRODUCT_NOT_FOUND
            );
          }
          
          const stock = productResult[0].stock;
          if (stock < item.quantity) {
            throw new BusinessLogicError(
              `Insufficient stock for product ${item.productId}. Available: ${stock}, Requested: ${item.quantity}`,
              ErrorCode.INSUFFICIENT_STOCK
            );
          }
        }

        // Insert order
        await client.query(
          `INSERT INTO orders (order_id, user_id, items, total_amount, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            orderId,
            order.userId,
            JSON.stringify(order.items),
            order.totalAmount,
            'confirmed',
            new Date().toISOString(),
          ]
        );

        // Update inventory
        for (const item of order.items) {
          await client.query(
            'UPDATE catalog SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.productId]
          );
        }
      });

      // Store in Raindrop SmartSQL (non-critical)
      try {
        await orderSQL.insert('orders', {
          id: orderId,
          user_id: order.userId,
          items: JSON.stringify(order.items),
          total: order.totalAmount,
          status: 'confirmed',
          created_at: new Date().toISOString(),
        });
      } catch (raindropError) {
        console.warn('Failed to store order in Raindrop, continuing:', raindropError);
      }

      return { orderId, status: 'confirmed' };
    } catch (error: any) {
      if (
        error instanceof PaymentError ||
        error instanceof BusinessLogicError ||
        error instanceof DatabaseError
      ) {
        throw error;
      }
      
      // Stripe API errors
      if (error.type && error.type.startsWith('Stripe')) {
        throw new PaymentError(
          `Payment verification failed: ${error.message || 'Unknown error'}`,
          error,
          { code: error.code, type: error.type }
        );
      }
      
      throw new ExternalServiceError('Stripe', 'Failed to confirm payment', error);
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret not configured');
    }

    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        console.log('Payment succeeded:', event.data.object);
        break;
      case 'payment_intent.payment_failed':
        // Handle failed payment
        console.log('Payment failed:', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}

export const paymentService = new PaymentService();

