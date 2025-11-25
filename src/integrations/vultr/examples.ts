/**
 * Vultr Integration Examples
 * 
 * This file demonstrates how to use Vultr services in the Style Shepherd application.
 * These examples show practical use cases for PostgreSQL and Valkey integration.
 */

import { vultrPostgres, vultrValkey } from './index';

// ============================================================================
// Example 1: Voice Interface with Cached Session Data
// ============================================================================

/**
 * Example: Handle voice query with session caching
 * This demonstrates how Valkey provides ultra-fast session retrieval
 * for real-time voice interface responses
 */
export async function handleVoiceQueryWithCaching(
  sessionId: string,
  userId: string,
  query: string
) {
  // 1. Get session from Valkey (ultra-fast, < 1ms)
  const session = await vultrValkey.getSession(sessionId);
  
  if (!session) {
    // Create new session
    const newSession = {
      userId,
      sessionId,
      conversationContext: {
        lastQuery: query,
        intentHistory: [],
      },
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    await vultrValkey.setSession(sessionId, newSession);
  } else {
    // Update session access time
    await vultrValkey.updateSessionAccess(sessionId);
  }

  // 2. Get cached conversation context (if available)
  const cachedContext = await vultrValkey.getConversationContext(userId);
  
  // 3. Get cached user preferences (fast lookup)
  const cachedPreferences = await vultrValkey.getCachedPreferences(userId);
  
  // 4. If preferences not cached, fetch from PostgreSQL
  let userProfile = cachedPreferences;
  if (!userProfile) {
    const profile = await vultrPostgres.getUserProfile(userId);
    if (profile) {
      // Cache for future requests
      await vultrValkey.cacheUserPreferences(userId, profile.preferences);
      userProfile = profile.preferences;
    }
  }

  // 5. Process query with context
  // ... your AI processing logic here ...

  // 6. Update conversation context in cache
  await vultrValkey.cacheConversationContext(userId, {
    lastQuery: query,
    intentHistory: [...(cachedContext?.intentHistory || []), 'product_search'],
  });

  return {
    response: 'Voice query processed',
    latency: 'Sub-100ms thanks to Valkey caching',
  };
}

// ============================================================================
// Example 2: Product Recommendations with Caching
// ============================================================================

/**
 * Example: Get personalized recommendations with caching
 * This demonstrates how Valkey reduces database load by caching
 * expensive recommendation calculations
 */
export async function getCachedRecommendations(
  userId: string,
  category?: string
) {
  // 1. Check cache first (ultra-fast)
  const cached = await vultrValkey.getCachedRecommendations(userId);
  
  if (cached && cached.length > 0) {
    console.log('✅ Recommendations served from Valkey cache (< 1ms)');
    return cached;
  }

  // 2. Cache miss - fetch from PostgreSQL and compute
  console.log('⚠️ Cache miss - fetching from PostgreSQL');
  
  const products = await vultrPostgres.getProducts({
    category,
    limit: 50,
  });

  // 3. Get user profile for personalization
  const userProfile = await vultrPostgres.getUserProfile(userId);
  
  // 4. Compute personalized recommendations
  // ... your recommendation algorithm here ...
  const recommendations = products.slice(0, 20); // Simplified

  // 5. Cache results for 30 minutes
  await vultrValkey.cacheRecommendations(userId, recommendations, 1800);

  return recommendations;
}

// ============================================================================
// Example 3: Order Processing with Database Persistence
// ============================================================================

/**
 * Example: Create order with database persistence
 * This demonstrates using Vultr PostgreSQL for reliable order storage
 */
export async function createOrderWithPersistence(
  userId: string,
  items: Array<{ productId: string; quantity: number; price: number; size: string }>
) {
  // 1. Calculate total
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 2. Create order in PostgreSQL (persistent storage)
  const order = await vultrPostgres.createOrder({
    user_id: userId,
    items: items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
    })),
    total_amount: totalAmount,
    status: 'pending',
  });

  // 3. Invalidate user's cached recommendations (they just bought something)
  await vultrValkey.delete(`recommendations:${userId}`);

  // 4. Update user session
  const session = await vultrValkey.getSession(`session:${userId}`);
  if (session) {
    session.conversationContext = {
      ...session.conversationContext,
      lastProducts: items.map(i => i.productId),
    };
    await vultrValkey.setSession(`session:${userId}`, session);
  }

  return order;
}

