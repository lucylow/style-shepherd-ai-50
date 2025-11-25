/**
 * Integration Tests for Multi-Agent Orchestrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { multiAgentOrchestrator } from '../../src/services/MultiAgentOrchestrator.js';

describe('MultiAgentOrchestrator Integration', () => {
  describe('processQuery', () => {
    it('should process a product search query through all agents', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'search_product',
        entities: {
          color: 'blue',
          category: 'dress',
          occasion: 'wedding',
        },
      };

      const result = await multiAgentOrchestrator.processQuery(query);

      expect(result).toBeDefined();
      expect(result.query).toEqual(query);
      expect(result.aggregatedRecommendations).toBeDefined();
      expect(Array.isArray(result.aggregatedRecommendations)).toBe(true);
      expect(result.naturalLanguageResponse).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.agentsUsed.length).toBeGreaterThan(0);
    });

    it('should invoke Size Oracle for size-related queries', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'get_size_recommendation',
        entities: {
          brand: 'Nike',
          category: 'shirt',
        },
      };

      const result = await multiAgentOrchestrator.processQuery(query);

      expect(result.sizeOracle).toBeDefined();
      expect(result.sizeOracle?.recommendedSize).toBeDefined();
      expect(result.sizeOracle?.confidence).toBeGreaterThan(0);
    });

    it('should invoke Returns Prophet for risk assessment', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'assess_return_risk',
        entities: {
          productIds: ['product-1', 'product-2'],
        },
      };

      const result = await multiAgentOrchestrator.processQuery(query);

      expect(result.returnsProphet).toBeDefined();
      expect(result.returnsProphet?.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.returnsProphet?.riskScore).toBeLessThanOrEqual(1);
      expect(result.returnsProphet?.riskLevel).toMatch(/low|medium|high/);
    });

    it('should invoke Personal Stylist for style recommendations', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'get_style_recommendations',
        entities: {
          color: 'black',
          style: 'casual',
        },
      };

      const result = await multiAgentOrchestrator.processQuery(query);

      expect(result.personalStylist).toBeDefined();
      expect(result.personalStylist?.recommendations).toBeDefined();
      expect(Array.isArray(result.personalStylist?.recommendations)).toBe(true);
    });
  });

  describe('Agent Coordination', () => {
    it('should coordinate multiple agents in parallel', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'search_product',
        entities: {
          color: 'red',
          category: 'dress',
          brand: 'Zara',
        },
      };

      const startTime = Date.now();
      const result = await multiAgentOrchestrator.processQuery(query);
      const processingTime = Date.now() - startTime;

      // Should complete in reasonable time (< 2 seconds for parallel execution)
      expect(processingTime).toBeLessThan(2000);
      expect(result.metadata.processingTime).toBeLessThan(2000);
    });

    it('should aggregate results from all agents', async () => {
      const query = {
        userId: 'test-user-123',
        intent: 'search_product',
        entities: {
          category: 'jeans',
        },
      };

      const result = await multiAgentOrchestrator.processQuery(query);

      // Should have aggregated recommendations combining all agent outputs
      expect(result.aggregatedRecommendations.length).toBeGreaterThan(0);
      result.aggregatedRecommendations.forEach((rec) => {
        expect(rec.finalScore).toBeGreaterThan(0);
        expect(rec.reasoning).toBeDefined();
      });
    });
  });
});

