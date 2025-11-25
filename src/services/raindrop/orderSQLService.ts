/**
 * SmartSQL Service - Structured Data Management
 * 
 * Manages orders, catalog, and returns data using Raindrop SmartSQL.
 */

import { orderSQL } from '@/integrations/raindrop/config';

export interface Order {
  id: string;
  user_id: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  predicted_return_rate?: number;
  created_at: string;
  updated_at?: string;
}

export interface ReturnRecord {
  id: string;
  order_id: string;
  product_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export interface ProductCatalog {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  brand?: string;
  color?: string;
  sizes?: string[];
  stock: number;
  created_at: string;
  updated_at?: string;
}

class OrderSQLService {
  /**
   * Create a new order
   */
  async createOrder(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOrder: Order = {
      ...order,
      id: orderId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('orders', newOrder);
    return newOrder;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const results = await orderSQL.query(
        'SELECT * FROM orders WHERE id = ?',
        [orderId]
      );
      return results[0] || null;
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string, limit?: number): Promise<Order[]> {
    try {
      const sql = limit 
        ? 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
      const params = limit ? [userId, limit] : [userId];
      return await orderSQL.query(sql, params);
    } catch (error) {
      console.error('Failed to get user orders:', error);
      return [];
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    await orderSQL.update('orders', orderId, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Create return record
   */
  async createReturn(returnRecord: Omit<ReturnRecord, 'id' | 'created_at'>): Promise<ReturnRecord> {
    const returnId = `return-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newReturn: ReturnRecord = {
      ...returnRecord,
      id: returnId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('returns', newReturn);
    return newReturn;
  }

  /**
   * Get return records for user
   */
  async getUserReturns(userId: string): Promise<ReturnRecord[]> {
    try {
      return await orderSQL.query(
        'SELECT * FROM returns WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    } catch (error) {
      console.error('Failed to get user returns:', error);
      return [];
    }
  }

  /**
   * Get return analytics
   */
  async getReturnAnalytics(userId?: string): Promise<{
    totalReturns: number;
    returnRate: number;
    avgReturnRate: number;
    topReturnReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const sql = userId
        ? 'SELECT COUNT(*), AVG(predicted_return_rate) FROM orders WHERE user_id = ?'
        : 'SELECT COUNT(*), AVG(predicted_return_rate) FROM orders';
      const params = userId ? [userId] : [];
      const [stats] = await orderSQL.query(sql, params);
      
      const returns = userId
        ? await orderSQL.query('SELECT reason, COUNT(*) as count FROM returns WHERE user_id = ? GROUP BY reason ORDER BY count DESC LIMIT 5', [userId])
        : await orderSQL.query('SELECT reason, COUNT(*) as count FROM returns GROUP BY reason ORDER BY count DESC LIMIT 5', []);
      
      return {
        totalReturns: stats?.['COUNT(*)'] || 0,
        returnRate: stats?.['AVG(predicted_return_rate)'] || 0,
        avgReturnRate: stats?.['AVG(predicted_return_rate)'] || 0,
        topReturnReasons: returns.map((r: any) => ({
          reason: r.reason,
          count: r.count,
        })),
      };
    } catch (error) {
      console.error('Failed to get return analytics:', error);
      return {
        totalReturns: 0,
        returnRate: 0,
        avgReturnRate: 0,
        topReturnReasons: [],
      };
    }
  }

  /**
   * Add product to catalog
   */
  async addProductToCatalog(product: Omit<ProductCatalog, 'id' | 'created_at'>): Promise<ProductCatalog> {
    const productId = `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProduct: ProductCatalog = {
      ...product,
      id: productId,
      created_at: new Date().toISOString(),
    };
    
    await orderSQL.insert('catalog', newProduct);
    return newProduct;
  }

  /**
   * Query products from catalog
   */
  async queryProducts(query: string, params?: any[]): Promise<ProductCatalog[]> {
    try {
      return await orderSQL.query(query, params || []);
    } catch (error) {
      console.error('Failed to query products:', error);
      return [];
    }
  }
}

export const orderSQLService = new OrderSQLService();

