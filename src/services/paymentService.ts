import { CartItem } from '@/types/fashion';
import { getApiBaseUrl } from '@/lib/api-config';

export interface PaymentIntent {
  clientSecret: string;
  amount: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

class PaymentService {
  private API_BASE = getApiBaseUrl();

  /**
   * Create a payment intent for Stripe
   * In production, this would call your backend API
   */
  async createPaymentIntent(
    items: CartItem[],
    userId: string
  ): Promise<PaymentIntent> {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    // In production, this would be a real API call
    // For demo purposes, we'll simulate it
    try {
      const response = await fetch(`${this.API_BASE}/payments/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          userId,
          amount: Math.round(totalAmount * 100), // Convert to cents
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      // For demo: return a mock payment intent
      // In production, this should never happen
      return {
        clientSecret: 'mock_client_secret_' + Date.now(),
        amount: Math.round(totalAmount * 100),
      };
    }
  }

  /**
   * Create a Stripe checkout session
   * Note: Uses payment intent endpoint as backend uses Stripe payment intents
   */
  async createCheckoutSession(
    items: CartItem[],
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    // Use payment intent for checkout session
    const paymentIntent = await this.createPaymentIntent(items, userId);
    
    // Return checkout session format compatible with frontend
    return {
      sessionId: paymentIntent.clientSecret,
      url: successUrl, // Frontend will handle redirect after payment
    };
  }

  /**
   * Verify payment status
   * Note: Backend doesn't have a verify endpoint, using confirm endpoint instead
   */
  async verifyPayment(paymentIntentId: string): Promise<boolean> {
    try {
      // Use confirm endpoint to verify payment
      const response = await fetch(`${this.API_BASE}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'succeeded' || data.confirmed === true;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();

