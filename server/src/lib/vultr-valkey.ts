/**
 * Vultr Valkey (Redis-compatible) Service
 * Provides ultra-fast caching and session management with comprehensive error handling
 */

import Redis from 'ioredis';
import env from '../config/env.js';
import { CacheError, CacheConnectionError } from './errors.js';

const OPERATION_TIMEOUT_MS = 5000; // 5 seconds default timeout

class VultrValkeyService {
  private client: Redis;
  private operationTimeout: number;

  constructor() {
    this.operationTimeout = OPERATION_TIMEOUT_MS;
    
    this.client = new Redis({
      host: env.VULTR_VALKEY_HOST,
      port: env.VULTR_VALKEY_PORT,
      password: env.VULTR_VALKEY_PASSWORD,
      tls: env.VULTR_VALKEY_TLS ? {} : undefined,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: false,
    });

    this.client.on('error', (err: Error) => {
      console.error('Valkey connection error:', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    });

    this.client.on('connect', () => {
      console.log('✅ Connected to Vultr Valkey');
    });

    this.client.on('close', () => {
      console.warn('⚠️ Valkey connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Reconnecting to Valkey...');
    });
  }

  /**
   * Set a key-value pair with optional TTL
   */
  async set(key: string, value: string | object, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      const operation = ttlSeconds
        ? this.client.setex(key, ttlSeconds, serialized)
        : this.client.set(key, serialized);
      
      await this.withTimeout(operation, `SET ${key}`);
      return true;
    } catch (error: any) {
      console.error('Valkey set error:', {
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof CacheError) {
        throw error;
      }
      
      throw new CacheError('Failed to set cache value', error, { key });
    }
  }

  /**
   * Get a value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error('Valkey get error:', error);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.withTimeout(this.client.del(key), `DEL ${key}`) as number;
      return result > 0;
    } catch (error: any) {
      console.error('Valkey delete error:', {
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof CacheError) {
        throw error;
      }
      
      throw new CacheError('Failed to delete cache key', error, { key });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.withTimeout(this.client.exists(key), `EXISTS ${key}`);
      return result === 1;
    } catch (error: any) {
      console.error('Valkey exists error:', {
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof CacheConnectionError) {
        throw error;
      }
      
      // Graceful degradation for exists check
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.withTimeout(
        this.client.expire(key, seconds),
        `EXPIRE ${key}`
      );
      return result === 1;
    } catch (error: any) {
      console.error('Valkey expire error:', {
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof CacheError) {
        throw error;
      }
      
      throw new CacheError('Failed to set expiration', error, { key, seconds });
    }
  }

  /**
   * Increment a key
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.withTimeout(this.client.incr(key), `INCR ${key}`);
    } catch (error: any) {
      console.error('Valkey incr error:', {
        key,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      if (error instanceof CacheError) {
        throw error;
      }
      
      throw new CacheError('Failed to increment key', error, { key });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.withTimeout(this.client.ping(), 'PING');
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      console.log('Valkey connection closed');
    } catch (error: any) {
      console.error('Error closing Valkey connection', error);
      throw new CacheError('Failed to close Valkey connection', error);
    }
  }

  /**
   * Execute operation with timeout
   */
  private async withTimeout<T>(
    operation: Promise<T>,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CacheError(
          `Valkey operation '${operationName}' timed out after ${this.operationTimeout}ms`,
          undefined,
          { operationName, timeout: this.operationTimeout }
        ));
      }, this.operationTimeout);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } catch (error: any) {
      // Check for connection errors
      if (
        error.message?.includes('Connection') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND'
      ) {
        throw new CacheConnectionError('Valkey connection failed', error);
      }
      throw error;
    }
  }
}

export const vultrValkey = new VultrValkeyService();

