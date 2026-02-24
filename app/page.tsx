'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/react/shallow';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useModuleStore } from '@/store/moduleStore';
import { useDragStore } from '@/store/dragStore';
import { useUIStore } from '@/store/uiStore';
import Sidebar from '@/components/sidebar/Sidebar';
import CanvasContextMenu from '@/components/CanvasContextMenu';
import WelcomeOverlay from '@/components/WelcomeOverlay';
import EmptyStateGallery from '@/components/canvas/EmptyStateGallery';
import Toolbar from '@/components/Toolbar';
import HelpOverlay from '@/components/HelpOverlay';
import ContextMenu from '@/components/ContextMenu';
import { WireContextMenu } from '@/components/ContextMenu';
import SwapTypeMenu from '@/components/SwapTypeMenu';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import SimController from '@/components/SimController';
import Oscilloscope from '@/features/oscilloscope/Oscilloscope';
import SchematicView from '@/features/schematic/SchematicView';
import ErrorBoundary from '@/components/ErrorBoundary';
import Toast from '@/components/Toast';
import { MODULES } from '@/features/modules/definitions';
import { EXAMPLE_CIRCUITS } from '@/features/examples/circuits';
import { CIRCUIT_URL_PARAM } from '@/features/sharing/circuitUrl';
import WiringBanner from '@/components/WiringBanner';
import PinTooltip from '@/components/canvas/PinTooltip';
import ModuleIntroOverlay from '@/components/ModuleIntroOverlay';
import CanvasOverlay from '@/components/CanvasOverlay';
import StepCard from '@/components/StepCard';
import ModuleValidator from '@/components/ModuleValidator';
import { WireValidationTooltip } from '@/components/canvas/WirePreview';

const BodePlot = dynamic(() => import('@/features/bode/BodePlot'), { ssr: false });
const OnboardingTooltip = dynamic(() => import('@/components/OnboardingTooltip'), { ssr: false });

// Dynamic import with ssr:false keeps Three.js entirely off the server bundle
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/30 text-sm font-mono">
      Loading 3D engine…
    </div>
  ),
});
const InlineValueEditor = dynamic(() => import('@/components/InlineValueEditor'), { ssr: false });

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

function NoteEditOverlay() {
  const editingNoteId = useUIStore((s) => s.editingNoteId);
  const setEditingNoteId = useUIStore((s) => s.setEditingNoteId);
  const notes = useCircuitStore((s) => s.notes);
  const updateNote = useCircuitStore((s) => s.updateNote);

  if (!editingNoteId) return null;
  const note = notes[editingNoteId];
  if (!note) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-xl p-4 flex flex-col gap-3 w-72">
        <p className="text-xs text-gray-500 font-medium">Edit note</p>
        <textarea
          autoFocus
          defaultValue={note.text}
          className="border border-gray-200 rounded p-2 text-sm text-gray-800 resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditingNoteId(null);
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              updateNote(editingNoteId, (e.target as HTMLTextAreaElement).value);
              setEditingNoteId(null);
            }
          }}
          onBlur={(e) => {
            updateNote(editingNoteId, e.target.value);
            setEditingNoteId(null);
          }}
        />
        <p className="text-[10px] text-gray-400">Enter to save · Esc to cancel</p>
      </div>
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
  const showSidebar = useUIStore((s) => s.showSidebar);
  const loadFromJSON = useCircuitStore((state) => state.loadFromJSON);
  const circuitName = useCircuitStore((state) => state.circuitName);
  const activeModuleId = useModuleStore((state) => state.activeModuleId);
  const clickToPlaceType = useUIStore((s) => s.clickToPlaceType);

  useEffect(() => {
    if (!activeModuleId) return;
    const mod = MODULES.find((m) => m.id === activeModuleId);
    if (!mod?.autoLoadId) return;

    const circuit = EXAMPLE_CIRCUITS.find((c) => c.id === mod.autoLoadId);
    if (!circuit) return;

    useCircuitStore.getState().loadFromJSON(circuit);
  }, [activeModuleId]);

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

  useEffect(() => {
    document.title = circuitName.trim()
      ? `${circuitName.trim()} — Circuit Sandbox`
      : 'Circuit Sandbox';
  }, [circuitName]);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      <SimController />
      <Toast />
      <OnboardingTooltip />
      <CanvasContextMenu />
      <WelcomeOverlay autoLoaded={showWelcomeOverlay} />
      <HelpOverlay />
      <ContextMenu />
      <SwapTypeMenu />
      <WireContextMenu />
      <NoteEditOverlay />
      <KeyboardShortcuts />
      <InlineValueEditor />
      <ModuleIntroOverlay />
      <ModuleValidator />
      {!showSidebar && (
        <button
          type="button"
          onClick={() => useUIStore.getState().toggleSidebar()}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-[#1a1a1f]
                     border border-white/[0.1] rounded-r flex items-center justify-center
                     text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
          title="Show sidebar (B)"
        >
          ›
        </button>
      )}
      <ErrorBoundary><Sidebar /></ErrorBoundary>
      <main className="relative flex-1 min-w-0 h-full">
        <Toolbar />
        <div className="absolute inset-0 top-[36px]">
          <WiringBanner />
          <PinTooltip />
          <Scene />
          <CanvasOverlay />
          <EmptyStateGallery />
          {clickToPlaceType && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              style={{ animation: 'toastIn 0.2s ease-out both' }}>
              <div className="bg-[#18181c]/90 border border-[#7c6fff]/40 rounded-lg px-3 py-1.5 text-[12px] text-[#b8b0ff]">
                Click breadboard to place <span className="font-semibold capitalize">{clickToPlaceType}</span>
                <span className="text-white/40 ml-2">· R to rotate · Esc to cancel</span>
              </div>
            </div>
          )}
          <WiringHint />
          <WireValidationTooltip />
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
          <ErrorBoundary><BodePlot /></ErrorBoundary>
          <ErrorBoundary><SchematicView visible={schematicOpen} /></ErrorBoundary>
          <StepCard />
        </div>
      </main>
    </div>
  );
}
