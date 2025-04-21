/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Also ignore TypeScript errors during builds
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['jtlljtysmjcrreyswtsl.supabase.co'],
    unoptimized: true,
  },
  poweredByHeader: false,
};

module.exports = nextConfig; 