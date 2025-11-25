import { CartItem } from '@/types/fashion';
import { getApiBaseUrl } from '@/lib/api-config';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  returnPrediction?: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    suggestions: string[];
  };
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface ShippingInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

class PaymentService {
  private API_BASE = getApiBaseUrl();

  /**
   * Create a payment intent for Stripe
   * Calls the backend API to create a Stripe PaymentIntent
   */
  async createPaymentIntent(
    items: CartItem[],
    userId: string,
    shippingInfo?: ShippingInfo
  ): Promise<PaymentIntent> {
    // Calculate total amount (including tax and shipping if needed)
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    
    // For now, use subtotal as totalAmount
    // In production, you might want to calculate tax and shipping separately
    const totalAmount = subtotal;

    // Transform CartItem[] to backend format
    const backendItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      size: item.size || 'M', // Default size if not specified
    }));

    try {
      const requestBody: any = {
        userId,
        items: backendItems,
        totalAmount,
      };

      // Include shippingInfo if provided
      if (shippingInfo) {
        requestBody.shippingInfo = {
          name: shippingInfo.name,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zip: shippingInfo.zipCode, // Backend expects 'zip', frontend uses 'zipCode'
          country: shippingInfo.country,
        };
      }

      const response = await fetch(`${this.API_BASE}/payments/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create payment intent: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Return in format expected by frontend
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        returnPrediction: data.returnPrediction,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      throw new Error(error.message || 'Failed to create payment intent. Please try again.');
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
    cancelUrl: string,
    shippingInfo?: ShippingInfo
  ): Promise<CheckoutSession> {
    // Use payment intent for checkout session
    const paymentIntent = await this.createPaymentIntent(items, userId, shippingInfo);
    
    // Return checkout session format compatible with frontend
    return {
      sessionId: paymentIntent.clientSecret,
      url: successUrl, // Frontend will handle redirect after payment
    };
  }

  /**
   * Confirm payment and create order
   * This should be called after payment is confirmed on the frontend
   */
  async confirmPayment(
    paymentIntentId: string,
    items: CartItem[],
    userId: string,
    shippingInfo: ShippingInfo
  ): Promise<{ orderId: string; status: string }> {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    const backendItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      size: item.size || 'M',
    }));

    try {
      const response = await fetch(`${this.API_BASE}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          order: {
            userId,
            items: backendItems,
            totalAmount,
            shippingInfo: {
              name: shippingInfo.name,
              address: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              zip: shippingInfo.zipCode,
              country: shippingInfo.country,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to confirm payment: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      throw new Error(error.message || 'Failed to confirm payment. Please try again.');
    }
  }
}

export const paymentService = new PaymentService();

