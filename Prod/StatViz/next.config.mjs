/** @type {import('next').NextConfig} */
const nextConfig = {
  // React strict mode for development warnings
  reactStrictMode: true,

  // Gzip compression
  compress: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Server actions configuration
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Allow large file uploads (DOCX + HTML)
    },
  },

  // Image optimization (if needed later)
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Security headers (additional to middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
