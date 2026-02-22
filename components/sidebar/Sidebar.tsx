'use client';

import { useState } from 'react';
import ComponentTile from './ComponentTile';
import PropertiesInspector from './PropertiesInspector';
import ArduinoPanel from './ArduinoPanel';
import StatusBar from './StatusBar';
import ScopeButton from './ScopeButton';
import ExportPanel from './ExportPanel';
import ExampleLoader from '@/features/examples/ExampleLoader';
import type { ComponentType } from '@/types/circuit';
import { useDragStore } from '@/store/dragStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/store/toastStore';
import { useModuleStore } from '@/store/moduleStore';
import LearnPanel from './LearnPanel';
import { PART_DESCRIPTIONS } from '@/constants/partDescriptions';

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
function Diode() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="2" y1="10" x2="6.5" y2="10" stroke="#f0d080" strokeWidth="1.8" />
      <polygon points="6.5,6 6.5,14 12,10" fill="#888" />
      <line x1="12" y1="10" x2="18" y2="10" stroke="#f0d080" strokeWidth="1.8" />
      <line x1="12" y1="7" x2="12" y2="13" stroke="#f0d080" strokeWidth="1.8" />
    </svg>
  );
}
function ZenerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="2" y1="10" x2="6.5" y2="10" stroke="#80c0ff" strokeWidth="1.8" />
      <polygon points="6.5,6 6.5,14 12,10" fill="#5599cc" />
      <line x1="12" y1="10" x2="18" y2="10" stroke="#80c0ff" strokeWidth="1.8" />
      <line x1="10" y1="7" x2="12" y2="7" stroke="#80c0ff" strokeWidth="1.8" />
      <line x1="12" y1="7" x2="12" y2="13" stroke="#80c0ff" strokeWidth="1.8" />
      <line x1="12" y1="13" x2="14" y2="13" stroke="#80c0ff" strokeWidth="1.8" />
    </svg>
  );
}
function SchottkyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="2" y1="10" x2="6.5" y2="10" stroke="#ffa060" strokeWidth="1.8" />
      <polygon points="6.5,6 6.5,14 12,10" fill="#cc7733" />
      <line x1="12" y1="10" x2="18" y2="10" stroke="#ffa060" strokeWidth="1.8" />
      <path d="M10.5,7 C10.5,7 12,7 12,9" stroke="#ffa060" strokeWidth="1.8" fill="none" />
      <path d="M12,11 C12,13 13.5,13 13.5,13" stroke="#ffa060" strokeWidth="1.8" fill="none" />
    </svg>
  );
}
function PNPIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="8" y="3" width="3" height="14" rx="1" fill="#446688" />
      <line x1="2" y1="10" x2="8" y2="10" stroke="#88aacc" strokeWidth="1.5" />
      <line x1="11" y1="7" x2="16" y2="4" stroke="#88aacc" strokeWidth="1.5" />
      <line x1="11" y1="13" x2="16" y2="16" stroke="#88aacc" strokeWidth="1.5" />
      <polygon points="13,7 10,8 11,5" fill="#88aacc" />
    </svg>
  );
}
function MOSFET() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="1" y1="10" x2="5" y2="10" stroke="#8a9fff" strokeWidth="1.4" />
      <rect x="5" y="4" width="8" height="12" fill="#1f1f1f" />
      <line x1="13" y1="7" x2="18" y2="6" stroke="#8a9fff" strokeWidth="1.4" />
      <line x1="13" y1="10" x2="18" y2="10" stroke="#8a9fff" strokeWidth="1.4" />
      <line x1="13" y1="13" x2="18" y2="14" stroke="#8a9fff" strokeWidth="1.4" />
    </svg>
  );
}
function OpAmp() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="1" y1="4" x2="7" y2="9" stroke="#9f9" strokeWidth="1.3" />
      <line x1="1" y1="16" x2="7" y2="11" stroke="#9f9" strokeWidth="1.3" />
      <polygon points="7,4 7,16 16,10" fill="#5f7fbf" />
      <line x1="16" y1="10" x2="19" y2="10" stroke="#9f9" strokeWidth="1.3" />
    </svg>
  );
}
function Inductor() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="2" y1="10" x2="4" y2="10" stroke="#ddd" strokeWidth="1.4" />
      <path d="M4 10 C6 6 6 14 8 10 C10 6 10 14 12 10 C14 6 14 14 16 10" stroke="#ddd" strokeWidth="1.6" fill="none" />
      <line x1="16" y1="10" x2="18" y2="10" stroke="#ddd" strokeWidth="1.4" />
    </svg>
  );
}
function Potentiometer() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="2" y1="10" x2="8" y2="10" stroke="#ccc" strokeWidth="1.4" />
      <rect x="8" y="4" width="5" height="12" fill="#666" />
      <line x1="13" y1="10" x2="18" y2="10" stroke="#ccc" strokeWidth="1.4" />
      <line x1="10" y1="6" x2="10" y2="2" stroke="#ccc" strokeWidth="1.4" />
      <line x1="10" y1="2" x2="11" y2="4" stroke="#ccc" strokeWidth="1.4" />
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

