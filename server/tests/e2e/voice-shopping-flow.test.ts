/**
 * End-to-End Tests for Voice Shopping Flow
 */

import { describe, it, expect } from 'vitest';
import { multiAgentOrchestrator } from '../../src/services/MultiAgentOrchestrator.js';
import { voiceAssistant } from '../../src/services/VoiceAssistant.js';

describe('Voice Shopping Flow E2E', () => {
  const userId = 'e2e-test-user';

  it('should complete full voice shopping flow', async () => {
    // Step 1: Start conversation
    const conversation = await voiceAssistant.startConversation(userId);
    expect(conversation.conversationId).toBeDefined();

    // Step 2: Process voice query
    const query = {
      userId,
      intent: 'search_product',
      entities: {
        color: 'blue',
        category: 'dress',
        occasion: 'wedding',
        budget: 200,
      },
    };

    const result = await multiAgentOrchestrator.processQuery(query);

    // Step 3: Verify recommendations
    expect(result.aggregatedRecommendations.length).toBeGreaterThan(0);

    // Step 4: Get size recommendation
    const sizeResult = await multiAgentOrchestrator.invokeSizeOracle(
      userId,
      result.aggregatedRecommendations[0].productId
    );
    expect(sizeResult.recommendedSize).toBeDefined();

    // Step 5: Assess return risk
    const riskResult = await multiAgentOrchestrator.invokeReturnsProphet(
      userId,
      result.aggregatedRecommendations.map((r) => r.productId)
    );
    expect(riskResult.riskScore).toBeGreaterThanOrEqual(0);
    expect(riskResult.riskScore).toBeLessThanOrEqual(1);

    // Step 6: Generate natural language response
    expect(result.naturalLanguageResponse).toBeDefined();
    expect(result.naturalLanguageResponse.length).toBeGreaterThan(0);
  });

  it('should handle multi-turn conversation', async () => {
    // First query
    const query1 = {
      userId,
      intent: 'search_product',
      entities: {
        category: 'shoes',
      },
    };

    const result1 = await multiAgentOrchestrator.processQuery(query1);
    expect(result1.aggregatedRecommendations.length).toBeGreaterThan(0);

    // Follow-up query with refinement
    const query2 = {
      userId,
      intent: 'refine_search',
      entities: {
        color: 'black',
        size: '9',
      },
      conversationHistory: [
        { type: 'user', message: 'Show me shoes' },
        { type: 'assistant', message: result1.naturalLanguageResponse },
      ],
    };

    const result2 = await multiAgentOrchestrator.processQuery(query2);
    expect(result2.aggregatedRecommendations).toBeDefined();
  });

  it('should handle error scenarios gracefully', async () => {
    // Invalid user ID
    const invalidQuery = {
      userId: '',
      intent: 'search_product',
      entities: {},
    };

    await expect(multiAgentOrchestrator.processQuery(invalidQuery)).rejects.toThrow();

    // Missing entities
    const minimalQuery = {
      userId: 'test-user',
      intent: 'search_product',
      entities: {},
    };

    const result = await multiAgentOrchestrator.processQuery(minimalQuery);
    // Should still return a result, possibly with defaults
    expect(result).toBeDefined();
  });
});

