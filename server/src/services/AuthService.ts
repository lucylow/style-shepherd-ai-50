/**
 * WorkOS Authentication Service
 * Handles user authentication and profile management
 */

import { WorkOS } from '@workos-inc/node';
import env from '../config/env.js';
import { userMemory } from '../lib/raindrop-config.js';
import { vultrPostgres } from '../lib/vultr-postgres.js';
import {
  AuthenticationError,
  NotFoundError,
  ExternalServiceError,
  DatabaseError,
} from '../lib/errors.js';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

export class AuthService {
  private workos: WorkOS;

  constructor() {
    this.workos = new WorkOS(env.WORKOS_API_KEY);
  }

  /**
   * Get authorization URL for OAuth
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    return this.workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      redirectUri,
      clientId: env.WORKOS_CLIENT_ID,
      state: state || this.generateState(),
    });
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string): Promise<{ user: User; sessionToken: string }> {
    if (!code) {
      throw new AuthenticationError('Authorization code is required');
    }

    try {
      // Exchange code for user profile
      const { user, accessToken } = await this.workos.userManagement.authenticateWithCode({
        code,
        clientId: env.WORKOS_CLIENT_ID,
      });

      if (!user || !user.id) {
        throw new AuthenticationError('Failed to authenticate user');
      }

      // Store user in Raindrop SmartMemory (non-critical, continue on error)
      try {
        await userMemory.set(user.id, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferences: {},
          createdAt: new Date().toISOString(),
        });
      } catch (memoryError) {
        console.warn('Failed to store user in SmartMemory, continuing:', memoryError);
      }

      // Store user in Vultr PostgreSQL
      try {
        await vultrPostgres.query(
          `INSERT INTO user_profiles (user_id, email, first_name, last_name, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) DO UPDATE SET
             email = EXCLUDED.email,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             updated_at = EXCLUDED.updated_at`,
          [
            user.id,
            user.email,
            user.firstName || null,
            user.lastName || null,
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      } catch (dbError: any) {
        // If it's a connection error, throw it; otherwise log and continue
        if (dbError instanceof DatabaseError) {
          throw dbError;
        }
        console.warn('Failed to store user in PostgreSQL, continuing:', dbError);
      }

      // Create session token (in production, use JWT or similar)
      const sessionToken = this.generateSessionToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          createdAt: new Date().toISOString(),
        },
        sessionToken,
      };
    } catch (error: any) {
      if (error instanceof AuthenticationError || error instanceof DatabaseError) {
        throw error;
      }
      
      // WorkOS API errors
      throw new ExternalServiceError(
        'WorkOS',
        'Failed to authenticate user',
        error,
        { code: code.substring(0, 10) + '...' }
      );
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<User | null> {
    if (!userId) {
      throw new AuthenticationError('User ID is required');
    }

    try {
      // Try SmartMemory first (non-critical)
      try {
        const profile = await userMemory.get(userId);
        if (profile) {
          return {
            id: userId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            createdAt: profile.createdAt,
          };
        }
      } catch (memoryError) {
        // Continue to database fallback
        console.warn('SmartMemory lookup failed, trying database:', memoryError);
      }

      // Fallback to PostgreSQL
      const result = await vultrPostgres.query<{
        user_id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        created_at: string;
      }>(
        'SELECT user_id, email, first_name, last_name, created_at FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (result.length === 0) {
        return null;
      }

      const user = result[0];
      return {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        createdAt: user.created_at,
      };
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      
      // For other errors, log and return null (graceful degradation)
      console.error('Get user profile error:', error);
      return null;
    }
  }

  /**
   * Generate state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate session token
   * In production, use proper JWT signing
   */
  private generateSessionToken(userId: string): string {
    // This is a simplified token - in production, use JWT with proper signing
    const payload = {
      userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): { userId: string } | null {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Token expired
      }
      return { userId: payload.userId };
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();

