/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Replit preview and dev domains
  allowedDevOrigins: [
    '*.replit.dev',
    '*.repl.co',
    '127.0.0.1',
    'localhost',
  ],
  // Allow all hosts (required for Replit proxied iframe)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
    ];
  },
  // Standalone output for Docker
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
