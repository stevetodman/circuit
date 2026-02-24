'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDragStore } from '@/store/dragStore';
import { useCircuitStore } from '@/store/circuitStore';
import type { ComponentType } from '@/types/circuit';
import type { Vec3 } from '@/types/circuit';

// All available component types with labels (copied from Sidebar PARTS list)
const ALL_PARTS: { type: ComponentType; label: string }[] = [
  { type: 'battery', label: 'Battery' },
  { type: 'resistor', label: 'Resistor' },
  { type: 'led', label: 'LED' },
  { type: 'capacitor', label: 'Capacitor' },
  { type: 'bjt', label: 'NPN Transistor' },
  { type: 'timer555', label: '555 Timer' },
  { type: 'motor', label: 'Motor' },
  { type: 'tactileSwitch', label: 'Tactile Switch' },
  { type: 'diode', label: 'Diode' },
  { type: 'zener', label: 'Zener Diode' },
  { type: 'schottky', label: 'Schottky Diode' },
  { type: 'pnp', label: 'PNP Transistor' },
  { type: 'mosfet', label: 'MOSFET' },
  { type: 'opamp', label: 'Op-Amp' },
  { type: 'inductor', label: 'Inductor' },
  { type: 'potentiometer', label: 'Potentiometer' },
  { type: 'arduino', label: 'Arduino Uno' },
];

export default function CanvasContextMenu() {
  const canvasMenu = useUIStore((s) => s.canvasMenu);
  const closeCanvasMenu = useUIStore((s) => s.closeCanvasMenu);
  const recentlyUsedTypes = useUIStore((s) => s.recentlyUsedTypes);
  const addRecentlyUsedType = useUIStore((s) => s.addRecentlyUsedType);
  const startDrag = useDragStore((s) => s.startDrag);
  const pasteClipboardAt = useCircuitStore((s) => s.pasteClipboardAt);
  const clipboardLength = useCircuitStore((s) => s.clipboardLength);
  const [query, setQuery] = useState('');

  if (!canvasMenu) return null;

  const handleSelect = (type: ComponentType) => {
    addRecentlyUsedType(type);
    closeCanvasMenu();
    startDrag(type);
  };

  // Build display list: recents first (as a section), then filtered search results
  const recentParts = recentlyUsedTypes
    .map((t) => ALL_PARTS.find((p) => p.type === t))
    .filter((p): p is (typeof ALL_PARTS)[number] => Boolean(p));

  const searchResults = query.trim()
    ? ALL_PARTS.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Viewport clamp so menu doesn't go off-screen
  const left = Math.min(canvasMenu.x, window.innerWidth - 200);
  const top = Math.min(canvasMenu.y, window.innerHeight - 320);

  return (
    <>
      {/* Dismiss backdrop */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={closeCanvasMenu}
        onContextMenu={(e) => { e.preventDefault(); closeCanvasMenu(); }}
      />
      <div
        className="fixed z-50 bg-[#111113]/95 border border-white/[0.12] rounded-xl shadow-2xl
                   backdrop-blur-sm w-48 py-1 overflow-hidden"
        style={{ left, top }}
      >
        {clipboardLength > 0 && canvasMenu?.worldPos && (
          <div className="px-2 pb-1">
            <button
              type="button"
              onPointerDown={() => {
                pasteClipboardAt([canvasMenu.worldPos?.x ?? 0, 0, canvasMenu.worldPos?.z ?? 0] as Vec3);
                closeCanvasMenu();
              }}
              className="w-full text-left text-[12px] text-white/80 hover:bg-white/[0.08] px-2 py-1.5 rounded"
            >
              Paste here
              <kbd className="ml-1.5 text-[9px] text-white/30">⌘V</kbd>
            </button>
          </div>
        )}
        <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 px-3 pt-1 pb-1">
          Add Component
        </p>

        {/* Search */}
        <div className="px-2 pb-1">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeCanvasMenu(); }}
            placeholder="Search…"
            className="w-full bg-white/[0.07] text-white/80 text-[11px] rounded px-2 py-1
                       border border-white/[0.1] placeholder-white/25 focus:outline-none
                       focus:border-[#7c6fff]/50"
          />
        </div>

        <div className="max-h-56 overflow-y-auto">
          {query.trim() ? (
            searchResults.length > 0 ? (
              searchResults.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onPointerDown={(e) => { e.stopPropagation(); handleSelect(p.type); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  {p.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[11px] text-white/30">No results</p>
            )
          ) : (
            <>
              {recentParts.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest text-white/20 px-3 pt-1 pb-0.5">Recent</p>
                  {recentParts.map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      onPointerDown={(e) => { e.stopPropagation(); handleSelect(p.type); }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06] mx-2 my-1" />
                </>
              )}
              {recentParts.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-white/30">Type to search for a part…
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
