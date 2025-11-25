/**
 * AI Data Flow Orchestrator
 * Unified coordinator for all AI operations with:
 * - Request deduplication
 * - Batch processing
 * - Circuit breakers
 * - Enhanced caching
 * - Request queuing
 * - Performance metrics
 */

import { vultrValkey } from '../lib/vultr-valkey.js';
import { createHash } from 'crypto';

export interface AIRequest<T = any> {
  id: string;
  type: 'voice' | 'text' | 'recommendation' | 'tts' | 'stt';
  payload: T;
  userId?: string;
  priority?: 'high' | 'normal' | 'low';
  timestamp: number;
  dedupeKey?: string;
}

export interface AIResponse<T = any> {
  data: T;
  cached: boolean;
  latency: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface BatchRequest<T = any> {
  requests: AIRequest<T>[];
  batchId: string;
  createdAt: number;
}

export type RequestProcessor<TInput, TOutput> = (
  request: AIRequest<TInput>,
  batch?: BatchRequest<TInput>
) => Promise<TOutput>;

export type BatchProcessor<TInput, TOutput> = (
  batch: BatchRequest<TInput>
) => Promise<Map<string, TOutput>>;

/**
 * Circuit Breaker State
 */
enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, reject requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  successThreshold: number; // Successes before closing (half-open -> closed)
  timeout: number; // Time before attempting half-open (ms)
  resetTimeout: number; // Time before resetting failure count (ms)
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

/**
 * Request Queue Configuration
 */
interface QueueConfig {
  maxConcurrency: number;
  maxQueueSize: number;
  rateLimitRPS: number; // Requests per second
  batchWindow: number; // Batch similar requests within window (ms)
}

/**
 * Cache Configuration
 */
interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  compressionEnabled: boolean;
}

export class AIDataFlowOrchestrator {
  private requestCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Array<{ request: AIRequest; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private batchWindows: Map<string, { requests: AIRequest[]; timer: NodeJS.Timeout | null }> = new Map();
  private metrics: {
    requests: { total: number; cached: number; batched: number; failed: number };
    latency: { p50: number[]; p95: number[]; p99: number[] };
    cache: { hits: number; misses: number };
  } = {
    requests: { total: 0, cached: 0, batched: 0, failed: 0 },
    latency: { p50: [], p95: [], p99: [] },
    cache: { hits: 0, misses: 0 },
  };

  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
  };

  private defaultQueueConfig: QueueConfig = {
    maxConcurrency: 10,
    maxQueueSize: 1000,
    rateLimitRPS: 50,
    batchWindow: 100, // 100ms batching window
  };

  private defaultCacheConfig: CacheConfig = {
    defaultTTL: 3600, // 1 hour
    maxSize: 10000,
    compressionEnabled: true,
  };

  private queueConfig: QueueConfig;
  private cacheConfig: CacheConfig;
  private activeWorkers: number = 0;
  private lastRequestTime: number = 0;
  private requestInterval: number;

  constructor(
    queueConfig?: Partial<QueueConfig>,
    cacheConfig?: Partial<CacheConfig>
  ) {
    this.queueConfig = { ...this.defaultQueueConfig, ...queueConfig };
    this.cacheConfig = { ...this.defaultCacheConfig, ...cacheConfig };
    this.requestInterval = 1000 / this.queueConfig.rateLimitRPS;
    
    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Process a single request with deduplication, caching, and circuit breaking
   */
  async processRequest<TInput, TOutput>(
    request: AIRequest<TInput>,
    processor: RequestProcessor<TInput, TOutput>,
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      serviceName?: string;
      skipDeduplication?: boolean;
      skipCache?: boolean;
    }
  ): Promise<AIResponse<TOutput>> {
    const startTime = Date.now();
    const serviceName = options?.serviceName || request.type;
    
    // Check circuit breaker
    if (!this.isCircuitOpen(serviceName)) {
      const breakerState = this.getCircuitBreaker(serviceName);
      if (breakerState.state === CircuitState.OPEN) {
        throw new Error(`Circuit breaker is OPEN for ${serviceName}. Service unavailable.`);
      }
    }

    // Generate cache key
    const cacheKey = options?.cacheKey || this.generateCacheKey(request);
    
    // Check cache (unless skipped)
    if (!options?.skipCache) {
      const cached = await this.getCached(cacheKey);
      if (cached) {
        this.metrics.cache.hits++;
        this.metrics.requests.cached++;
        this.recordSuccess(serviceName);
        return {
          data: cached,
          cached: true,
          latency: Date.now() - startTime,
          source: 'cache',
        };
      }
      this.metrics.cache.misses++;
    }

    // Check for pending duplicate request
    if (!options?.skipDeduplication && request.dedupeKey) {
      const pending = this.pendingRequests.get(request.dedupeKey);
      if (pending) {
        const result = await pending;
        return {
          data: result,
          cached: false,
          latency: Date.now() - startTime,
          source: 'deduplicated',
        };
      }
    }

    // Process request
    this.metrics.requests.total++;
    const processPromise = this.executeWithRetry(
      () => processor(request),
      serviceName
    );

    // Track pending request for deduplication
    if (request.dedupeKey) {
      this.pendingRequests.set(request.dedupeKey, processPromise);
    }

    try {
      const data = await processPromise;
      const latency = Date.now() - startTime;

      // Cache result
      if (!options?.skipCache && cacheKey) {
        await this.setCached(
          cacheKey,
          data,
          options?.cacheTTL || this.cacheConfig.defaultTTL
        );
      }

      // Record success
      this.recordSuccess(serviceName);
      this.recordLatency(latency);

      // Clean up pending request
      if (request.dedupeKey) {
        this.pendingRequests.delete(request.dedupeKey);
      }

      return {
        data,
        cached: false,
        latency,
        source: 'processor',
      };
    } catch (error) {
      this.recordFailure(serviceName);
      this.metrics.requests.failed++;
      
      // Clean up pending request
      if (request.dedupeKey) {
        this.pendingRequests.delete(request.dedupeKey);
      }
      
      throw error;
    }
  }

