/**
 * Vultr Managed PostgreSQL Service
 * Provides connection pooling and query methods with comprehensive error handling
 */

import { Pool, PoolClient } from 'pg';
import env from '../config/env.js';
import {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseTimeoutError,
} from './errors.js';

const QUERY_TIMEOUT_MS = 10000; // 10 seconds default timeout
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

class VultrPostgresService {
  private pool: Pool;
  private queryTimeout: number;

  constructor() {
    this.queryTimeout = QUERY_TIMEOUT_MS;
    
    this.pool = new Pool({
      host: env.VULTR_POSTGRES_HOST,
      port: env.VULTR_POSTGRES_PORT,
      database: env.VULTR_POSTGRES_DATABASE,
      user: env.VULTR_POSTGRES_USER,
      password: env.VULTR_POSTGRES_PASSWORD,
      ssl: env.VULTR_POSTGRES_SSL ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000, // Increased connection timeout
    });

    // Handle pool errors
    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle PostgreSQL client', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle connection errors
    this.pool.on('connect', () => {
      console.log('✅ Connected to Vultr PostgreSQL');
    });
  }

  /**
   * Execute a query with timeout and retry logic
   */
  async query<T = any>(text: string, params?: any[], timeoutMs?: number): Promise<T[]> {
    const timeout = timeoutMs || this.queryTimeout;
    const start = Date.now();
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const queryPromise = this.pool.query(text, params);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new DatabaseTimeoutError(timeout, text));
          }, timeout);
        });

        const res = await Promise.race([queryPromise, timeoutPromise]);
        const duration = Date.now() - start;
        
        console.log('Executed query', {
          text: text.substring(0, 100),
          duration,
          rows: res.rowCount,
          attempt,
        });
        
        return res.rows as T[];
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on timeout or certain error types
        if (error instanceof DatabaseTimeoutError) {
          throw error;
        }
        
        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          console.warn(`Query failed, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`, {
            error: error.message,
            query: text.substring(0, 100),
          });
          await this.sleep(delay);
          continue;
        }
        
        // Convert to appropriate error type
        throw this.handleQueryError(error, text);
      }
    }
    
    // If we get here, all retries failed
    throw this.handleQueryError(lastError || new Error('Unknown error'), text);
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await Promise.race([
        this.pool.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new DatabaseConnectionError('Connection timeout'));
          }, 5000);
        }),
      ]);
      return client;
    } catch (error: any) {
      if (error instanceof DatabaseConnectionError) {
        throw error;
      }
      throw new DatabaseConnectionError('Failed to get database client', error);
    }
  }

  /**
   * Execute a transaction with error handling
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction', rollbackError);
      }
      throw this.handleQueryError(error, 'transaction');
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await Promise.race([
        this.pool.query('SELECT 1'),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('Health check timeout'));
          }, 5000);
        }),
      ]);
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
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('PostgreSQL pool closed');
    } catch (error: any) {
      console.error('Error closing PostgreSQL pool', error);
      throw new DatabaseError('Failed to close database pool', error);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error || !error.code) return false;
    
    // PostgreSQL error codes that are retryable
    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      '57P01', // Admin shutdown
      '57P02', // Crash shutdown
      '57P03', // Cannot connect now
      '08003', // Connection does not exist
      '08006', // Connection failure
      '08001', // SQL client unable to establish SQL connection
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Handle query errors and convert to appropriate error types
   */
  private handleQueryError(error: any, query: string): DatabaseError {
    if (error instanceof DatabaseError || error instanceof DatabaseTimeoutError) {
      return error;
    }

    // Check for connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new DatabaseConnectionError('Database connection failed', error);
    }

    // Check for timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new DatabaseTimeoutError(this.queryTimeout, query);
    }

    // Check for query errors
    if (error.code && error.code.startsWith('23') || error.code.startsWith('42')) {
      return new DatabaseQueryError(query, error, {
        code: error.code,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
      });
    }

    // Generic database error
    return new DatabaseQueryError(query, error);
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const vultrPostgres = new VultrPostgresService();

