import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Expose server-side environment variables to the runtime
  env: {
    GOOGLE_CSE_API_KEY: process.env.GOOGLE_CSE_API_KEY,
    GOOGLE_CSE_CX: process.env.GOOGLE_CSE_CX,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'depinprod.s3.pl-waw.scw.cloud',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'aaftjwktzpnyjwklroww.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      }
    ],
  },
  webpack: (config, { dev, isServer }) => {
    const shouldSilenceWarning = (warning: any, matcher: { message?: string; resource?: string }) => {
      const messageMatch = matcher.message ? warning.message?.includes(matcher.message) : true;
      const resourceMatch = matcher.resource ? warning.module?.resource?.includes(matcher.resource) : true;
      return Boolean(messageMatch && resourceMatch);
    };

    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push(
      (warning: any) =>
        shouldSilenceWarning(warning, {
          message: 'Critical dependency: the request of a dependency is an expression',
          resource: '@opentelemetry/instrumentation',
        }),
      (warning: any) =>
        shouldSilenceWarning(warning, {
          message: 'require.extensions is not supported by webpack',
        })
    );

    // Mejorar configuración para desarrollo
    if (dev && !isServer) {
      // Optimizar HMR y source maps para desarrollo
      config.devtool = 'eval-cheap-module-source-map';

      // Configuración para mejor HMR
      config.watchOptions = {
        ...config.watchOptions,
        poll: 500, // Reducir polling para más rápido refresh
        aggregateTimeout: 150, // Reducir timeout para respuestas más rápidas
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'], // Ignorar carpetas innecesarias
      };

      // Optimizar caché de módulos
      config.module.rules = config.module.rules.map((rule: any) => {
        if (rule.oneOf) {
          rule.oneOf = rule.oneOf.map((r: any) => {
            if (r.use && r.use.loader && r.use.loader.includes('next-swc-loader')) {
              r.use.options = {
                ...r.use.options,
                // Optimizar compilación SWC para desarrollo
              };
            }
            return r;
          });
        }
        return rule;
      });
    }

    // Optimizar source maps para producción
    if (!dev) {
      config.devtool = 'hidden-source-map';
    }

    return config;
  },
};

export default nextConfig;
