/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BACKEND_HOST: process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost',
    NEXT_PUBLIC_BACKEND_PORT: process.env.NEXT_PUBLIC_BACKEND_PORT || '5001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 
      `http://${process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_BACKEND_PORT || '5001'}/api`
  },
  // Enable compression
  compress: true,
  // Optimize for production
  poweredByHeader: false,
  // Generate build ID for cache busting
  generateBuildId: async () => {
    return 'build-' + Date.now()
  }
}

module.exports = nextConfig
