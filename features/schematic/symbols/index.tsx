import type { ComponentType } from '@/types/circuit';
import type { ReactElement } from 'react';

export interface SchematicSymbolSize {
  width: number;
  height: number;
}

const GLOW = '#f1fcff';
const STROKE = '#d7dee9';

export const SYMBOL_SIZES: Record<ComponentType, SchematicSymbolSize> = {
  resistor: { width: 180, height: 80 },
  led: { width: 130, height: 80 },
  battery: { width: 170, height: 70 },
  capacitor: { width: 140, height: 70 },
  bjt: { width: 180, height: 110 },
  arduino: { width: 240, height: 90 },
  motor: { width: 130, height: 70 },
  timer555: { width: 170, height: 90 },
  tactileSwitch: { width: 140, height: 60 },
};

const SYMBOL_TERMINALS: Record<ComponentType, Record<string, [number, number]>> = {
  resistor: {
    p1: [-86, 0],
    p2: [86, 0],
  },
  led: {
    anode: [-64, 0],
    cathode: [64, 0],
  },
  battery: {
    pos: [-84, 0],
    neg: [84, 0],
  },
  capacitor: {
    pos: [-72, 0],
    neg: [72, 0],
  },
  bjt: {
    base: [0, -44],
    collector: [-76, 0],
    emitter: [76, 0],
  },
  arduino: {},
  motor: {
    p1: [-58, 0],
    p2: [58, 0],
  },
  timer555: {
    vcc: [-70, -22],
    gnd: [-70, 22],
    out: [70, -22],
    trig: [70, 22],
  },
  tactileSwitch: {
    p1: [-60, 0],
    p2: [60, 0],
  },
};

export function getSymbolSize(type: ComponentType): SchematicSymbolSize {
  return SYMBOL_SIZES[type] ?? { width: 120, height: 70 };
}

export function getSymbolTerminalOffset(type: ComponentType, pinName: string): [number, number] {
  const fromMap = SYMBOL_TERMINALS[type] ?? {};
  const fromPreset = fromMap[pinName];
  return fromPreset ?? [0, 0];
}

export function hasSymbolTerminalOffset(type: ComponentType, pinName: string) {
  return Object.prototype.hasOwnProperty.call((SYMBOL_TERMINALS[type] ?? {}), pinName);
}

export function symbolForTypeName(type: ComponentType): string {
  switch (type) {
    case 'arduino':
      return 'Arduino';
    case 'timer555':
      return '555';
    case 'motor':
      return 'Motor';
    case 'tactileSwitch':
      return 'Switch';
    case 'resistor':
      return 'R';
    case 'capacitor':
      return 'C';
    case 'battery':
      return 'BAT';
    case 'led':
      return 'LED';
    case 'bjt':
      return 'BJT';
    default:
      return 'Part';
  }
}

function terminalGlow(selected: boolean | undefined) {
  return {
    stroke: selected ? GLOW : STROKE,
    strokeWidth: selected ? 2.4 : 2,
    fill: selected ? 'rgba(241,252,255,0.18)' : 'rgba(215,222,233,0.12)',
  };
}

