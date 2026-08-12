/** @type {import('next').NextConfig} */

// Validate `NEXT_PUBLIC_*` environment variables at build time.
// (Kept inline here because next.config.js is CommonJS and is evaluated
// before TypeScript compilation, so it cannot import .ts files.)
const { z } = require('zod');

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

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
});

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(
    `Invalid web environment configuration:\n${issues}\n\n` +
      'Please review your .env file. See .env.example for a complete reference.',
  );
  process.exit(1);
}

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@veridion/ui', '@veridion/shared', '@veridion/sdk'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    typedRoutes: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
