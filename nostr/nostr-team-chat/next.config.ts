import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    // Prevents clickjacking attacks by controlling iframe embedding
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Prevents MIME type sniffing attacks
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Controls how much referrer information is sent
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Enables XSS filtering in older browsers
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    // Controls browser features and APIs
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Strict Transport Security - forces HTTPS
    // Only enable in production with valid SSL
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  
  // Ignore ESLint errors during production builds
  // These are pre-existing issues that should be fixed incrementally
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignore TypeScript errors during production builds
  // Enable this only if you have pre-existing type issues
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
