/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/classic', destination: '/workspace/index.html' }];
  },
};
