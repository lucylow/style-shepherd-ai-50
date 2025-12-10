/**
 * Environment Configuration
 * Validates and exports all environment variables
 * Supports DEMO_MODE for running without external services
 */

import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

// Check if running in demo mode (for hackathon judges)
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  DEMO_MODE: z.string().transform(val => val === 'true').default('false'),
  
  // Raindrop Platform (optional for demo mode)
  RAINDROP_API_KEY: DEMO_MODE ? z.string().optional() : z.string().min(1),
  RAINDROP_PROJECT_ID: DEMO_MODE ? z.string().optional() : z.string().min(1),
  RAINDROP_BASE_URL: z.string().url().optional(),
  
  // Vultr Services (optional for demo mode)
  VULTR_POSTGRES_HOST: DEMO_MODE ? z.string().optional().default('localhost') : z.string().min(1),
  VULTR_POSTGRES_PORT: z.string().transform(Number).default('5432'),
  VULTR_POSTGRES_DATABASE: DEMO_MODE ? z.string().optional().default('style_shepherd') : z.string().min(1),
  VULTR_POSTGRES_USER: DEMO_MODE ? z.string().optional().default('postgres') : z.string().min(1),
  VULTR_POSTGRES_PASSWORD: DEMO_MODE ? z.string().optional().default('') : z.string().min(1),
  VULTR_POSTGRES_SSL: z.string().transform(val => val === 'true').default('false'),
  
  VULTR_VALKEY_HOST: DEMO_MODE ? z.string().optional().default('localhost') : z.string().min(1),
  VULTR_VALKEY_PORT: z.string().transform(Number).default('6379'),
  VULTR_VALKEY_PASSWORD: z.string().optional(),
  VULTR_VALKEY_TLS: z.string().transform(val => val === 'true').default('false'),
  
  VULTR_API_ENDPOINT: z.string().url().optional(),
  VULTR_API_KEY: z.string().optional(),
  
  // ElevenLabs (optional - voice AI platform)
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVEN_LABS_API_KEY: z.string().optional(), // Legacy support
  
  // OpenAI (optional - for LLM and Whisper STT)
  OPENAI_API_KEY: z.string().optional(),
  
  // WorkOS (optional for demo mode)
  WORKOS_API_KEY: DEMO_MODE ? z.string().optional() : z.string().min(1),
  WORKOS_CLIENT_ID: DEMO_MODE ? z.string().optional() : z.string().min(1),
  
  // Stripe (optional for demo mode)
  STRIPE_SECRET_KEY: DEMO_MODE ? z.string().optional() : z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // CORS - support multiple origins for Lovable deployment
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:8080,http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  
  if (DEMO_MODE) {
    console.log('🎭 Running in DEMO MODE - external services will be mocked');
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    
    if (!DEMO_MODE) {
      console.error('\n💡 Tip: Set DEMO_MODE=true to run without external services');
    }
    
    process.exit(1);
  }
  throw error;
}

export default env;