  /**
   * Batch process multiple requests
   */
  async processBatch<TInput, TOutput>(
    requests: AIRequest<TInput>[],
    batchProcessor: BatchProcessor<TInput, TOutput>,
    options?: {
      serviceName?: string;
      batchWindow?: number;
    }
  ): Promise<Map<string, AIResponse<TOutput>>> {
    const serviceName = options?.serviceName || requests[0]?.type || 'batch';
    const batchWindow = options?.batchWindow || this.queueConfig.batchWindow;
    
    // Check circuit breaker
    if (!this.isCircuitOpen(serviceName)) {
      const breakerState = this.getCircuitBreaker(serviceName);
      if (breakerState.state === CircuitState.OPEN) {
        throw new Error(`Circuit breaker is OPEN for ${serviceName}. Service unavailable.`);
      }
    }

    // Create batch
    const batchId = this.generateBatchId(requests);
    const batch: BatchRequest<TInput> = {
      requests,
      batchId,
      createdAt: Date.now(),
    };

    try {
      const results = await batchProcessor(batch);
      this.metrics.requests.batched += requests.length;
      this.recordSuccess(serviceName);

      // Convert to response map
      const responseMap = new Map<string, AIResponse<TOutput>>();
      for (const request of requests) {
        const result = results.get(request.id);
        if (result) {
          responseMap.set(request.id, {
            data: result,
            cached: false,
            latency: 0, // Batch latency calculated separately
            source: 'batch',
          });
        }
      }

      return responseMap;
    } catch (error) {
      this.recordFailure(serviceName);
      throw error;
    }
  }

