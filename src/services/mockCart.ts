import { CartItem } from '@/types/fashion';
import { toast } from 'sonner';

class MockCartService {
  private CART_KEY = 'style_shepherd_cart';

  getCart(userId: string): Promise<CartItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cart = this.getCartFromStorage(userId);
        resolve(cart);
      }, 200);
    });
  }

  addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cart = this.getCartFromStorage(userId);
        
        const existingIndex = cart.findIndex(
          i => i.product.id === item.product.id && i.size === item.size
        );

        if (existingIndex >= 0) {
          cart[existingIndex].quantity += item.quantity;
          toast.success('Updated quantity in cart');
        } else {
          cart.push(item);
          toast.success('Added to cart');
        }

        this.saveCart(userId, cart);
        resolve(cart);
      }, 300);
    });
  }

  updateQuantity(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let cart = this.getCartFromStorage(userId);
        
        if (quantity === 0) {
          cart = cart.filter(item => item.product.id !== productId);
          toast.success('Removed from cart');
        } else {
          const item = cart.find(i => i.product.id === productId);
          if (item) {
            item.quantity = quantity;
            toast.success('Quantity updated');
          }
        }

        this.saveCart(userId, cart);
        resolve(cart);
      }, 200);
    });
  }

  removeFromCart(userId: string, productId: string): Promise<CartItem[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cart = this.getCartFromStorage(userId).filter(
          item => item.product.id !== productId
        );
        this.saveCart(userId, cart);
        toast.success('Removed from cart');
        resolve(cart);
      }, 200);
    });
  }

  clearCart(userId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.saveCart(userId, []);
        toast.success('Cart cleared');
        resolve();
      }, 200);
    });
  }

  private getCartFromStorage(userId: string): CartItem[] {
    const allCarts = localStorage.getItem(this.CART_KEY);
    if (!allCarts) return [];
    
    const carts = JSON.parse(allCarts);
    return carts[userId] || [];
  }

  private saveCart(userId: string, cart: CartItem[]) {
    const allCarts = localStorage.getItem(this.CART_KEY);
    const carts = allCarts ? JSON.parse(allCarts) : {};
    carts[userId] = cart;
    localStorage.setItem(this.CART_KEY, JSON.stringify(carts));
  }
}

export const mockCartService = new MockCartService();
