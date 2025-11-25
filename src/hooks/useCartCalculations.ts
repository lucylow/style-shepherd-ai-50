import { useMemo } from 'react';
import { CartItem } from '@/types/fashion';

interface CartCalculations {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  totalReturnRisk: number;
  itemCount: number;
}

const SHIPPING_COST = 10.0;
const TAX_RATE = 0.08;

export const useCartCalculations = (cartItems: CartItem[]): CartCalculations => {
  return useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const shipping = SHIPPING_COST;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shipping + tax;
    
    const totalReturnRisk = cartItems.length > 0
      ? cartItems.reduce((sum, item) => {
          const risk = item.product.returnRisk || item.product.returnRiskScore ? (item.product.returnRiskScore || 0) / 100 : 0;
          return sum + risk;
        }, 0) / cartItems.length
      : 0;
    
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      shipping,
      tax,
      total,
      totalReturnRisk,
      itemCount,
    };
  }, [cartItems]);
};

