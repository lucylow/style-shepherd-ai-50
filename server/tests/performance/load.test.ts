/**
 * Performance and Load Tests
 */

import { describe, it, expect } from 'vitest';
import { multiAgentOrchestrator } from '../../src/services/MultiAgentOrchestrator.js';
import { returnsPredictionEngine } from '../../src/services/ReturnsPredictionEngine.js';

describe('Performance Tests', () => {
  describe('Multi-Agent Orchestrator Performance', () => {
    it('should process queries within latency targets', async () => {
      const query = {
        userId: 'perf-test-user',
        intent: 'search_product',
        entities: {
          category: 'dress',
        },
      };

      const startTime = Date.now();
      const result = await multiAgentOrchestrator.processQuery(query);
      const latency = Date.now() - startTime;

      // Target: < 500ms for voice response
      expect(latency).toBeLessThan(500);
      expect(result.metadata.processingTime).toBeLessThan(500);
    });

    it('should handle concurrent requests efficiently', async () => {
      const queries = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        intent: 'search_product',
        entities: { category: 'shirt' },
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        queries.map((q) => multiAgentOrchestrator.processQuery(q))
      );
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / queries.length;

      // Average should be reasonable even with concurrency
      expect(avgTime).toBeLessThan(1000);
      expect(results.length).toBe(queries.length);
    });
  });

  describe('Returns Prediction Engine Performance', () => {
    it('should predict return risk within latency target', async () => {
      const input = {
        userId: 'perf-test-user',
        productId: 'product-123',
        selectedSize: 'M',
      };

      const startTime = Date.now();
      const prediction = await returnsPredictionEngine.predictReturnRisk(input);
      const latency = Date.now() - startTime;

      // Target: < 180ms for return risk prediction
      expect(latency).toBeLessThan(180);
      expect(prediction.returnProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.returnProbability).toBeLessThanOrEqual(1);
    });

    it('should handle batch predictions efficiently', async () => {
      const inputs = Array.from({ length: 20 }, (_, i) => ({
        userId: 'perf-test-user',
        productId: `product-${i}`,
        selectedSize: 'M',
      }));

      const startTime = Date.now();
      const predictions = await Promise.all(
        inputs.map((input) => returnsPredictionEngine.predictReturnRisk(input))
      );
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / inputs.length;

      // Average should be reasonable
      expect(avgTime).toBeLessThan(200);
      expect(predictions.length).toBe(inputs.length);
    });
  });

  describe('Size Oracle Performance', () => {
    it('should predict size within latency target', async () => {
      const startTime = Date.now();
      const result = await multiAgentOrchestrator.invokeSizeOracle(
        'perf-test-user',
        'Nike',
        'shirt'
      );
      const latency = Date.now() - startTime;

      // Target: < 250ms for size inference
      expect(latency).toBeLessThan(250);
      expect(result.recommendedSize).toBeDefined();
    });
  });
});