export function ResistorSymbol({
  x,
  y,
  selected,
}: {
  x: number;
  y: number;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);

  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <g transform="translate(-1, 0)">
        <line x1="-80" y1="0" x2="-45" y2="0" stroke={glow.stroke} strokeWidth={glow.strokeWidth} />
        <polyline
          points="-45,-12 -28,-24 28,24 45,12"
          fill="none"
          stroke="#9a7a38"
          strokeWidth="10"
          strokeLinejoin="bevel"
        />
        <line x1="45" y1="0" x2="80" y2="0" stroke={glow.stroke} strokeWidth={glow.strokeWidth} />
      </g>

      <circle cx="-86" cy="0" r="4" fill={glow.stroke} />
      <circle cx="86" cy="0" r="4" fill={glow.stroke} />
      <line x1="-10" y1="-30" x2="-10" y2="30" stroke="#6a6a6a" strokeWidth="2" opacity="0.7" />

      {selected && <rect x="-92" y="-32" width="184" height="64" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function LEDSymbol({
  x,
  y,
  selected,
}: {
  x: number;
  y: number;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <line x1="-68" y1="0" x2="-20" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <line x1="20" y1="0" x2="68" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <circle cx="0" cy="0" r="26" fill="#3b3b3b" stroke="#8a8a8a" strokeWidth="3" />
      <path
        d="M -13,-10 L 0,-28 L 13, -10 M -13,10 L 0,28 L 13,10"
        stroke="#f2a6a6"
        strokeWidth="3"
        fill="none"
      />
      <circle cx="-68" cy="0" r="4" fill={glow.stroke} />
      <circle cx="68" cy="0" r="4" fill={glow.stroke} />

      {selected && (
        <rect x="-34" y="-34" width="68" height="68" rx="8" fill="none" stroke={GLOW} strokeWidth="2.2" />
      )}
    </g>
  );
}

export function BatterySymbol({
  x,
  y,
  selected,
}: {
  x: number;
  y: number;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <line x1="-80" y1="0" x2="-25" y2="0" stroke={glow.stroke} strokeWidth="2.8" />
      <line x1="25" y1="0" x2="80" y2="0" stroke={glow.stroke} strokeWidth="2.8" />
      <rect x="-25" y="-26" width="50" height="52" rx="6" fill="#2f2f35" stroke="#626272" strokeWidth="3" />
      <line x1="-18" y1="-14" x2="-8" y2="-14" stroke="#f6c95f" strokeWidth="2.6" />
      <line x1="-13" y1="-20" x2="-13" y2="-8" stroke="#f6c95f" strokeWidth="2.6" />
      <line x1="18" y1="-9" x2="8" y2="-9" stroke="#999" strokeWidth="2.2" />
      <line x1="18" y1="-2" x2="8" y2="-2" stroke="#999" strokeWidth="2.2" />
      <circle cx="-80" cy="0" r="4" fill={glow.stroke} />
      <circle cx="80" cy="0" r="4" fill={glow.stroke} />

      {selected && <rect x="-32" y="-30" width="64" height="60" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function CapacitorSymbol({
  x,
  y,
  selected,
}: {
  x: number;
  y: number;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <line x1="-68" y1="0" x2="-12" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <line x1="12" y1="0" x2="68" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <line x1="-12" y1="-28" x2="-12" y2="28" stroke="#c8d5ff" strokeWidth="4" />
      <line x1="12" y1="-28" x2="12" y2="28" stroke="#c8d5ff" strokeWidth="4" />
      <line x1="-12" y1="-14" x2="12" y2="-14" stroke="#c8d5ff" strokeWidth="1.8" />
      <line x1="-12" y1="14" x2="12" y2="14" stroke="#c8d5ff" strokeWidth="1.8" />
      <circle cx="-68" cy="0" r="4" fill={glow.stroke} />
      <circle cx="68" cy="0" r="4" fill={glow.stroke} />
      {selected && <rect x="-72" y="-26" width="144" height="52" rx="9" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function BJTSymbol({
  x,
  y,
  selected,
}: {
  x: number;
  y: number;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);
  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <line x1="0" y1="-42" x2="0" y2="34" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="-80" y1="-4" x2="-14" y2="-4" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="14" y1="-4" x2="80" y2="-4" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="0" y1="-4" x2="0" y2="34" stroke="#5a5a5a" strokeWidth="2.5" />
      <line x1="-14" y1="16" x2="14" y2="-24" stroke="#bbb" strokeWidth="2.8" />
      <line x1="-6" y1="18" x2="24" y2="18" stroke="#bbb" strokeWidth="1.8" />
      <line x1="-80" y1="-4" x2="-72" y2="-4" stroke={glow.stroke} strokeWidth="4" />
      <line x1="80" y1="-4" x2="72" y2="-4" stroke={glow.stroke} strokeWidth="4" />
      <line x1="14" y1="-4" x2="0" y2="-4" stroke={glow.stroke} strokeWidth="1.2" />

      {selected && <rect x="-86" y="-50" width="172" height="88" rx="12" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function GenericSymbol({
  x,
  y,
  label,
  selected,
}: {
  x: number;
  y: number;
  label?: string;
  selected?: boolean;
}): ReactElement {
  const glow = terminalGlow(selected);
  const title = label ?? 'X';

  return (
    <g transform={`translate(${x}, ${y})`} fill="none" strokeLinecap="round">
      <rect
        x="-70"
        y="-28"
        width="140"
        height="56"
        rx="10"
        fill="rgba(40,48,70,0.35)"
        stroke={glow.stroke}
        strokeWidth={selected ? 2.5 : 2}
      />
      <line x1="-70" y1="0" x2="-22" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="22" y1="0" x2="70" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="-22" y1="-12" x2="22" y2="-12" stroke={glow.stroke} strokeWidth="2" />
      <line x1="-22" y1="12" x2="22" y2="12" stroke={glow.stroke} strokeWidth="2" />
      <text x="0" y="6" textAnchor="middle" fontSize="13" fill="#d8e2ff" fontFamily="Arial, sans-serif" fontWeight="700">
        {title}
      </text>
    </g>
  );
}
