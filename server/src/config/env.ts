/**
 * Environment Configuration
 * Validates and exports all environment variables
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  
  // Raindrop Platform (optional for Lovable Cloud)
  RAINDROP_API_KEY: z.string().optional(),
  RAINDROP_PROJECT_ID: z.string().optional(),
  RAINDROP_BASE_URL: z.string().url().optional(),
  
  // Vultr Services
  VULTR_POSTGRES_HOST: z.string().min(1),
  VULTR_POSTGRES_PORT: z.string().transform(Number).default('5432'),
  VULTR_POSTGRES_DATABASE: z.string().min(1),
  VULTR_POSTGRES_USER: z.string().min(1),
  VULTR_POSTGRES_PASSWORD: z.string().min(1),
  VULTR_POSTGRES_SSL: z.string().transform(val => val === 'true').default('true'),
  
  VULTR_VALKEY_HOST: z.string().min(1),
  VULTR_VALKEY_PORT: z.string().transform(Number).default('6379'),
  VULTR_VALKEY_PASSWORD: z.string().optional(),
  VULTR_VALKEY_TLS: z.string().transform(val => val === 'true').default('true'),
  
  VULTR_API_ENDPOINT: z.string().url().optional(),
  VULTR_API_KEY: z.string().optional(),
  
  // ElevenLabs (optional - voice AI platform)
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVEN_LABS_API_KEY: z.string().optional(), // Legacy support
  
  // WorkOS
  WORKOS_API_KEY: z.string().min(1),
  WORKOS_CLIENT_ID: z.string().min(1),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // CORS - support multiple origins for Lovable deployment
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:8080'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default env;

