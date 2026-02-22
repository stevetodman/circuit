import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for SharedArrayBuffer — simulation workers use zero-copy SAB for voltage reads
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // 'credentialless' replaces 'require-corp' — still enables SharedArrayBuffer,
          // but allows blob: URLs and same-origin resources that R3F uses internally.
          // Chrome 96+, Firefox 119+ support this.
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
};

export default nextConfig;
