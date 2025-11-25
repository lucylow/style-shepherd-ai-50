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

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

class PaymentService {
  private API_BASE = getApiBaseUrl();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  /**
   * Retry wrapper for API calls
   */
  private async retryApiCall<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < retries - 1) {
          const delay = this.RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create a payment intent for Stripe
   * Calls the backend API to create a Stripe PaymentIntent
   */
  async createPaymentIntent(
    items: CartItem[],
    userId: string,
    shippingInfo?: ShippingInfo,
    idempotencyKey?: string
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

    return this.retryApiCall(async () => {
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

      // Use idempotent endpoint if key provided
      const endpoint = idempotencyKey 
        ? `${this.API_BASE}/payments/intent-idempotent`
        : `${this.API_BASE}/payments/intent`;
      
      if (idempotencyKey) {
        requestBody.idempotencyKey = idempotencyKey;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to create payment intent: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      
      // Return in format expected by frontend
      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        returnPrediction: data.returnPrediction,
      };
    });
  }

  /**
   * Generate idempotency key for payment
   */
  generateIdempotencyKey(userId: string, items: CartItem[]): string {
    const itemsHash = items
      .map(item => `${item.product.id}-${item.quantity}`)
      .sort()
      .join(',');
    return `${userId}-${Date.now()}-${btoa(itemsHash).substring(0, 16)}`;
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
    return this.retryApiCall(async () => {
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
        const error = new Error(errorData.message || `Failed to confirm payment: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    });
  }

  /**
   * Get saved payment methods for a user
   */
  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    return this.retryApiCall(async () => {
      const response = await fetch(`${this.API_BASE}/payments/payment-methods/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to get payment methods: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data.paymentMethods || [];
    });
  }

  /**
   * Attach payment method to user
   */
  async attachPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentMethod> {
    return this.retryApiCall(async () => {
      const response = await fetch(`${this.API_BASE}/payments/payment-methods/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to attach payment method: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      return data.paymentMethod;
    });
  }

  /**
   * Detach payment method from user
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    return this.retryApiCall(async () => {
      const response = await fetch(`${this.API_BASE}/payments/payment-methods/detach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to detach payment method: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }
    });
  }

  /**
   * Set default payment method for user
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    return this.retryApiCall(async () => {
      const response = await fetch(`${this.API_BASE}/payments/payment-methods/set-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `Failed to set default payment method: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }
    });
  }
}

export const paymentService = new PaymentService();

