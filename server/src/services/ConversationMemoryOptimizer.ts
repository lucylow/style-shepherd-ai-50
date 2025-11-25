/**
 * Conversation Memory Optimizer
 * Reduces memory footprint by:
 * - Compressing conversation history
 * - Summarizing old messages
 * - Removing redundant information
 * - Smart retention policies
 */

export interface ConversationMessage {
  message: string;
  type: 'user' | 'assistant';
  timestamp: number;
  intent?: string;
  entities?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  summary: string;
  keyPoints: string[];
  preferences?: Record<string, any>;
  lastUpdated: number;
}

export interface OptimizedConversation {
  recentMessages: ConversationMessage[]; // Last N messages (full)
  summary: ConversationSummary; // Summarized older messages
  metadata: {
    totalMessages: number;
    compressedAt: number;
    compressionRatio: number;
  };
}

export class ConversationMemoryOptimizer {
  private readonly MAX_RECENT_MESSAGES = 10; // Keep last 10 messages full
  private readonly COMPRESSION_THRESHOLD = 20; // Compress after 20 messages
  private readonly MAX_MESSAGE_LENGTH = 1000; // Truncate messages longer than this

  /**
   * Optimize conversation history by compressing old messages
   */
  async optimizeConversation(
    messages: ConversationMessage[],
    options?: {
      maxRecent?: number;
      compressionThreshold?: number;
      preserveImportant?: boolean;
    }
  ): Promise<OptimizedConversation> {
    const maxRecent = options?.maxRecent || this.MAX_RECENT_MESSAGES;
    const compressionThreshold = options?.compressionThreshold || this.COMPRESSION_THRESHOLD;

    // If conversation is short, no compression needed
    if (messages.length <= compressionThreshold) {
      return {
        recentMessages: messages,
        summary: {
          summary: '',
          keyPoints: [],
          lastUpdated: Date.now(),
        },
        metadata: {
          totalMessages: messages.length,
          compressedAt: Date.now(),
          compressionRatio: 1.0,
        },
      };
    }

    // Split into recent and old messages
    const recentMessages = messages.slice(-maxRecent);
    const oldMessages = messages.slice(0, -maxRecent);

    // Summarize old messages
    const summary = await this.summarizeMessages(oldMessages, options?.preserveImportant);

    // Calculate compression ratio
    const originalSize = JSON.stringify(messages).length;
    const optimizedSize = JSON.stringify({ recentMessages, summary }).length;
    const compressionRatio = optimizedSize / originalSize;

    return {
      recentMessages,
      summary,
      metadata: {
        totalMessages: messages.length,
        compressedAt: Date.now(),
        compressionRatio,
      },
    };
  }

