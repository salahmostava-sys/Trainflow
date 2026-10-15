/** @type {import('next').NextConfig} */
const supabaseOrigin = (() => {
  const configured = process.env.SUPABASE_URL;
  return configured && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(configured)
    ? configured
    : 'https://xaeffreqwtozsgqajzpc.supabase.co';
})();
const development = process.env.NODE_ENV !== 'production';

// Inline scripts are needed by the Next.js bootstrap and the language bootstrap.
// 'unsafe-eval' is only allowed in development (React refresh). Supabase Auth and
// Realtime need https and wss to the project; the extension zip and workers are same-origin.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (development ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' " + supabaseOrigin + ' ' + supabaseOrigin.replace('https://', 'wss://') + (development ? ' ws:' : ''),
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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
