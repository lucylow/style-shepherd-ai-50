/**
 * Mock Payment Service
 * Use this in development when you want to bypass Stripe API calls
 * 
 * Usage:
 * import { mockPaymentService } from './mocks/mockService';
 * 
 * // In your PaymentService, add a check:
 * if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_STRIPE === 'true') {
 *   return mockPaymentService.createPaymentIntent(order);
 * }
 */

import type { Order } from '../server/src/services/PaymentService';

export interface MockPaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  returnPrediction: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    suggestions: string[];
  };
}

export interface MockCheckoutSession {
  url: string;
  sessionId: string;
}

export interface MockInvoice {
  id: string;
  customer: string;
  amount_due: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  metadata?: Record<string, string>;
  created_at?: string;
  description?: string;
}

export interface PaymentIntentData {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  metadata: Record<string, string>;
  created: number;
}

export class MockPaymentService {
  private paymentIntents: Map<string, PaymentIntentData> = new Map();
  private orders: Map<string, Order> = new Map();
  private invoices: Map<string, MockInvoice> = new Map();
  private readonly STORAGE_KEY = 'mock_payment_service_data';
  private readonly PERSIST_TO_STORAGE = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load data from localStorage if available
   */
  private loadFromStorage(): void {
    if (!this.PERSIST_TO_STORAGE) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.paymentIntents) {
          this.paymentIntents = new Map(data.paymentIntents);
        }
        if (data.orders) {
          this.orders = new Map(data.orders);
        }
        if (data.invoices) {
          this.invoices = new Map(data.invoices);
        }
      }
    } catch (error) {
      console.warn('Failed to load mock payment service data from storage:', error);
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    if (!this.PERSIST_TO_STORAGE) return;

    try {
      const data = {
        paymentIntents: Array.from(this.paymentIntents.entries()),
        orders: Array.from(this.orders.entries()),
        invoices: Array.from(this.invoices.entries()),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save mock payment service data to storage:', error);
    }
  }

  /**
   * Generate realistic return prediction based on order
   */
  private generateReturnPrediction(order: Order): {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    suggestions: string[];
  } {
    // Simulate realistic return prediction logic
    let score = 0.3; // Base return risk
    const factors: string[] = [];
    const suggestions: string[] = [];

    // Adjust based on order value (higher value = slightly higher risk)
    if (order.totalAmount > 200) {
      score += 0.1;
      factors.push('Higher order value');
    }

    // Adjust based on number of items (more items = slightly higher risk)
    const itemCount = order.items?.length || 0;
    if (itemCount > 3) {
      score += 0.05;
      factors.push('Multiple items in order');
    }

    // Random variation for realism
    score += (Math.random() - 0.5) * 0.2;
    score = Math.max(0.05, Math.min(0.95, score)); // Clamp between 5% and 95%

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (score < 0.3) {
      riskLevel = 'low';
      factors.push('Good size match', 'Style alignment');
      suggestions.push('This order has good compatibility with your profile');
    } else if (score < 0.6) {
      riskLevel = 'medium';
      factors.push('Moderate size confidence', 'Some style variation');
      suggestions.push('Consider reviewing size charts before ordering');
    } else {
      riskLevel = 'high';
      factors.push('Size uncertainty', 'Style mismatch risk');
      suggestions.push('We recommend double-checking measurements', 'Consider ordering multiple sizes');
    }

    return {
      score: Math.round(score * 100) / 100,
      riskLevel,
      factors,
      suggestions,
    };
  }

  /**
   * Create a mock payment intent with realistic data
   */
  async createPaymentIntent(order: Order): Promise<MockPaymentIntent> {
    if (!order || !order.userId) {
      throw new Error('Invalid order: userId is required');
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    const paymentIntentId = `pi_mock_${timestamp}_${randomSuffix}`;
    const clientSecret = `${paymentIntentId}_secret_mock_${randomSuffix}`;
    const orderId = order.orderId || `order_${timestamp}`;
    
    // Store payment intent
    const paymentIntentData: PaymentIntentData = {
      id: paymentIntentId,
      client_secret: clientSecret,
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: order.currency || 'usd',
      status: 'requires_payment_method',
      metadata: {
        userId: order.userId,
        orderId,
        integration: 'style-shepherd',
      },
      created: Math.floor(timestamp / 1000),
    };

    this.paymentIntents.set(paymentIntentId, paymentIntentData);
    this.orders.set(orderId, order);
    this.saveToStorage();

    // Generate realistic return prediction
    const returnPrediction = this.generateReturnPrediction(order);

    return {
      clientSecret,
      paymentIntentId,
      returnPrediction,
    };
  }

  /**
   * Create a mock checkout session
   */
  async createCheckoutSession(params: {
    priceId: string;
    mode: 'subscription' | 'payment';
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<MockCheckoutSession> {
    const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      url: `https://checkout.stripe.com/pay/${sessionId}`,
      sessionId,
    };
  }

  /**
   * Simulate payment success
   */
  async simulatePaymentSuccess(paymentIntentId: string): Promise<void> {
    const intent = this.paymentIntents.get(paymentIntentId);
    if (intent) {
      intent.status = 'succeeded';
      this.paymentIntents.set(paymentIntentId, intent);
    }
  }

  /**
   * Create a mock invoice for performance billing
   */
  async createInvoice(params: {
    customer: string;
    amount: number;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<MockInvoice> {
    const invoiceId = `in_mock_${Date.now()}`;
    
    const invoice = {
      id: invoiceId,
      customer: params.customer,
      amount_due: params.amount,
      currency: 'usd',
      status: 'open',
      description: params.description,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    };

    return invoice;
  }

  /**
   * Compute commission for performance billing
   */
  computeCommission(params: {
    order_value_cents: number;
    predicted_return_before: number;
    predicted_return_after: number;
    commission_rate?: number;
  }): {
    prevented_prob: number;
    prevented_value_cents: number;
    commission_amount_cents: number;
  } {
    const preventedProb = params.predicted_return_before - params.predicted_return_after;
    const preventedValueCents = Math.round(params.order_value_cents * preventedProb);
    const commissionRate = params.commission_rate || 0.15;
    const commissionAmountCents = Math.round(preventedValueCents * commissionRate);

    return {
      prevented_prob: preventedProb,
      prevented_value_cents: preventedValueCents,
      commission_amount_cents: commissionAmountCents,
    };
  }

  /**
   * Create a mock webhook event
   */
  createWebhookEvent(type: string, data: any): any {
    return {
      id: `evt_mock_${Date.now()}`,
      type,
      data: {
        object: data,
      },
      created: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Get mock payment intent
   */
  getPaymentIntent(paymentIntentId: string): any {
    return this.paymentIntents.get(paymentIntentId);
  }
}

export const mockPaymentService = new MockPaymentService();

// Example webhook event generators
export const mockWebhookEvents = {
  paymentIntentSucceeded: (paymentIntentId: string, orderId: string) => ({
    id: `evt_${Date.now()}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 1999,
        currency: 'usd',
        status: 'succeeded',
        metadata: { orderId, integration: 'style-shepherd' },
        charges: {
          data: [
            {
              id: `ch_${Date.now()}`,
              status: 'succeeded',
              amount: 1999,
              payment_method_details: {
                card: { brand: 'visa', last4: '4242' },
              },
            },
          ],
        },
      },
    },
  }),

  invoicePaymentSucceeded: (invoiceId: string, subscriptionId: string) => ({
    id: `evt_${Date.now()}`,
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: invoiceId,
        object: 'invoice',
        customer_email: 'bob@example.com',
        amount_paid: 1999,
        currency: 'usd',
        subscription: subscriptionId,
        lines: {
          data: [
            {
              price: { id: 'price_ProMonthly_001' },
              quantity: 1,
            },
          ],
        },
      },
    },
  }),

  invoicePaymentFailed: (invoiceId: string) => ({
    id: `evt_${Date.now()}`,
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: invoiceId,
        customer: 'cus_retailer_001',
        amount_due: 12000,
        status: 'open',
      },
    },
  }),

  chargeRefunded: (chargeId: string) => ({
    id: `evt_${Date.now()}`,
    type: 'charge.refunded',
    data: {
      object: {
        id: chargeId,
        amount: 1999,
        currency: 'usd',
        refunded: true,
      },
    },
  }),

  disputeCreated: (disputeId: string, chargeId: string) => ({
    id: `evt_${Date.now()}`,
    type: 'charge.dispute.created',
    data: {
      object: {
        id: disputeId,
        charge: chargeId,
        amount: 1999,
        currency: 'usd',
        status: 'needs_response',
        reason: 'fraudulent',
      },
    },
  }),
};

