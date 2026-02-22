'use client';

import ComponentTile from './ComponentTile';
import type { ComponentType } from '@/types/circuit';

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function Rect({ fill }: { fill: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="7" width="14" height="6" rx="1.5" fill={fill} />
    </svg>
  );
}
function Circle({ fill }: { fill: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="6" fill={fill} />
    </svg>
  );
}
function LED() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <polygon points="4,4 4,16 14,10" fill="#f04060" />
      <line x1="14" y1="4" x2="14" y2="16" stroke="#f04060" strokeWidth="2" />
      <line x1="16" y1="5" x2="18" y2="3" stroke="#f04060" strokeWidth="1.2" />
      <line x1="16" y1="8" x2="18" y2="6" stroke="#f04060" strokeWidth="1.2" />
    </svg>
  );
}
function BJT() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="8" y="3" width="3" height="14" rx="1" fill="#555" />
      <line x1="2" y1="10" x2="8" y2="10" stroke="#aaa" strokeWidth="1.5" />
      <line x1="11" y1="7" x2="16" y2="4" stroke="#aaa" strokeWidth="1.5" />
      <line x1="11" y1="13" x2="16" y2="16" stroke="#aaa" strokeWidth="1.5" />
      <polygon points="9,8 12,10 9,12" fill="#888" />
    </svg>
  );
}
function Arduino() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="16" height="10" rx="2" fill="#00979c" />
      <text x="4.5" y="13.5" fontSize="5.5" fill="white" fontFamily="monospace">UNO</text>
    </svg>
  );
}
function WireIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M2 15 C6 15 6 5 10 5 C14 5 14 15 18 15"
        stroke="#cc3333"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Motor() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7" stroke="#777" strokeWidth="2" fill="none" />
      <text x="7" y="13" fontSize="7" fill="#aaa" fontFamily="monospace">M</text>
    </svg>
  );
}
function Timer555() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="4" width="12" height="12" rx="1" fill="#222" />
      <text x="5.5" y="13" fontSize="5.5" fill="#aaa" fontFamily="monospace">555</text>
    </svg>
  );
}
function Battery() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="13" height="6" rx="1" fill="#444" />
      <rect x="15" y="9" width="3" height="2" rx="0.5" fill="#666" />
      <line x1="5" y1="9.5" x2="5" y2="10.5" stroke="#aaa" strokeWidth="1.2" />
      <line x1="4.4" y1="10" x2="5.6" y2="10" stroke="#aaa" strokeWidth="1.2" />
      <line x1="8" y1="9.5" x2="9" y2="9.5" stroke="#888" strokeWidth="1.2" />
    </svg>
  );
}

// ── Component catalogue ───────────────────────────────────────────────────────
const PARTS: { type: ComponentType | 'wire'; label: string; icon: React.ReactNode }[] = [
  { type: 'arduino',       label: 'Arduino Uno',      icon: <Arduino /> },
  { type: 'wire',          label: 'Wire',              icon: <WireIcon /> },
  { type: 'resistor',     label: 'Resistor',           icon: <Rect fill="#c8a060" /> },
  { type: 'led',          label: 'LED',                icon: <LED /> },
  { type: 'motor',        label: 'Motor',              icon: <Motor /> },
  { type: 'timer555',     label: '555 Timer',          icon: <Timer555 /> },
  { type: 'capacitor',    label: 'Capacitor',          icon: <Circle fill="#4488cc" /> },
  { type: 'bjt',          label: 'NPN Transistor',     icon: <BJT /> },
  { type: 'battery',      label: 'Battery',            icon: <Battery /> },
  { type: 'tactileSwitch', label: 'Tactile Switch',    icon: <Circle fill="#666" /> },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  return (
    <aside
      className="flex flex-col h-full select-none"
      style={{
        width: 'var(--sidebar-w, 260px)',
        background: 'var(--sidebar-bg, #111113)',
        borderRight: '1px solid var(--sidebar-border, #252528)',
        flexShrink: 0,
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="#7c6fff" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="3" fill="#7c6fff" />
        </svg>
        <span className="text-[13px] font-semibold tracking-wide text-white/80">
          Circuit Sandbox
        </span>
      </div>

      {/* ── Sim status ── */}
      <div className="px-4 py-2 border-b border-white/[0.05]">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-white/30">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          Simulator idle — M1
        </span>
      </div>

      {/* ── Insert Part ── */}
      <div className="flex-1 overflow-y-auto py-2">
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Insert Part
        </p>
        <div className="space-y-0.5 px-2">
          {PARTS.map((p) => (
            <ComponentTile
              key={`${p.type}-${p.label}`}
              type={p.type as ComponentType}
              label={p.label}
              icon={p.icon}
              onAdd={() => console.log('[Circuit] Queue add:', p.type)}
            />
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-3 border-t border-white/[0.05]">
        <p className="text-[10px] text-white/20 leading-relaxed">
          Hover a pin → gold highlight<br />
          Click a pin → logs node ID<br />
          Orbit · Pan · Zoom with mouse
        </p>
      </div>
    </aside>
  );
}
