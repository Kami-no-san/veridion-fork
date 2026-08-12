import { z } from 'zod';

/**
 * Environment variable schema for the Veridion API.
 *
 * Required variables are marked with no `.optional()` and a `default()`.
 * In production, secrets must be provided; in development they fall back
 * to safe local defaults.
 */
const envSchema = z.object({
  // ---- Runtime ----
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL').default('http://localhost:3000'),

  // ---- Database ----
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine((val) => /^postgres(ql)?:\/\//.test(val), {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),

  // ---- Redis ----
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),

  // ---- Auth (JWT) ----
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required').default('dev-secret'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, 'JWT_REFRESH_SECRET is required')
    .default('dev-refresh-secret'),
  JWT_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  // ---- AI ----
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ---- Blockchain (Stellar Soroban) ----
  STELLAR_NETWORK: z
    .string()
    .default('testnet')
    .transform((value) => value.toLowerCase())
    .refine((value) => ['testnet', 'mainnet', 'futurenet'].includes(value), {
      message: 'STELLAR_NETWORK must be one of: testnet, mainnet, futurenet',
    }),
  STELLAR_RPC_URL: z.string().url('STELLAR_RPC_URL must be a valid URL').optional(),

  // ---- Email ----
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email').optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Throws an Error with a human-readable list of all validation failures.
 */
export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'Please review your .env file. See .env.example for a complete reference.',
    );
  }

  // Extra guard: in production, do not allow the insecure default secrets.
  if (result.data.NODE_ENV === 'production') {
    const insecureSecrets = [
      { key: 'JWT_SECRET', value: result.data.JWT_SECRET },
      { key: 'JWT_REFRESH_SECRET', value: result.data.JWT_REFRESH_SECRET },
    ].filter(({ value }) => value === 'dev-secret' || value === 'dev-refresh-secret');

    if (insecureSecrets.length > 0) {
      throw new Error(
        `Insecure secrets detected in production: ${insecureSecrets.map((s) => s.key).join(', ')}. ` +
          'Set strong secrets via environment variables.',
      );
    }
  }

  return result.data;
}
