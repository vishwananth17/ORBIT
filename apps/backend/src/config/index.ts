import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load root .env or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
  FRONTEND_URL: z.string().default('http://localhost:8081'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/orbit_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SUPABASE_URL: z.string().optional().default('https://example.supabase.co'),
  SUPABASE_ANON_KEY: z.string().optional().default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default('mock-service-role-key'),
  SUPABASE_JWT_SECRET: z.string().optional().default('super-secret-jwt-key-orbit-for-dev'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_DEFAULT_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  ANTHROPIC_FAST_MODEL: z.string().default('claude-3-5-haiku-20241022'),
  TOKEN_ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config Error] Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
