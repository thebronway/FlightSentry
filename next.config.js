/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'node-libcurl', 'fast-flights-ts'],
  },
};

module.exports = nextConfig;