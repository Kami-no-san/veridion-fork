import { z } from 'zod';

/**
 * Environment variable schema for the Veridion web app.
 *
 * Only `NEXT_PUBLIC_*` variables are exposed to the browser.
 * These are validated at build time.
 */
const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a valid URL')
    .default('http://localhost:4000'),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'mainnet', 'futurenet']).default('testnet'),
});

export type WebEnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate public environment variables.
 * Throws an Error with a human-readable list of all validation failures.
 */
export function validateWebEnv(): WebEnvConfig {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  });

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid web environment configuration:\n${issues}\n\n` +
        'Please review your .env file. See .env.example for a complete reference.',
    );
  }

  return result.data;
}
