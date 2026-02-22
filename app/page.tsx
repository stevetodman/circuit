'use client';

import dynamic from 'next/dynamic';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import Sidebar from '@/components/sidebar/Sidebar';
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

export default function Home() {
  const { open: scopeOpen, channels, toggle: scopeToggle, addChannel, removeChannel } = useScopeStore((state) => ({
    open: state.open,
    channels: state.channels,
    toggle: state.toggle,
    addChannel: state.addChannel,
    removeChannel: state.removeChannel,
  }));
  const schematicOpen = useSchematicStore((state) => state.open);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <SimController />
      <Toast />
      <HelpOverlay />
      <ContextMenu />
      <KeyboardShortcuts />
      <ErrorBoundary><Sidebar /></ErrorBoundary>
      <main className="relative flex-1 min-w-0 h-full">
        <Scene />
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
      </main>
    </div>
  );
}
