/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable server-side external packages for better-sqlite3
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

module.exports = nextConfig;
