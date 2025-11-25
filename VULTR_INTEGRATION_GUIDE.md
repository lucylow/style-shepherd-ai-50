# Vultr Integration Guide for Style Shepherd

This guide provides comprehensive documentation on how Style Shepherd integrates with Vultr services to deliver production-grade performance and scalability.

## Table of Contents

- [Overview](#overview)
- [Services Integrated](#services-integrated)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [Usage Examples](#usage-examples)
- [Performance Metrics](#performance-metrics)
- [Troubleshooting](#troubleshooting)

## Overview

Style Shepherd integrates **Vultr Managed PostgreSQL** and **Vultr Valkey (Redis-compatible)** to solve critical technical challenges:

1. **Persistent Data Storage**: Product catalog, user profiles, orders, and analytics
2. **Ultra-Fast Caching**: Session management and recommendation caching for real-time voice interface

## Services Integrated

### 1. Vultr Managed PostgreSQL

**Location**: `src/integrations/vultr/postgres.ts`

**Capabilities**:
- Product catalog management
- User profile and preference storage
- Order history tracking
- Return analytics data

**Key Methods**:
- `getProducts()` - Fetch products with filters
- `getUserProfile()` - Get user profile data
- `saveUserProfile()` - Save/update user profile
- `getOrderHistory()` - Retrieve order history
- `createOrder()` - Create new order
- `getReturnHistory()` - Analytics data
- `healthCheck()` - Service health monitoring

### 2. Vultr Valkey (Redis-compatible)

**Location**: `src/integrations/vultr/valkey.ts`

**Capabilities**:
- Session management (< 10ms latency)
- Conversation context caching
- Product recommendation caching
- User preference caching

**Key Methods**:
- `setSession()` / `getSession()` - Session management
- `cacheConversationContext()` - Voice interface context
- `cacheRecommendations()` - Product recommendations
- `cacheUserPreferences()` - User preferences
- `get()` / `set()` - Generic cache operations
- `healthCheck()` - Service health monitoring
- `getMetrics()` - Performance metrics

## Architecture

### Data Flow

```
┌─────────────────┐
│  React Frontend │
│ (Voice Interface)│
└────────┬────────┘
         │
         │ HTTP API Calls
         │
┌────────▼────────┐
│  Backend API    │
│ (Raindrop)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│PostgreSQL│ │ Valkey │
│ (Vultr) │ │ (Vultr) │
└────────┘ └────────┘
```

### Cache Strategy

**Cache-First Pattern**:
1. Check Valkey cache first (ultra-fast)
2. If cache miss, query PostgreSQL
3. Store result in cache for future requests
4. Set appropriate TTL based on data type

**TTL Configuration**:
- Sessions: 24 hours (86400 seconds)
- Conversation Context: 1 hour (3600 seconds)
- Recommendations: 30 minutes (1800 seconds)
- User Preferences: 1 hour (3600 seconds)

## Setup Instructions

### Step 1: Create Vultr Services

#### Vultr Managed PostgreSQL

1. Log into [Vultr Dashboard](https://my.vultr.com)
2. Navigate to **Products** → **Databases** → **PostgreSQL**
3. Click **Deploy Database**
4. Configure:
   - **Database Engine**: PostgreSQL
   - **Region**: Choose closest to your users
   - **Plan**: Select based on expected load
   - **Database Name**: `style_shepherd`
   - **Username**: Create admin user
   - **Password**: Generate strong password
5. Note connection details:
   - Host
   - Port (usually 5432)
   - Database name
   - Username
   - Password

#### Vultr Valkey

1. Navigate to **Products** → **Databases** → **Valkey**
2. Click **Deploy Database**
3. Configure:
   - **Region**: Same as PostgreSQL (for low latency)
   - **Plan**: Select based on cache size needs
   - **Password**: Generate strong password
4. Note connection details:
   - Host
   - Port (usually 6379)
   - Password

### Step 2: Configure Environment Variables

Create a `.env` file in the project root (see `VULTR_ENV_TEMPLATE.md`):

```bash
# Vultr PostgreSQL
VITE_VULTR_POSTGRES_HOST=your-host.vultr.com
VITE_VULTR_POSTGRES_PORT=5432
VITE_VULTR_POSTGRES_DATABASE=style_shepherd
VITE_VULTR_POSTGRES_USER=your_username
VITE_VULTR_POSTGRES_PASSWORD=your_password
VITE_VULTR_POSTGRES_SSL=true
VITE_VULTR_POSTGRES_API_ENDPOINT=https://your-backend.com/api/vultr/postgres

# Vultr Valkey
VITE_VULTR_VALKEY_HOST=your-valkey-host.vultr.com
VITE_VULTR_VALKEY_PORT=6379
VITE_VULTR_VALKEY_PASSWORD=your_password
VITE_VULTR_VALKEY_TLS=true
VITE_VULTR_VALKEY_API_ENDPOINT=https://your-backend.com/api/vultr/valkey
```

### Step 3: Set Up Backend API

Your backend API (deployed on Raindrop) needs to:

1. **Connect to Vultr PostgreSQL**:
   ```javascript
   // Example: Node.js with pg library
   const { Pool } = require('pg');
   const pool = new Pool({
     host: process.env.VULTR_POSTGRES_HOST,
     port: process.env.VULTR_POSTGRES_PORT,
     database: process.env.VULTR_POSTGRES_DATABASE,
     user: process.env.VULTR_POSTGRES_USER,
     password: process.env.VULTR_POSTGRES_PASSWORD,
     ssl: { rejectUnauthorized: false }
   });
   ```

2. **Connect to Vultr Valkey**:
   ```javascript
   // Example: Node.js with redis library
   const redis = require('redis');
   const client = redis.createClient({
     host: process.env.VULTR_VALKEY_HOST,
     port: process.env.VULTR_VALKEY_PORT,
     password: process.env.VULTR_VALKEY_PASSWORD,
     tls: {}
   });
   ```

3. **Create API Endpoints**:
   - `/api/vultr/postgres/products` - Product queries
   - `/api/vultr/postgres/users/:id/profile` - User profiles
   - `/api/vultr/valkey/session/:id` - Session management
   - `/api/vultr/valkey/cache/:key` - Cache operations

### Step 4: Initialize Services in Frontend

```typescript
import { initializeVultrServices } from '@/integrations/vultr';

// In your app initialization
initializeVultrServices();
```

## Usage Examples

### Example 1: Voice Query with Caching

```typescript
import { vultrValkey, vultrPostgres } from '@/integrations/vultr';

async function handleVoiceQuery(sessionId: string, userId: string, query: string) {
  // Get session from cache (ultra-fast)
  const session = await vultrValkey.getSession(sessionId);
  
  // Get cached preferences
  const preferences = await vultrValkey.getCachedPreferences(userId);
  
  // If not cached, fetch from PostgreSQL
  if (!preferences) {
    const profile = await vultrPostgres.getUserProfile(userId);
    if (profile) {
      await vultrValkey.cacheUserPreferences(userId, profile.preferences);
    }
  }
  
  // Process query...
  // Cache conversation context
  await vultrValkey.cacheConversationContext(userId, {
    lastQuery: query,
    intentHistory: ['product_search']
  });
}
```

### Example 2: Product Recommendations

```typescript
async function getRecommendations(userId: string) {
  // Check cache first
  const cached = await vultrValkey.getCachedRecommendations(userId);
  if (cached) return cached;
  
  // Cache miss - fetch from database
  const products = await vultrPostgres.getProducts({ limit: 50 });
  const userProfile = await vultrPostgres.getUserProfile(userId);
  
  // Compute recommendations...
  const recommendations = computeRecommendations(products, userProfile);
  
  // Cache for 30 minutes
  await vultrValkey.cacheRecommendations(userId, recommendations, 1800);
  
  return recommendations;
}
```

### Example 3: Health Monitoring

```typescript
import { vultrPostgres, vultrValkey } from '@/integrations/vultr';

async function checkHealth() {
  const [postgres, valkey] = await Promise.all([
    vultrPostgres.healthCheck(),
    vultrValkey.healthCheck()
  ]);
  
  console.log('PostgreSQL:', postgres.status, postgres.latency);
  console.log('Valkey:', valkey.status, valkey.latency);
}
```

See `src/integrations/vultr/examples.ts` for more comprehensive examples.

## Performance Metrics

### Expected Performance

| Operation | Latency | Service |
|-----------|---------|---------|
| Session Lookup | < 10ms | Valkey |
| Cache Hit (Preferences) | < 5ms | Valkey |
| Cache Hit (Recommendations) | < 5ms | Valkey |
| Database Query (Products) | < 50ms | PostgreSQL |
| Database Query (User Profile) | < 30ms | PostgreSQL |
| Voice Query (with caching) | < 100ms | Combined |

### Monitoring

Use the health check and metrics endpoints:

```typescript
// Health check
const health = await vultrValkey.healthCheck();
console.log(`Status: ${health.status}, Latency: ${health.latency}ms`);

// Performance metrics
const metrics = await vultrValkey.getMetrics();
console.log(`Hit Rate: ${metrics.hitRate}%`);
console.log(`Avg Latency: ${metrics.averageLatency}ms`);
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Vultr PostgreSQL
- **Check**: Firewall rules allow your backend IP
- **Check**: SSL/TLS configuration matches
- **Check**: Credentials are correct
- **Check**: Database is running in Vultr dashboard

**Problem**: Cannot connect to Vultr Valkey
- **Check**: Network access rules
- **Check**: Password is correct
- **Check**: TLS configuration

### Performance Issues

**Problem**: Slow cache operations
- **Check**: Network latency to Vultr region
- **Check**: Valkey instance size (upgrade if needed)
- **Check**: Cache hit rate (low hit rate = more DB queries)

**Problem**: Slow database queries
- **Check**: PostgreSQL instance size
- **Check**: Query optimization (add indexes)
- **Check**: Connection pooling in backend

### Cache Miss Rate High

**Solution**: Increase cache TTL for frequently accessed data
```typescript
// Increase TTL for user preferences
await vultrValkey.cacheUserPreferences(userId, preferences, 7200); // 2 hours
```

## Best Practices

1. **Always use cache-first pattern** for frequently accessed data
2. **Set appropriate TTLs** based on data freshness requirements
3. **Monitor cache hit rates** to optimize caching strategy
4. **Use connection pooling** in backend for PostgreSQL
5. **Implement retry logic** for transient failures
6. **Log performance metrics** for monitoring

## Support

For Vultr-specific issues:
- [Vultr Documentation](https://www.vultr.com/docs/)
- [Vultr Support](https://www.vultr.com/support/)

For Style Shepherd integration issues:
- Check `VULTR_INTEGRATION_ASSESSMENT.md` for current status
- Review `src/integrations/vultr/examples.ts` for usage patterns

