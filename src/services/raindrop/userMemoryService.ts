/**
 * SmartMemory Service - User Profiles and Context
 * 
 * Manages user context, preferences, and conversational history
 * using Raindrop SmartMemory.
 */

import { userMemory } from '@/integrations/raindrop/config';

export interface UserProfile {
  userId: string;
  preferences?: {
    favoriteColors?: string[];
    preferredBrands?: string[];
    preferredStyles?: string[];
    preferredSizes?: string[];
  };
  bodyMeasurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
  orderHistory?: Array<{
    id: string;
    date?: string;
    items: any[];
  }>;
  returnHistory?: Array<{
    productId: string;
    reason?: string;
    date?: string;
  }>;
  updatedAt?: string;
}

export interface ConversationEntry {
  message: string;
  timestamp: number;
  type?: 'user' | 'assistant';
  context?: Record<string, any>;
}

class UserMemoryService {
  /**
   * Store or update user profile
   */
  async saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
    const existing = await this.getUserProfile(userId);
    const updated = {
      ...existing,
      ...profile,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await userMemory.set(userId, updated);
  }

  /**
   * Retrieve user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await userMemory.get(userId);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Append to conversation history
   */
  async appendConversation(userId: string, entry: ConversationEntry): Promise<void> {
    const conversationKey = `${userId}-conversation`;
    await userMemory.append(conversationKey, entry);
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, limit?: number): Promise<ConversationEntry[]> {
    try {
      const history = await userMemory.get(`${userId}-conversation`) || [];
      const sorted = Array.isArray(history) 
        ? history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        : [];
      return limit ? sorted.slice(0, limit) : sorted;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: string, preferences: UserProfile['preferences']): Promise<void> {
    const profile = await this.getUserProfile(userId);
    await this.saveUserProfile(userId, {
      ...profile,
      preferences: {
        ...profile?.preferences,
        ...preferences,
      },
    });
  }

  /**
   * Track product view/interaction
   */
  async trackInteraction(userId: string, productId: string, interactionType: 'view' | 'like' | 'cart' | 'purchase'): Promise<void> {
    const interactionKey = `${userId}-interactions`;
    const interactions = await userMemory.get(interactionKey) || [];
    await userMemory.set(interactionKey, [
      ...(Array.isArray(interactions) ? interactions : []),
      {
        productId,
        type: interactionType,
        timestamp: Date.now(),
      },
    ]);
  }

  /**
   * Get user interaction history
   */
  async getInteractionHistory(userId: string): Promise<any[]> {
    try {
      return await userMemory.get(`${userId}-interactions`) || [];
    } catch (error) {
      console.error('Failed to get interaction history:', error);
      return [];
    }
  }
}

export const userMemoryService = new UserMemoryService();

