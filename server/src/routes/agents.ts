/**
 * Agent Management Routes
 * Routes for managing and querying ElevenLabs voice agents
 */

import { Router, Request, Response, NextFunction } from 'express';
import { agentRegistry } from '../services/AgentRegistry.js';
import { validateParams, validateQuery, validateBody } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

// Ensure agent registry is initialized
router.use(async (req: Request, res: Response, next: NextFunction) => {
  await agentRegistry.initialize();
  next();
});

// GET /api/agents - Get all available agents
router.get(
  '/agents',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = agentRegistry.getAllAgents();
      res.json({
        agents,
        count: agents.length,
        reference_slide_url: agentRegistry.getReferenceSlideUrl(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/agents/:agentId - Get specific agent
router.get(
  '/agents/:agentId',
  validateParams(z.object({ agentId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const agent = agentRegistry.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const configuration = agentRegistry.getAgentConfiguration(agentId);
      res.json({
        agent,
        configuration: configuration?.dialog_config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/agents/by-capability/:capability - Get agents by capability
router.get(
  '/agents/by-capability/:capability',
  validateParams(z.object({ capability: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { capability } = req.params;
      const agents = agentRegistry.getAgentsByCapability(capability);
      res.json({
        agents,
        capability,
        count: agents.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/agents/by-style/:tag - Get agents by style tag
router.get(
  '/agents/by-style/:tag',
  validateParams(z.object({ tag: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tag } = req.params;
      const agents = agentRegistry.getAgentsByStyleTag(tag);
      res.json({
        agents,
        style_tag: tag,
        count: agents.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/agents/suggest - Suggest agent based on context
router.post(
  '/agents/suggest',
  validateBody(
    z.object({
      intent: z.string().optional(),
      capability: z.string().optional(),
      style: z.string().optional(),
      userType: z.enum(['customer', 'merchant', 'vip']).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = agentRegistry.suggestAgent(req.body);
      
      if (!agent) {
        return res.status(404).json({ error: 'No suitable agent found' });
      }
      
      const configuration = agentRegistry.getAgentConfiguration(agent.agent_id);
      res.json({
        agent,
        configuration: configuration?.dialog_config,
        suggested_for: req.body,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/conversations/:sessionId - Get conversation example
router.get(
  '/conversations/:sessionId',
  validateParams(z.object({ sessionId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const conversation = agentRegistry.getConversationExample(sessionId);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      const agent = agentRegistry.getAgent(conversation.agent_id);
      res.json({
        conversation,
        agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/conversations/by-agent/:agentId - Get all conversations for an agent
router.get(
  '/conversations/by-agent/:agentId',
  validateParams(z.object({ agentId: z.string().min(1) })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId } = req.params;
      const conversations = agentRegistry.getConversationsByAgent(agentId);
      res.json({
        conversations,
        agent_id: agentId,
        count: conversations.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/agents/config/fallback-strategy - Get fallback strategy
router.get(
  '/agents/config/fallback-strategy',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const strategy = agentRegistry.getFallbackStrategy();
      res.json({ strategy });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/agents/config/usage-billing - Get usage and billing mock data
router.get(
  '/agents/config/usage-billing',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usageData = agentRegistry.getUsageAndBilling();
      res.json({ usage_and_billing: usageData });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

