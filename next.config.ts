import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  async rewrites() {
    return [
      {
        source: '/@vite/client',
        destination: '/404',
      },
      // Suppress common development noise
      {
        source: '/_next/static/chunks/:path*',
        destination: '/_next/static/chunks/:path*',
      },
      {
        source: '/favicon.ico',
        destination: '/favicon.ico',
      },
    ];
  },
  // Suppress console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      }
    ],
  },
};

export default nextConfig;
