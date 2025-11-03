/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure server listens on both localhost and 127.0.0.1
  async rewrites() {
    return []
  },
}

module.exports = nextConfig 