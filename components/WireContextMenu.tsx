'use client';

import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';

const WIRE_COLORS = [
  '#e63946', // red
  '#f4a261', // orange
  '#2a9d8f', // teal
  '#457b9d', // blue
  '#9b5de5', // purple
  '#4ecdc4', // cyan
  '#f7f7f7', // white
  '#a8a8a8', // gray
];

export default function WireContextMenu() {
  const wireMenu = useUIStore((s) => s.wireMenu);
  const closeWireMenu = useUIStore((s) => s.closeWireMenu);
  const setWireColor = useCircuitStore((s) => s.setWireColor);
  const removeWire = useCircuitStore((s) => s.removeWire);

  if (!wireMenu) return null;

  const { wireId, x, y } = wireMenu;

  // Clamp to viewport
  const left = Math.min(x, window.innerWidth - 140);
  const top = Math.min(y, window.innerHeight - 100);

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={closeWireMenu}
      />
      <div
        className="fixed z-50 bg-[#111113]/95 border border-white/15 rounded-lg shadow-2xl p-2 min-w-[128px]"
        style={{ left, top }}
      >
        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-1">Wire color</p>
        <div className="grid grid-cols-4 gap-1 mb-2">
          {WIRE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setWireColor(wireId, color);
                closeWireMenu();
              }}
              className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
        <button
          onClick={() => {
            removeWire(wireId);
            closeWireMenu();
          }}
          className="w-full text-[10px] text-red-400/70 hover:text-red-400 text-left px-1 py-0.5 rounded hover:bg-red-500/10 transition-colors"
        >
          Delete wire
        </button>
      </div>
    </>
  );
}