  /**
   * Queue request for processing (respects rate limits and concurrency)
   */
  async queueRequest<TInput, TOutput>(
    request: AIRequest<TInput>,
    processor: RequestProcessor<TInput, TOutput>,
    options?: {
      priority?: 'high' | 'normal' | 'low';
      serviceName?: string;
      cacheKey?: string;
      cacheTTL?: number;
    }
  ): Promise<AIResponse<TOutput>> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.requestQueue.length >= this.queueConfig.maxQueueSize) {
        reject(new Error('Request queue is full. Please try again later.'));
        return;
      }

      // Add to queue with priority
      const priority = options?.priority || request.priority || 'normal';
      const queueItem = {
        request: { ...request, priority, timestamp: Date.now() },
        resolve,
        reject,
      };

      if (priority === 'high') {
        this.requestQueue.unshift(queueItem);
      } else {
        this.requestQueue.push(queueItem);
      }
    });
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      type: request.type,
      payload: request.payload,
      userId: request.userId,
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    return `ai:cache:${request.type}:${hash}`;
  }

  /**
   * Generate batch ID
   */
  private generateBatchId(requests: AIRequest[]): string {
    const ids = requests.map(r => r.id).sort().join(',');
    const hash = createHash('sha256').update(ids).digest('hex').substring(0, 16);
    return `batch:${hash}`;
  }

  /**
   * Get cached data
   */
  private async getCached<T>(key: string): Promise<T | null> {
    try {
      // Check in-memory cache first
      const cached = this.requestCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
        return cached.data as T;
      }

      // Check Valkey cache
      const valkeyData = await vultrValkey.get<T>(key);
      if (valkeyData) {
        // Update in-memory cache
        this.requestCache.set(key, {
          data: valkeyData,
          timestamp: Date.now(),
          ttl: this.cacheConfig.defaultTTL,
        });
        return valkeyData;
      }

      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  private async setCached(key: string, data: any, ttl: number): Promise<void> {
    try {
      // Store in-memory cache
      if (this.requestCache.size >= this.cacheConfig.maxSize) {
        // Remove oldest entry (simple LRU)
        const firstKey = this.requestCache.keys().next().value;
        this.requestCache.delete(firstKey);
      }
      this.requestCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      // Store in Valkey cache
      await vultrValkey.set(key, data, ttl);
    } catch (error) {
      console.warn('Cache set error:', error);
      // Non-critical, continue
    }
  }

  /**
   * Circuit Breaker Management
   */
  private getCircuitBreaker(serviceName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        lastSuccessTime: Date.now(),
      });
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private isCircuitOpen(serviceName: string): boolean {
    const breaker = this.getCircuitBreaker(serviceName);
    const config = this.defaultCircuitConfig;

    // Check if we should transition from OPEN to HALF_OPEN
    if (breaker.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceFailure >= config.timeout) {
        breaker.state = CircuitState.HALF_OPEN;
        breaker.successes = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(serviceName: string): void {
    const breaker = this.getCircuitBreaker(serviceName);
    breaker.successes++;
    breaker.lastSuccessTime = Date.now();

    if (breaker.state === CircuitState.HALF_OPEN) {
      if (breaker.successes >= this.defaultCircuitConfig.successThreshold) {
        breaker.state = CircuitState.CLOSED;
        breaker.failures = 0;
        breaker.successes = 0;
      }
    } else if (breaker.state === CircuitState.CLOSED) {
      // Reset failure count after successful period
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime;
      if (timeSinceLastFailure >= this.defaultCircuitConfig.resetTimeout) {
        breaker.failures = 0;
      }
    }
  }

  private recordFailure(serviceName: string): void {
    const breaker = this.getCircuitBreaker(serviceName);
    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.failures >= this.defaultCircuitConfig.failureThreshold) {
      breaker.state = CircuitState.OPEN;
    } else if (breaker.state === CircuitState.HALF_OPEN) {
      // Single failure moves back to OPEN
      breaker.state = CircuitState.OPEN;
      breaker.successes = 0;
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    serviceName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on circuit breaker open
        if (error instanceof Error && error.message.includes('Circuit breaker')) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Queue Processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100); // Check queue every 100ms
  }

  private async processQueue(): Promise<void> {
    // Rate limiting check
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestInterval) {
      return; // Rate limit, wait
    }

    // Concurrency check
    if (this.activeWorkers >= this.queueConfig.maxConcurrency) {
      return; // At max concurrency
    }

    // Process next item in queue
    if (this.requestQueue.length === 0) {
      return; // Queue empty
    }

    const item = this.requestQueue.shift();
    if (!item) return;

    this.activeWorkers++;
    this.lastRequestTime = Date.now();

    // Process in background
    (async () => {
      try {
        // The actual processing should be handled by the caller
        // This is just queue management
        await this.sleep(0); // Yield to event loop
        item.resolve(undefined); // Placeholder - actual processing handled elsewhere
      } catch (error) {
        item.reject(error);
      } finally {
        this.activeWorkers--;
      }
    })();
  }

  /**
   * Record latency metrics
   */
  private recordLatency(latency: number): void {
    this.metrics.latency.p50.push(latency);
    this.metrics.latency.p95.push(latency);
    this.metrics.latency.p99.push(latency);

    // Keep only recent samples (last 1000)
    const maxSamples = 1000;
    if (this.metrics.latency.p50.length > maxSamples) {
      this.metrics.latency.p50.shift();
      this.metrics.latency.p95.shift();
      this.metrics.latency.p99.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    const sortedP50 = [...this.metrics.latency.p50].sort((a, b) => a - b);
    const sortedP95 = [...this.metrics.latency.p95].sort((a, b) => a - b);
    const sortedP99 = [...this.metrics.latency.p99].sort((a, b) => a - b);

    return {
      requests: { ...this.metrics.requests },
      latency: {
        p50: sortedP50[Math.floor(sortedP50.length * 0.5)] || 0,
        p95: sortedP95[Math.floor(sortedP95.length * 0.95)] || 0,
        p99: sortedP99[Math.floor(sortedP99.length * 0.99)] || 0,
      },
      cache: {
        ...this.metrics.cache,
        hitRate: this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses) || 0,
      },
      queue: {
        size: this.requestQueue.length,
        activeWorkers: this.activeWorkers,
      },
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([name, state]) => [
          name,
          {
            state: state.state,
            failures: state.failures,
            successes: state.successes,
          },
        ])
      ),
    };
  }

  /**
   * Clear cache
   */
  async clearCache(pattern?: string): Promise<void> {
    if (pattern) {
      // Clear matching keys from in-memory cache
      for (const key of this.requestCache.keys()) {
        if (key.includes(pattern)) {
          this.requestCache.delete(key);
        }
      }
    } else {
      this.requestCache.clear();
    }
  }

  /**
   * Utility: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const aiDataFlowOrchestrator = new AIDataFlowOrchestrator();
