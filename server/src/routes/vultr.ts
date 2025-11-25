/**
 * Vultr Services API Routes
 * Handles PostgreSQL and Valkey operations
 */

import { Router, Request, Response } from 'express';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import { vultrValkey } from '../lib/vultr-valkey.js';

const router = Router();

// PostgreSQL Routes
router.get('/postgres/health', async (req: Request, res: Response) => {
  try {
    const health = await vultrPostgres.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.get('/postgres/products', async (req: Request, res: Response) => {
  try {
    const { category, brand, minPrice, maxPrice, limit } = req.query;
    let query = 'SELECT * FROM catalog WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (brand) {
      query += ` AND brand = $${paramIndex++}`;
      params.push(brand);
    }
    if (minPrice) {
      query += ` AND price >= $${paramIndex++}`;
      params.push(parseFloat(minPrice as string));
    }
    if (maxPrice) {
      query += ` AND price <= $${paramIndex++}`;
      params.push(parseFloat(maxPrice as string));
    }
    query += ' ORDER BY rating DESC, reviews_count DESC';
    if (limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit as string));
    }

    const products = await vultrPostgres.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/postgres/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const result = await vultrPostgres.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/postgres/users/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = req.body;

    await vultrPostgres.query(
      `INSERT INTO user_profiles (user_id, preferences, body_measurements, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         preferences = EXCLUDED.preferences,
         body_measurements = EXCLUDED.body_measurements,
         updated_at = EXCLUDED.updated_at`,
      [
        userId,
        JSON.stringify(profile.preferences || {}),
        JSON.stringify(profile.bodyMeasurements || {}),
        new Date().toISOString(),
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save user profile error:', error);
    res.status(500).json({ error: 'Failed to save user profile' });
  }
});

router.get('/postgres/users/:userId/orders', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const orders = await vultrPostgres.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    res.json(orders);
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

router.post('/postgres/orders', async (req: Request, res: Response) => {
  try {
    const order = req.body;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await vultrPostgres.query(
      `INSERT INTO orders (order_id, user_id, items, total_amount, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orderId,
        order.user_id,
        JSON.stringify(order.items),
        order.total_amount,
        order.status || 'pending',
        new Date().toISOString(),
      ]
    );

    res.json({ orderId, ...order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.get('/postgres/returns', async (req: Request, res: Response) => {
  try {
    const { userId, productId } = req.query;
    let query = 'SELECT * FROM returns WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (productId) {
      query += ` AND product_id = $${paramIndex++}`;
      params.push(productId);
    }

    const returns = await vultrPostgres.query(query, params);
    res.json(returns);
  } catch (error) {
    console.error('Get return history error:', error);
    res.status(500).json({ error: 'Failed to fetch return history' });
  }
});

router.post('/postgres/returns', async (req: Request, res: Response) => {
  try {
    const returnData = req.body;
    const returnId = `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await vultrPostgres.query(
      `INSERT INTO returns (return_id, order_id, product_id, user_id, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        returnId,
        returnData.order_id,
        returnData.product_id,
        returnData.user_id,
        returnData.reason,
        new Date().toISOString(),
      ]
    );

    res.json({ returnId, ...returnData });
  } catch (error) {
    console.error('Record return error:', error);
    res.status(500).json({ error: 'Failed to record return' });
  }
});

// Valkey Routes
router.get('/valkey/health', async (req: Request, res: Response) => {
  try {
    const health = await vultrValkey.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

router.post('/valkey/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const sessionData = req.body;
    const ttl = req.body.ttl || 86400; // Default 24 hours

    const success = await vultrValkey.set(
      `session:${sessionId}`,
      sessionData,
      ttl
    );
    res.json({ success });
  } catch (error) {
    console.error('Set session error:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

router.get('/valkey/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await vultrValkey.get(`session:${sessionId}`);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.post('/valkey/session/:sessionId/touch', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await vultrValkey.expire(`session:${sessionId}`, 86400);
    res.json({ success: true });
  } catch (error) {
    console.error('Touch session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

router.delete('/valkey/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const success = await vultrValkey.delete(`session:${sessionId}`);
    res.json({ success });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

router.post('/valkey/cache/conversation/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { context, ttl = 3600 } = req.body;
    const success = await vultrValkey.set(
      `conversation:${userId}`,
      { context },
      ttl
    );
    res.json({ success });
  } catch (error) {
    console.error('Cache conversation error:', error);
    res.status(500).json({ error: 'Failed to cache conversation' });
  }
});

router.get('/valkey/cache/conversation/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const data = await vultrValkey.get<{ context: any }>(`conversation:${userId}`);
    if (!data) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.post('/valkey/cache/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { recommendations, ttl = 1800 } = req.body;
    const success = await vultrValkey.set(
      `recommendations:${userId}`,
      recommendations,
      ttl
    );
    res.json({ success });
  } catch (error) {
    console.error('Cache recommendations error:', error);
    res.status(500).json({ error: 'Failed to cache recommendations' });
  }
});

router.get('/valkey/cache/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const recommendations = await vultrValkey.get(`recommendations:${userId}`);
    if (!recommendations) {
      return res.status(404).json({ error: 'Recommendations not found' });
    }
    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.post('/valkey/cache/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { preferences, ttl = 3600 } = req.body;
    const success = await vultrValkey.set(
      `preferences:${userId}`,
      preferences,
      ttl
    );
    res.json({ success });
  } catch (error) {
    console.error('Cache preferences error:', error);
    res.status(500).json({ error: 'Failed to cache preferences' });
  }
});

router.get('/valkey/cache/preferences/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const preferences = await vultrValkey.get(`preferences:${userId}`);
    if (!preferences) {
      return res.status(404).json({ error: 'Preferences not found' });
    }
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

router.post('/valkey/cache/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, ttl } = req.body;
    const success = await vultrValkey.set(key, value, ttl);
    res.json({ success });
  } catch (error) {
    console.error('Set cache error:', error);
    res.status(500).json({ error: 'Failed to set cache' });
  }
});

router.get('/valkey/cache/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await vultrValkey.get(key);
    if (value === null) {
      return res.status(404).json({ error: 'Cache key not found' });
    }
    res.json({ value });
  } catch (error) {
    console.error('Get cache error:', error);
    res.status(500).json({ error: 'Failed to get cache' });
  }
});

router.delete('/valkey/cache/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const success = await vultrValkey.delete(key);
    res.json({ success });
  } catch (error) {
    console.error('Delete cache error:', error);
    res.status(500).json({ error: 'Failed to delete cache' });
  }
});

router.get('/valkey/metrics', async (req: Request, res: Response) => {
  try {
    // In production, implement actual metrics collection
    res.json({
      hitRate: 0.85,
      missRate: 0.15,
      averageLatency: 2,
      totalRequests: 1000,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;

