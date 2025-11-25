/**
 * Vultr Valkey (Redis-compatible) Integration
 * 
 * This service provides ultra-fast caching and session management using
 * Vultr Valkey for real-time voice interface performance.
 * 
 * Usage:
 * - Store active user sessions
 * - Cache conversation context for voice interface
 * - Cache product recommendations
 * - Store temporary user preferences
 * 
 * Why Valkey:
 * - Ultra-low latency (< 1ms) essential for real-time voice responses
 * - Redis-compatible API for easy migration
 * - Managed service with high availability
 */

import { getVultrValkeyApiEndpoint } from '@/lib/api-config';

export interface VultrValkeyConfig {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
}

export interface SessionData {
  userId: string;
  sessionId: string;
  conversationContext?: {
    lastQuery?: string;
    lastProducts?: string[];
    intentHistory?: string[];
  };
  preferences?: Record<string, any>;
  createdAt: number;
  lastAccessed: number;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number; // Time to live in seconds
}

class VultrValkeyService {
  private config: VultrValkeyConfig | null = null;
  private apiEndpoint: string;

  constructor() {
    // In production, this would be your backend API endpoint
    // that securely connects to Vultr Valkey
    this.apiEndpoint = getVultrValkeyApiEndpoint();
  }

  /**
   * Initialize connection to Vultr Valkey
   * In production, this would be handled by the backend API
   */
  initialize(config?: Partial<VultrValkeyConfig>): void {
    if (config) {
      this.config = {
        host: config.host || import.meta.env.VITE_VULTR_VALKEY_HOST || '',
        port: config.port || parseInt(import.meta.env.VITE_VULTR_VALKEY_PORT || '6379'),
        password: config.password || import.meta.env.VITE_VULTR_VALKEY_PASSWORD || undefined,
        tls: config.tls ?? (import.meta.env.VITE_VULTR_VALKEY_TLS === 'true'),
      };
    }
  }

  /**
   * Store user session data
   * TTL: 24 hours (86400 seconds)
   */
  async setSession(sessionId: string, sessionData: SessionData, ttl: number = 86400): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sessionData,
          lastAccessed: Date.now(),
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error setting session', error);
      return false;
    }
  }

  /**
   * Get user session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/session/${sessionId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get session: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Vultr Valkey: Error getting session', error);
      return null;
    }
  }

  /**
   * Update session last accessed time
   */
  async updateSessionAccess(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/session/${sessionId}/touch`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error updating session access', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/session/${sessionId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error deleting session', error);
      return false;
    }
  }

  /**
   * Cache conversation context for voice interface
   * TTL: 1 hour (3600 seconds)
   */
  async cacheConversationContext(
    userId: string,
    context: SessionData['conversationContext'],
    ttl: number = 3600
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/conversation/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context, ttl }),
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error caching conversation context', error);
      return false;
    }
  }

  /**
   * Get cached conversation context
   */
  async getConversationContext(userId: string): Promise<SessionData['conversationContext'] | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/conversation/${userId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get conversation context: ${response.statusText}`);
      }
      const data = await response.json();
      return data.context;
    } catch (error) {
      console.error('Vultr Valkey: Error getting conversation context', error);
      return null;
    }
  }

  /**
   * Cache product recommendations
   * TTL: 30 minutes (1800 seconds)
   */
  async cacheRecommendations(
    userId: string,
    recommendations: any[],
    ttl: number = 1800
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/recommendations/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recommendations, ttl }),
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error caching recommendations', error);
      return false;
    }
  }

  /**
   * Get cached product recommendations
   */
  async getCachedRecommendations(userId: string): Promise<any[] | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/recommendations/${userId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get cached recommendations: ${response.statusText}`);
      }
      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      console.error('Vultr Valkey: Error getting cached recommendations', error);
      return null;
    }
  }

  /**
   * Cache user preferences for fast access
   * TTL: 1 hour (3600 seconds)
   */
  async cacheUserPreferences(
    userId: string,
    preferences: Record<string, any>,
    ttl: number = 3600
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/preferences/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences, ttl }),
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error caching user preferences', error);
      return false;
    }
  }

  /**
   * Get cached user preferences
   */
  async getCachedPreferences(userId: string): Promise<Record<string, any> | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/preferences/${userId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get cached preferences: ${response.statusText}`);
      }
      const data = await response.json();
      return data.preferences;
    } catch (error) {
      console.error('Vultr Valkey: Error getting cached preferences', error);
      return null;
    }
  }

  /**
   * Generic cache set operation
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value, ttl }),
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error setting cache', error);
      return false;
    }
  }

  /**
   * Generic cache get operation
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/${key}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to get cache: ${response.statusText}`);
      }
      const data = await response.json();
      return data.value as T;
    } catch (error) {
      console.error('Vultr Valkey: Error getting cache', error);
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/cache/${key}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Vultr Valkey: Error deleting cache', error);
      return false;
    }
  }

  /**
   * Health check - verify connection to Vultr Valkey
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.apiEndpoint}/health`);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { ...data, latency };
    } catch (error) {
      console.error('Vultr Valkey: Health check failed', error);
      return { status: 'unhealthy' };
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<{
    hitRate?: number;
    missRate?: number;
    averageLatency?: number;
    totalRequests?: number;
  }> {
    try {
      const response = await fetch(`${this.apiEndpoint}/metrics`);
      if (!response.ok) {
        throw new Error(`Failed to get metrics: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Vultr Valkey: Error getting metrics', error);
      return {};
    }
  }
}

// Export singleton instance
export const vultrValkey = new VultrValkeyService();

// Initialize with environment variables if available
if (typeof window !== 'undefined') {
  vultrValkey.initialize();
}

