/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/trainflow-prometric.zip', destination: '/workspace/trainflow-prometric.zip' },
      { source: '/ibta-prometric.zip', destination: '/workspace/ibta-prometric.zip' },
    ];
  },
  async redirects() {
    return [{ source: '/classic', destination: '/trainees', permanent: true }];
  },
};
