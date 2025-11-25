/**
 * Unit Tests for VoiceAssistant Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoiceAssistant } from '../../src/services/VoiceAssistant.js';

describe('VoiceAssistant', () => {
  let voiceAssistant: VoiceAssistant;

  beforeEach(() => {
    voiceAssistant = new VoiceAssistant();
  });

  describe('startConversation', () => {
    it('should create a new conversation with valid userId', async () => {
      const userId = 'test-user-123';
      const state = await voiceAssistant.startConversation(userId);

      expect(state).toBeDefined();
      expect(state.userId).toBe(userId);
      expect(state.conversationId).toContain(userId);
      expect(state.context).toBeDefined();
    });

    it('should throw error for invalid userId', async () => {
      await expect(voiceAssistant.startConversation('')).rejects.toThrow();
      await expect(voiceAssistant.startConversation(null as any)).rejects.toThrow();
    });
  });

  describe('processTextQuery', () => {
    it('should process text query and return response', async () => {
      const query = 'I need a blue dress';
      const userId = 'test-user-123';

      const result = await voiceAssistant.processTextQuery(query, userId);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should extract intent and entities', async () => {
      const query = 'Show me medium size jeans';
      const userId = 'test-user-123';

      const result = await voiceAssistant.processTextQuery(query, userId);

      expect(result.intent).toBeDefined();
      expect(result.entities).toBeDefined();
    });

    it('should handle empty query', async () => {
      await expect(voiceAssistant.processTextQuery('', 'test-user')).rejects.toThrow();
    });
  });

  describe('getUserPreferences', () => {
    it('should retrieve user preferences', async () => {
      const userId = 'test-user-123';
      const preferences = await voiceAssistant.getUserPreferences(userId);

      expect(preferences).toBeDefined();
      expect(typeof preferences).toBe('object');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const userId = 'test-user-123';
      const newPreferences = {
        voicePreference: '21m00Tcm4TlvDq8ikWAM',
        sizePreferences: { 'Levi\'s': 'M' },
      };

      await expect(
        voiceAssistant.updateUserPreferences(userId, newPreferences)
      ).resolves.not.toThrow();
    });
  });
});

