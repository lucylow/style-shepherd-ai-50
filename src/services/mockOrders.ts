import { CartItem } from '@/types/fashion';
import { toast } from 'sonner';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  returnRisk: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
  shippingInfo: {
    address: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

class MockOrderService {
  private ORDERS_KEY = 'style_shepherd_orders';

  createOrder(
    userId: string,
    items: CartItem[],
    shippingInfo: Order['shippingInfo']
  ): Promise<Order> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const totalAmount = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );

        const returnRisk = this.calculateReturnRisk(items);

        const order: Order = {
          id: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          items,
          totalAmount,
          returnRisk,
          status: 'pending',
          createdAt: new Date().toISOString(),
          shippingInfo,
        };

        const orders = this.getOrders();
        orders.push(order);
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));

        toast.success('Order created successfully!');
        resolve(order);
      }, 800);
    });
  }

  getUserOrders(userId: string): Promise<Order[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const orders = this.getOrders().filter(o => o.userId === userId);
        resolve(orders);
      }, 400);
    });
  }

  getOrderById(orderId: string): Promise<Order | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = this.getOrders().find(o => o.id === orderId) || null;
        resolve(order);
      }, 300);
    });
  }

  private calculateReturnRisk(items: CartItem[]): number {
    // Simple mock calculation
    const totalRisk = items.reduce((sum, item) => {
      const baseRisk = item.product.returnRisk || 0.1;
      return sum + baseRisk;
    }, 0);
    
    return Math.min(totalRisk / items.length, 1);
  }

  private getOrders(): Order[] {
    const ordersStr = localStorage.getItem(this.ORDERS_KEY);
    return ordersStr ? JSON.parse(ordersStr) : [];
  }
}

export const mockOrderService = new MockOrderService();
