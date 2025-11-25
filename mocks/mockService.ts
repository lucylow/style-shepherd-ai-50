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
  status: string;
  metadata?: Record<string, string>;
}

export class MockPaymentService {
  private paymentIntents: Map<string, any> = new Map();
  private orders: Map<string, any> = new Map();

  /**
   * Create a mock payment intent
   */
  async createPaymentIntent(order: Order): Promise<MockPaymentIntent> {
    const paymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientSecret = `${paymentIntentId}_secret_mock`;
    
    // Store for later retrieval
    this.paymentIntents.set(paymentIntentId, {
      id: paymentIntentId,
      client_secret: clientSecret,
      amount: Math.round(order.totalAmount * 100),
      currency: 'usd',
      status: 'requires_payment_method',
      metadata: {
        userId: order.userId,
        orderId: `order_${Date.now()}`,
      },
    });

    // Mock return prediction
    const returnPrediction = {
      score: 0.25,
      riskLevel: 'low' as const,
      factors: ['Good size match', 'Style alignment'],
      suggestions: ['This order has good compatibility with your profile'],
    };

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

