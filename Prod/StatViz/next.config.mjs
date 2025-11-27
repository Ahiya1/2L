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
}

export default nextConfig