function SchematicIcon({ active }: { active: boolean }) {
  const stroke = active ? '#6cf' : '#8a8a8a';
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="1" y1="10" x2="15" y2="10" stroke={stroke} strokeWidth="1.25" />
      <line x1="1" y1="6" x2="15" y2="6" stroke={stroke} strokeWidth="1.25" />
      <polyline points="4,6 4,10 6,10 6,6" stroke={stroke} strokeWidth="1.25" fill="none" />
      <polyline points="10,6 10,10 12,10 12,6" stroke={stroke} strokeWidth="1.25" fill="none" />
      <circle cx="8" cy="8" r="1" fill={stroke} />
    </svg>
  );
}

// ── Component catalogue (beginner-first order) ────────────────────────────────
const PARTS: { type: ComponentType | 'wire'; label: string; icon: React.ReactNode; tooltip: string }[] = [
  { type: 'battery',       label: 'Battery',        tooltip: 'DC voltage source (1.5–30V). Powers your circuit.', icon: <Battery /> },
  { type: 'wire',          label: 'Wire',           tooltip: 'Connect two pins. Click any pin to start.', icon: <WireIcon /> },
  { type: 'resistor',      label: 'Resistor',       tooltip: 'Limits current flow. Set resistance in Ω.', icon: <Rect fill="#c8a060" /> },
  { type: 'led',           label: 'LED',            tooltip: 'Light-Emitting Diode. Glows when current flows.', icon: <LED /> },
  { type: 'capacitor',     label: 'Capacitor',      tooltip: 'Stores charge. Blocks DC, passes AC.', icon: <Circle fill="#4488cc" /> },
  { type: 'bjt',           label: 'NPN Transistor', tooltip: 'Bipolar transistor: amplifier or switch.', icon: <BJT /> },
  { type: 'timer555',      label: '555 Timer',      tooltip: 'Generates square waves. Set frequency via R1, R2, C.', icon: <Timer555 /> },
  { type: 'motor',         label: 'Motor',          tooltip: 'DC hobby motor. Spins when voltage is applied.', icon: <Motor /> },
  { type: 'tactileSwitch', label: 'Tactile Switch', tooltip: 'Momentary push-button switch. Click it in the 3D view to toggle open/closed.', icon: <Circle fill="#666" /> },
  { type: 'diode',         label: 'Diode',          tooltip: 'Allows current in one direction only (1N4148).', icon: <Diode /> },
  { type: 'zener',         label: 'Zener Diode',    tooltip: 'Conducts in reverse at breakdown voltage. Use for voltage regulation.', icon: <ZenerIcon /> },
  { type: 'schottky',      label: 'Schottky Diode', tooltip: 'Fast diode with low forward voltage (~0.3V). Good for rectifiers.', icon: <SchottkyIcon /> },
  { type: 'pnp',           label: 'PNP Transistor', tooltip: 'PNP bipolar transistor. Conducts when base is pulled low.', icon: <PNPIcon /> },
  { type: 'mosfet',        label: 'MOSFET',         tooltip: 'Voltage-controlled switch. Gate controls drain-source.', icon: <MOSFET /> },
  { type: 'opamp',         label: 'Op-Amp',         tooltip: 'Operational amplifier. Amplifies voltage difference.', icon: <OpAmp /> },
  { type: 'inductor',      label: 'Inductor',       tooltip: 'Stores energy in magnetic field. Opposes current change.', icon: <Inductor /> },
  { type: 'potentiometer', label: 'Potentiometer',  tooltip: 'Variable resistor. Wiper position sets output voltage.', icon: <Potentiometer /> },
  { type: 'arduino',       label: 'Arduino Uno',    tooltip: 'ATmega328P microcontroller. Upload sketches to run code.', icon: <Arduino /> },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const startDrag = useDragStore((state) => state.startDrag);
  const schematicOpen = useSchematicStore((state) => state.open);
  const toggleSchematic = useSchematicStore((state) => state.toggle);
  const toggleHelp = useUIStore((state) => state.toggleHelp);
  const addToast = useToastStore((state) => state.addToast);
  const spotlightTarget = useModuleStore((s) => s.activeStep?.spotlightTarget ?? null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'parts' | 'learn'>('parts');
  const [showNetlist, setShowNetlist] = useState(false);

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
        <span className="text-[13px] font-semibold tracking-wide text-white/90">
          Circuit Sandbox
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleHelp}
            title="Keyboard shortcuts (?)"
            className="h-7 w-7 rounded border border-white/[0.2] bg-white/[0.04] text-white/50 hover:text-white/80 hover:bg-white/[0.08] grid place-items-center text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
          >
            ?
          </button>
          <button
            type="button"
            onClick={toggleSchematic}
            title={schematicOpen ? 'Hide schematic view' : 'Show schematic view'}
            className="h-7 w-7 rounded border border-white/[0.2] bg-white/[0.04] text-white/90 hover:bg-white/[0.08] grid place-items-center focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none"
            aria-pressed={schematicOpen}
          >
            <span className="sr-only">Schematic view</span>
            <SchematicIcon active={schematicOpen} />
          </button>
        </div>
      </div>

      {/* ── Palette Tabs ── */}
      <div className="flex border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => setTab('parts')}
          className={`flex-1 text-[11px] py-2 font-semibold transition-colors ${
            tab === 'parts'
              ? 'bg-white/[0.05] text-white'
              : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03]'
          }`}
        >
          Parts
        </button>
        <button
          type="button"
          onClick={() => setTab('learn')}
          className={`flex-1 text-[11px] py-2 font-semibold transition-colors ${
            tab === 'learn'
              ? 'bg-white/[0.05] text-white'
              : 'text-white/35 hover:text-white/65 hover:bg-white/[0.03]'
          }`}
        >
          Learn
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ── Insert Part / Learn panel ── */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto py-2 ${spotlightTarget === 'sidebar-parts' ? 'ring-1 ring-[#7c6fff]/25' : ''}`}
        >
          {tab === 'parts' ? (
            <>
              <p className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Insert Part
              </p>
              <ScopeButton />
              <ExampleLoader />

              {/* Search filter */}
              <div className="px-2 pb-1">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setQuery(''); e.stopPropagation(); } }}
                    placeholder="Filter parts…"
                    className="w-full bg-white/[0.05] text-white/70 text-[11px] rounded px-2 py-1.5
                               border border-white/[0.08] placeholder-white/20 focus:outline-none
                               focus:border-[#7c6fff]/50 pr-6"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-[12px] leading-none"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-0.5 px-2">
                {PARTS.filter((p) => !query || p.label.toLowerCase().includes(query.toLowerCase())).map((p) => (
                  <ComponentTile
                    key={`${p.type}-${p.label}`}
                    type={p.type}
                    label={p.label}
                    icon={p.icon}
                    tooltip={p.tooltip}
                    description={PART_DESCRIPTIONS[p.type]}
                    onAdd={
                      p.type === 'wire'
                        ? () => addToast('Click any pin to start a wire, then click another pin to connect', 'info')
                        : () => startDrag(p.type as ComponentType)
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="overflow-y-auto">
              <LearnPanel />
            </div>
          )}
        </div>

        {/* ── Properties Inspector (shown when a component is selected) ── */}
        <PropertiesInspector />

        {/* ── Arduino panel (shown when Arduino is selected) ── */}
        <ArduinoPanel />

        {/* ── Export panel (SPICE) ── */}
        <ExportPanel
          showNetlist={showNetlist}
          onToggleNetlist={() => setShowNetlist((value) => !value)}
        />
      </div>

      {/* ── Status bar ── */}
      <div className="flex-shrink-0">
        <StatusBar />
      </div>
    </aside>
  );
}
