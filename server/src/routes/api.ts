/**
 * Main API Routes
 * Product recommendations, voice, payments, auth
 */

import { Router, Request, Response, NextFunction } from 'express';
import { productRecommendationAPI } from '../services/ProductRecommendationAPI.js';
import { voiceAssistant } from '../services/VoiceAssistant.js';
import { fashionEngine } from '../services/FashionEngine.js';
import { paymentService } from '../services/PaymentService.js';
import { authService } from '../services/AuthService.js';
import { NotFoundError } from '../lib/errors.js';
import { validateBody, validateParams, validateQuery, commonSchemas } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

// Product Recommendations
router.post(
  '/recommendations',
  validateBody(
    z.object({
      userPreferences: z.object({
        favoriteColors: z.array(z.string()).optional(),
        preferredBrands: z.array(z.string()).optional(),
        preferredStyles: z.array(z.string()).optional(),
        preferredSizes: z.array(z.string()).optional(),
        bodyMeasurements: z.object({
          height: z.number().optional(),
          weight: z.number().optional(),
          chest: z.number().optional(),
          waist: z.number().optional(),
          hips: z.number().optional(),
        }).optional(),
      }),
      context: z.object({
        occasion: z.string().optional(),
        budget: z.number().positive().optional(),
        sessionType: z.enum(['browsing', 'searching', 'voice_shopping']).optional(),
        recentViews: z.array(z.string()).optional(),
        searchQuery: z.string().optional(),
      }).optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userPreferences, context } = req.body;
    const recommendations = await productRecommendationAPI.getRecommendations(
      userPreferences,
        context || {}
    );
    res.json({ recommendations });
  } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/visual-search',
  validateBody(
    z.object({
      imageUrl: z.string().url('Invalid image URL'),
      limit: z.number().int().positive().max(50).optional().default(10),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { imageUrl, limit } = req.body;
    const results = await productRecommendationAPI.findSimilarProducts(
      imageUrl,
        limit
    );
    res.json({ results });
  } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/size-prediction',
  validateBody(
    z.object({
      measurements: z.object({
        height: z.number().positive().optional(),
        weight: z.number().positive().optional(),
        chest: z.number().positive().optional(),
        waist: z.number().positive().optional(),
        hips: z.number().positive().optional(),
      }),
      productId: z.string().min(1, 'Product ID is required'),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { measurements, productId } = req.body;
    const result = await productRecommendationAPI.predictOptimalSize(
      measurements,
      productId
    );
    res.json(result);
  } catch (error) {
      next(error);
    }
  }
);

// Voice Assistant
router.post(
  '/voice/conversation/start',
  validateBody(z.object({ userId: commonSchemas.userId })),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const state = await voiceAssistant.startConversation(userId);
    res.json(state);
  } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/voice/conversation/process',
  validateBody(
    z.object({
      conversationId: z.string().min(1, 'Conversation ID is required'),
      audioStream: z.string().min(1, 'Audio stream is required'),
      userId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, audioStream, userId } = req.body;
    // In production, audioStream would be a Buffer from multipart/form-data
    const audioBuffer = Buffer.from(audioStream, 'base64');
    const response = await voiceAssistant.processVoiceInput(
      conversationId,
      audioBuffer,
      userId
    );
    res.json(response);
  } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/voice/conversation/history/:userId',
  validateParams(z.object({ userId: commonSchemas.userId })),
  validateQuery(z.object({ limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)) })),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const history = await voiceAssistant.getConversationHistory(userId, limit);
    res.json({ history });
  } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/voice/conversation/end',
  validateBody(
    z.object({
      conversationId: z.string().min(1, 'Conversation ID is required'),
      userId: z.string().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, userId } = req.body;
    await voiceAssistant.endConversation(conversationId, userId);
    res.json({ success: true });
  } catch (error) {
      next(error);
    }
  }
);

// Fashion Engine
router.post(
  '/fashion/recommendation',
  validateBody(
    z.object({
      userId: z.string().min(1, 'User ID is required'),
      occasion: z.string().optional(),
      budget: z.number().positive().optional(),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, occasion, budget } = req.body;
    const recommendation = await fashionEngine.getPersonalizedRecommendation(
      userId,
      occasion,
      budget
    );
    res.json(recommendation);
  } catch (error) {
      next(error);
    }
  }
);

// Payments
router.post(
  '/payments/intent',
  validateBody(
    z.object({
      userId: z.string().min(1, 'User ID is required'),
      items: z.array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
          size: z.string().min(1),
        })
      ).min(1, 'Order must contain at least one item'),
      totalAmount: z.number().positive('Total amount must be positive'),
      shippingInfo: z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zip: z.string().min(1),
        country: z.string().min(1),
      }),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = req.body;
    const result = await paymentService.createPaymentIntent(order);
    res.json(result);
  } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/payments/confirm',
  validateBody(
    z.object({
      paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
      order: z.object({
        userId: z.string().min(1),
        items: z.array(
          z.object({
            productId: z.string().min(1),
            quantity: z.number().int().positive(),
            price: z.number().positive(),
            size: z.string().min(1),
          })
        ).min(1),
        totalAmount: z.number().positive(),
        shippingInfo: z.object({
          name: z.string().min(1),
          address: z.string().min(1),
          city: z.string().min(1),
          state: z.string().min(1),
          zip: z.string().min(1),
          country: z.string().min(1),
        }),
      }),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentIntentId, order } = req.body;
    const result = await paymentService.confirmPayment(paymentIntentId, order);
    res.json(result);
  } catch (error) {
      next(error);
    }
  }
);

router.post('/payments/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    await paymentService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/payments/return-prediction',
  validateBody(
    z.object({
      userId: z.string().min(1),
      items: z.array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          price: z.number().positive(),
          size: z.string().min(1),
        })
      ).min(1),
      totalAmount: z.number().positive(),
      shippingInfo: z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zip: z.string().min(1),
        country: z.string().min(1),
      }),
    })
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = req.body;
      const prediction = await paymentService.createReturnPrediction(order);
      res.json(prediction);
    } catch (error) {
      next(error);
    }
  }
);

// Authentication
router.get(
  '/auth/authorize',
  validateQuery(
    z.object({
      redirectUri: z.string().url('Invalid redirect URI'),
      state: z.string().optional(),
    })
  ),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const redirectUri = req.query.redirectUri as string;
      const state = req.query.state as string | undefined;
      const url = authService.getAuthorizationUrl(redirectUri, state);
      res.json({ authorizationUrl: url });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/auth/callback',
  validateBody(z.object({ code: z.string().min(1, 'Authorization code is required') })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body;
      const result = await authService.handleCallback(code);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/auth/profile/:userId',
  validateParams(z.object({ userId: commonSchemas.userId })),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const user = await authService.getUserProfile(userId);
    if (!user) {
        throw new NotFoundError('User', userId);
    }
    res.json(user);
  } catch (error) {
      next(error);
    }
  }
);

export default router;

