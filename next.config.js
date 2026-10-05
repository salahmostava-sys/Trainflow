/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure ExcelJS worker and fallback HTML are routed cleanly
  async rewrites() {
    return [
      {
        source: '/classic',
        destination: '/trainflow.html',
      },
    ];
  },
};

module.exports = nextConfig;
