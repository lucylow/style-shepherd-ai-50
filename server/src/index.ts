/**
 * Style Shepherd Backend API Server
 * Main entry point for the backend API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import env from './config/env.js';
import vultrRoutes from './routes/vultr.js';
import apiRoutes from './routes/api.js';
import { vultrPostgres } from './lib/vultr-postgres.js';
import { vultrValkey } from './lib/vultr-valkey.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        // For Lovable/Raindrop deployment, allow same-origin requests
        callback(null, true); // Allow all origins in production (adjust as needed)
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing - IMPORTANT: Stripe webhooks need raw body for signature verification
// We need to handle webhook route separately with raw body, then use JSON for other routes
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const [postgresHealth, valkeyHealth] = await Promise.all([
      vultrPostgres.healthCheck(),
      vultrValkey.healthCheck(),
    ]);

    res.json({
      status: 'healthy',
      services: {
        postgres: postgresHealth,
        valkey: valkeyHealth,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service health check failed',
    });
  }
});

// API routes
app.use('/api/vultr', vultrRoutes);
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({
    name: 'Style Shepherd API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      vultr: '/api/vultr',
      api: '/api',
    },
  });
});

// Error handling middleware
import { AppError, isAppError, toAppError } from './lib/errors.js';

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Convert to AppError if needed
  const error = isAppError(err) ? err : toAppError(err);
  
  // Log error with context
  const logData = {
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  };
  
  if (error.statusCode >= 500) {
    console.error('Server Error:', logData);
  } else {
    console.warn('Client Error:', logData);
  }
  
  // Send error response
  res.status(error.statusCode).json(error.toJSON());
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Style Shepherd API server running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await vultrPostgres.close();
    await vultrValkey.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await vultrPostgres.close();
    await vultrValkey.close();
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

