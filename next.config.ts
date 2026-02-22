import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for SharedArrayBuffer — simulation workers use zero-copy SAB for voltage reads
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',     value: 'same-origin' },
          // 'credentialless' replaces 'require-corp' — still enables SharedArrayBuffer,
          // but allows blob: URLs and same-origin resources that R3F uses internally.
          // Chrome 96+, Firefox 119+ support this.
          { key: 'Cross-Origin-Embedder-Policy',   value: 'credentialless' },
          { key: 'X-Content-Type-Options',          value: 'nosniff' },
          { key: 'X-Frame-Options',                 value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',              value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
