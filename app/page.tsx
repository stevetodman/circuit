'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/react/shallow';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import Sidebar from '@/components/sidebar/Sidebar';
import WelcomeOverlay from '@/components/WelcomeOverlay';
import EmptyStateGallery from '@/components/canvas/EmptyStateGallery';
import Toolbar from '@/components/Toolbar';
import HelpOverlay from '@/components/HelpOverlay';
import ContextMenu from '@/components/ContextMenu';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import SimController from '@/components/SimController';
import Oscilloscope from '@/features/oscilloscope/Oscilloscope';
import SchematicView from '@/features/schematic/SchematicView';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';
import { EXAMPLE_CIRCUITS } from '@/features/examples/circuits';
import { CIRCUIT_URL_PARAM } from '@/features/sharing/circuitUrl';

// Dynamic import with ssr:false keeps Three.js entirely off the server bundle
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/30 text-sm font-mono">
      Loading 3D engine…
    </div>
  ),
});

const VISITED_KEY = 'circuit-has-visited';

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
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(VISITED_KEY)) return;
    const query = new URLSearchParams(window.location.search);
    if (query.has(CIRCUIT_URL_PARAM)) return;

    const state = useCircuitStore.getState();
    const hasSavedContent = Object.keys(state.components).length > 0 || Object.keys(state.wires).length > 0;
    if (hasSavedContent) {
      window.localStorage.setItem(VISITED_KEY, '1');
      return;
    }

    const firstExample = EXAMPLE_CIRCUITS[0];
    if (!firstExample) return;
    loadFromJSON(firstExample);
    window.localStorage.setItem(VISITED_KEY, '1');
    setShowWelcomeOverlay(true);
  }, [loadFromJSON]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <SimController />
      <Toast />
      <WelcomeOverlay autoLoaded={showWelcomeOverlay} />
      <HelpOverlay />
      <ContextMenu />
      <KeyboardShortcuts />
      <ErrorBoundary><Sidebar /></ErrorBoundary>
      <main className="relative flex-1 min-w-0 h-full">
        <Toolbar />
        <div className="absolute inset-0 top-[36px]">
          <Scene />
          <EmptyStateGallery />
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