  /**
   * Summarize a list of messages
   */
  private async summarizeMessages(
    messages: ConversationMessage[],
    preserveImportant: boolean = true
  ): Promise<ConversationSummary> {
    // Extract key information
    const keyPoints: string[] = [];
    const preferences: Record<string, any> = {};
    const intents: Record<string, number> = {};
    const entities: Record<string, any> = {};

    for (const msg of messages) {
      // Extract preferences
      if (msg.entities) {
        if (msg.entities.color) preferences.color = msg.entities.color;
        if (msg.entities.size) preferences.size = msg.entities.size;
        if (msg.entities.brand) preferences.brand = msg.entities.brand;
        if (msg.entities.style) preferences.style = msg.entities.style;
      }

      // Track intents
      if (msg.intent) {
        intents[msg.intent] = (intents[msg.intent] || 0) + 1;
      }

      // Extract key points from important messages
      if (preserveImportant && this.isImportantMessage(msg)) {
        const truncated = this.truncateMessage(msg.message);
        keyPoints.push(`User: ${truncated}`);
      }
    }

    // Generate summary
    const summary = this.generateSummary(messages, intents, preferences);

    return {
      summary,
      keyPoints: keyPoints.slice(0, 10), // Keep top 10 key points
      preferences: Object.keys(preferences).length > 0 ? preferences : undefined,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Generate summary text from messages
   */
  private generateSummary(
    messages: ConversationMessage[],
    intents: Record<string, number>,
    preferences: Record<string, any>
  ): string {
    const parts: string[] = [];

    // Main topics discussed
    const topIntents = Object.entries(intents)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([intent]) => intent.replace(/_/g, ' '));

    if (topIntents.length > 0) {
      parts.push(`Discussed: ${topIntents.join(', ')}`);
    }

    // User preferences mentioned
    if (Object.keys(preferences).length > 0) {
      const prefs = Object.entries(preferences)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      parts.push(`Preferences: ${prefs}`);
    }

    // Message count context
    parts.push(`${messages.length} messages in this conversation`);

    return parts.join('. ') + '.';
  }

  /**
   * Check if message is important and should be preserved
   */
  private isImportantMessage(message: ConversationMessage): boolean {
    // Important keywords that indicate preference or key information
    const importantKeywords = [
      'prefer', 'like', 'dislike', 'remember', 'save', 'always', 'never',
      'size', 'color', 'style', 'brand', 'favorite', 'usually', 'always wear'
    ];

    const lowerMessage = message.message.toLowerCase();
    return importantKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Truncate message if too long
   */
  private truncateMessage(message: string, maxLength: number = this.MAX_MESSAGE_LENGTH): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Restore full conversation from optimized version
   * Returns a simplified version suitable for context
   */
  restoreContext(optimized: OptimizedConversation): ConversationMessage[] {
    const messages: ConversationMessage[] = [];

    // Add summary as a system message
    if (optimized.summary.summary) {
      messages.push({
        message: `[Context Summary] ${optimized.summary.summary}`,
        type: 'assistant',
        timestamp: optimized.summary.lastUpdated,
        metadata: { isSummary: true },
      });

      // Add key points
      for (const point of optimized.summary.keyPoints.slice(0, 3)) {
        messages.push({
          message: point,
          type: 'user',
          timestamp: optimized.summary.lastUpdated,
          metadata: { isKeyPoint: true },
        });
      }
    }

    // Add recent messages
    messages.push(...optimized.recentMessages);

    return messages;
  }

  /**
   * Merge two optimized conversations
   */
  mergeConversations(
    old: OptimizedConversation,
    newMessages: ConversationMessage[]
  ): OptimizedConversation {
    // Combine recent messages
    const allRecent = [...old.recentMessages, ...newMessages];

    // Re-optimize if needed
    if (allRecent.length > this.COMPRESSION_THRESHOLD) {
      // This would trigger re-optimization
      // For now, just keep recent messages and update summary
      return {
        recentMessages: allRecent.slice(-this.MAX_RECENT_MESSAGES),
        summary: {
          ...old.summary,
          lastUpdated: Date.now(),
        },
        metadata: {
          totalMessages: old.metadata.totalMessages + newMessages.length,
          compressedAt: Date.now(),
          compressionRatio: old.metadata.compressionRatio,
        },
      };
    }

    return {
      ...old,
      recentMessages: allRecent,
      metadata: {
        ...old.metadata,
        totalMessages: old.metadata.totalMessages + newMessages.length,
      },
    };
  }

  /**
   * Get conversation size estimate
   */
  getSizeEstimate(conversation: OptimizedConversation | ConversationMessage[]): number {
    if (Array.isArray(conversation)) {
      return JSON.stringify(conversation).length;
    }
    return JSON.stringify(conversation).length;
  }

  /**
   * Clean up old messages beyond retention period
   */
  cleanupOldMessages(
    messages: ConversationMessage[],
    retentionDays: number = 30
  ): ConversationMessage[] {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    return messages.filter(msg => msg.timestamp >= cutoffTime);
  }
}

export const conversationMemoryOptimizer = new ConversationMemoryOptimizer();
