import { CartItem, Product } from '@/types/fashion';

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  estimatedShipping?: number;
  estimatedTax?: number;
}

class MockCartService {
  private CART_KEY = 'style_shepherd_cart';
  private readonly DEFAULT_DELAY = 200;
  private readonly MAX_QUANTITY = 99;
  private readonly MAX_CART_SIZE = 50;

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!userId) {
            reject(new Error('User ID is required'));
            return;
          }
          const cart = this.getCartFromStorage(userId);
          resolve(cart);
        } catch (error) {
          reject(new Error(`Failed to get cart: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Get cart summary with totals
   */
  async getCartSummary(userId: string): Promise<CartSummary> {
    const items = await this.getCart(userId);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    
    return {
      items,
      totalItems,
      totalPrice,
      estimatedShipping: totalPrice > 100 ? 0 : 9.99, // Free shipping over $100
      estimatedTax: Math.round(totalPrice * 0.08 * 100) / 100, // 8% tax
    };
  }

  /**
   * Add item to cart with validation
   */
  async addToCart(userId: string, item: CartItem): Promise<CartItem[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!userId) {
            reject(new Error('User ID is required'));
            return;
          }

          // Validate item
          const validationError = this.validateCartItem(item);
          if (validationError) {
            reject(new Error(validationError));
            return;
          }

          const cart = this.getCartFromStorage(userId);
          
          // Check cart size limit
          if (cart.length >= this.MAX_CART_SIZE) {
            reject(new Error(`Cart is full. Maximum ${this.MAX_CART_SIZE} items allowed.`));
            return;
          }

          // Check if item already exists (same product and size)
          const existingIndex = cart.findIndex(
            i => i.product.id === item.product.id && 
                 (i.size === item.size || i.selectedSize === item.selectedSize)
          );

          if (existingIndex >= 0) {
            // Update quantity, but respect max quantity
            const newQuantity = cart[existingIndex].quantity + item.quantity;
            if (newQuantity > this.MAX_QUANTITY) {
              reject(new Error(`Maximum quantity of ${this.MAX_QUANTITY} exceeded`));
              return;
            }
            cart[existingIndex].quantity = newQuantity;
          } else {
            // Add new item
            cart.push({ ...item });
          }

          this.saveCart(userId, cart);
          resolve(cart);
        } catch (error) {
          reject(new Error(`Failed to add to cart: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Update item quantity in cart
   */
  async updateQuantity(userId: string, productId: string, size: string, quantity: number): Promise<CartItem[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!userId) {
            reject(new Error('User ID is required'));
            return;
          }

          if (quantity < 0) {
            reject(new Error('Quantity cannot be negative'));
            return;
          }

          if (quantity > this.MAX_QUANTITY) {
            reject(new Error(`Maximum quantity of ${this.MAX_QUANTITY} exceeded`));
            return;
          }

          let cart = this.getCartFromStorage(userId);
          
          const itemIndex = cart.findIndex(
            i => i.product.id === productId && (i.size === size || i.selectedSize === size)
          );

          if (itemIndex === -1) {
            reject(new Error('Item not found in cart'));
            return;
          }

          if (quantity === 0) {
            // Remove item
            cart = cart.filter((_, index) => index !== itemIndex);
          } else {
            // Update quantity
            cart[itemIndex].quantity = quantity;
          }

          this.saveCart(userId, cart);
          resolve(cart);
        } catch (error) {
          reject(new Error(`Failed to update quantity: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, productId: string, size?: string): Promise<CartItem[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!userId) {
            reject(new Error('User ID is required'));
            return;
          }

          const cart = this.getCartFromStorage(userId);
          const filteredCart = cart.filter(item => {
            if (size) {
              return !(item.product.id === productId && (item.size === size || item.selectedSize === size));
            }
            return item.product.id !== productId;
          });

          this.saveCart(userId, filteredCart);
          resolve(filteredCart);
        } catch (error) {
          reject(new Error(`Failed to remove from cart: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          if (!userId) {
            reject(new Error('User ID is required'));
            return;
          }
          this.saveCart(userId, []);
          resolve();
        } catch (error) {
          reject(new Error(`Failed to clear cart: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      }, this.DEFAULT_DELAY);
    });
  }

  /**
   * Check if product is in cart
   */
  async isInCart(userId: string, productId: string, size?: string): Promise<boolean> {
    const cart = await this.getCart(userId);
    return cart.some(item => {
      if (size) {
        return item.product.id === productId && (item.size === size || item.selectedSize === size);
      }
      return item.product.id === productId;
    });
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(userId: string): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Validate cart item before adding
   */
  private validateCartItem(item: CartItem): string | null {
    if (!item.product) {
      return 'Product is required';
    }

    if (!item.size && !item.selectedSize) {
      return 'Size is required';
    }

    if (item.quantity <= 0) {
      return 'Quantity must be greater than 0';
    }

    if (item.quantity > this.MAX_QUANTITY) {
      return `Maximum quantity of ${this.MAX_QUANTITY} exceeded`;
    }

    // Validate size is available for product
    const availableSizes = item.product.sizes || [];
    const selectedSize = item.size || item.selectedSize;
    if (selectedSize && !availableSizes.includes(selectedSize)) {
      return `Size ${selectedSize} is not available for this product`;
    }

    return null;
  }

  /**
   * Get cart from storage with error handling
   */
  private getCartFromStorage(userId: string): CartItem[] {
    try {
      const allCarts = localStorage.getItem(this.CART_KEY);
      if (!allCarts) return [];
      
      const carts = JSON.parse(allCarts);
      const userCart = carts[userId];
      
      if (!Array.isArray(userCart)) {
        return [];
      }

      // Validate cart items structure
      return userCart.filter(item => 
        item && 
        item.product && 
        typeof item.quantity === 'number' &&
        item.quantity > 0
      );
    } catch (error) {
      console.error('Failed to parse cart from storage:', error);
      return [];
    }
  }

  /**
   * Save cart to storage with error handling
   */
  private saveCart(userId: string, cart: CartItem[]): void {
    try {
      const allCarts = localStorage.getItem(this.CART_KEY);
      const carts = allCarts ? JSON.parse(allCarts) : {};
      carts[userId] = cart;
      localStorage.setItem(this.CART_KEY, JSON.stringify(carts));
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
      throw new Error('Failed to save cart');
    }
  }
}

export const mockCartService = new MockCartService();