// ============================================================================
// Example 4: Returns Analytics with Database Queries
// ============================================================================

/**
 * Example: Analyze returns data for business insights
 * This demonstrates using Vultr PostgreSQL for analytics queries
 */
export async function analyzeReturnsData(userId?: string) {
  // 1. Fetch return history from PostgreSQL
  const returns = await vultrPostgres.getReturnHistory(userId);

  // 2. Analyze return patterns
  const returnReasons = returns.reduce((acc, ret) => {
    acc[ret.reason] = (acc[ret.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 3. Cache analytics results for dashboard
  await vultrValkey.set(`analytics:returns:${userId || 'all'}`, {
    totalReturns: returns.length,
    returnReasons,
    lastUpdated: Date.now(),
  }, 3600); // Cache for 1 hour

  return {
    totalReturns: returns.length,
    returnReasons,
    insights: 'Data stored in Vultr PostgreSQL for reliable analytics',
  };
}

// ============================================================================
// Example 5: Health Check and Monitoring
// ============================================================================

/**
 * Example: Monitor Vultr service health
 * This demonstrates how to check service status and latency
 */
export async function checkVultrServicesHealth() {
  const [postgresHealth, valkeyHealth] = await Promise.all([
    vultrPostgres.healthCheck(),
    vultrValkey.healthCheck(),
  ]);

  const valkeyMetrics = await vultrValkey.getMetrics();

  return {
    postgres: {
      status: postgresHealth.status,
      latency: postgresHealth.latency ? `${postgresHealth.latency}ms` : 'N/A',
    },
    valkey: {
      status: valkeyHealth.status,
      latency: valkeyHealth.latency ? `${valkeyHealth.latency}ms` : 'N/A',
      hitRate: valkeyMetrics.hitRate ? `${(valkeyMetrics.hitRate * 100).toFixed(1)}%` : 'N/A',
      averageLatency: valkeyMetrics.averageLatency ? `${valkeyMetrics.averageLatency}ms` : 'N/A',
    },
    summary: {
      allHealthy: postgresHealth.status === 'healthy' && valkeyHealth.status === 'healthy',
      valkeyPerformance: valkeyHealth.latency && valkeyHealth.latency < 10 
        ? '✅ Excellent (< 10ms)' 
        : valkeyHealth.latency && valkeyHealth.latency < 50 
        ? '✅ Good (< 50ms)' 
        : '⚠️ Check configuration',
    },
  };
}

// ============================================================================
// Example 6: User Profile Management with Caching Strategy
// ============================================================================

/**
 * Example: Smart user profile loading with cache-first strategy
 * This demonstrates the performance benefits of Valkey caching
 */
export async function getUserProfileWithCacheStrategy(userId: string) {
  const startTime = Date.now();

  // 1. Try cache first (ultra-fast)
  const cached = await vultrValkey.getCachedPreferences(userId);
  
  if (cached) {
    const latency = Date.now() - startTime;
    console.log(`✅ Profile loaded from Valkey cache in ${latency}ms`);
    return { preferences: cached, source: 'cache', latency };
  }

  // 2. Cache miss - fetch from PostgreSQL
  const profile = await vultrPostgres.getUserProfile(userId);
  
  if (profile) {
    // 3. Cache for future requests
    await vultrValkey.cacheUserPreferences(userId, profile.preferences);
    
    const latency = Date.now() - startTime;
    console.log(`⚠️ Profile loaded from PostgreSQL in ${latency}ms (now cached)`);
    return { preferences: profile.preferences, source: 'database', latency };
  }

  return null;
}

