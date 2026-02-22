'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/react/shallow';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import Sidebar from '@/components/sidebar/Sidebar';
import Toolbar from '@/components/Toolbar';
import HelpOverlay from '@/components/HelpOverlay';
import ContextMenu from '@/components/ContextMenu';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import SimController from '@/components/SimController';
import Oscilloscope from '@/features/oscilloscope/Oscilloscope';
import SchematicView from '@/features/schematic/SchematicView';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';

// Dynamic import with ssr:false keeps Three.js entirely off the server bundle
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/30 text-sm font-mono">
      Loading 3D engine…
    </div>
  ),
});

// ── Welcome card (shown once on first visit) ──────────────────────────────────
const WELCOME_KEY = 'circuit-welcomed-v1';

function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('noWelcome') || params.has('autoload') || params.has('c')) return;
    if (!localStorage.getItem(WELCOME_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(WELCOME_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
      <div className="bg-[#111113] border border-white/[0.12] rounded-xl p-8 max-w-sm w-full shadow-2xl mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#7c6fff]/20 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#7c6fff" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3" fill="#7c6fff" />
            </svg>
          </div>
          <h2 className="text-white font-semibold text-base">Welcome to Circuit Sandbox</h2>
        </div>
        <p className="text-white/50 text-sm leading-relaxed mb-5">
          Build and simulate analog circuits on a virtual breadboard.
        </p>
        <ol className="space-y-3 mb-6">
          {[
            ['1', 'Drag a part from the left panel onto the board'],
            ['2', 'Click a pin to start a wire, then click another pin to connect them'],
            ['3', 'Press ? anytime to see all keyboard shortcuts'],
          ].map(([n, text]) => (
            <li key={n} className="flex items-start gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-[#7c6fff]/20 text-[#7c6fff] text-[11px] font-bold flex-shrink-0 flex items-center justify-center mt-0.5">
                {n}
              </span>
              <span className="text-white/60 leading-snug">{text}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={dismiss}
          className="w-full py-2 rounded-lg bg-[#7c6fff] hover:bg-[#9d8fff] text-white text-sm font-semibold transition-colors"
        >
          Get started
        </button>
      </div>
    </div>
  );
}

// ── Wiring / placement hint pill ─────────────────────────────────────────────
function WiringHint() {
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const dragging       = useDragStore((s) => s.dragging);

  let message: string | null = null;
  if (selectedNodeId) {
    message = 'Click another pin to connect — Escape to cancel';
  } else if (dragging) {
    message = 'Click to place · R to rotate · Escape to cancel';
  }

  if (!message) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="bg-black/70 border border-white/[0.12] text-white/70 text-[11px] font-mono px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap">
        {message}
      </div>
    </div>
  );
}

// ── Camera hint (fades out after 5 s on first load) ───────────────────────────
function CameraHint() {
  const [fading, setFading] = useState(false);
  const [gone,   setGone]   = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 4000);
    const t2 = setTimeout(() => setGone(true),   5500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (gone) return null;

  return (
    <div
      className="fixed bottom-6 right-4 z-20 pointer-events-none transition-opacity duration-1000"
      style={{ opacity: fading ? 0 : 0.55 }}
    >
      <span className="text-white/50 text-[11px] font-mono">
        Scroll to zoom · Drag to orbit
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const { open: scopeOpen, channels, toggle: scopeToggle, addChannel, removeChannel } = useScopeStore(
    useShallow((state) => ({
      open: state.open,
      channels: state.channels,
      toggle: state.toggle,
      addChannel: state.addChannel,
      removeChannel: state.removeChannel,
    }))
  );
  const schematicOpen = useSchematicStore((state) => state.open);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <SimController />
      <Toast />
      <WelcomeOverlay />
      <HelpOverlay />
      <ContextMenu />
      <KeyboardShortcuts />
      <ErrorBoundary><Sidebar /></ErrorBoundary>
      <main className="relative flex-1 min-w-0 h-full">
        <Toolbar />
        <div className="absolute inset-0 top-[36px]">
          <Scene />
          <WiringHint />
          <CameraHint />
          <ErrorBoundary>
            <Oscilloscope
              open={scopeOpen}
              channels={channels}
              onClose={scopeToggle}
              onAddChannel={addChannel}
              onRemoveChannel={removeChannel}
            />
          </ErrorBoundary>
          <ErrorBoundary><SchematicView visible={schematicOpen} /></ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
