'use client';

import dynamic from 'next/dynamic';
import Sidebar from '@/components/sidebar/Sidebar';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

// Dynamic import with ssr:false keeps Three.js entirely off the server bundle
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/30 text-sm font-mono">
      Loading 3D engine…
    </div>
  ),
});

export default function Home() {
  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <KeyboardShortcuts />
      <Sidebar />
      <main className="relative flex-1 min-w-0 h-full">
        <Scene />
      </main>
    </div>
  );
}
