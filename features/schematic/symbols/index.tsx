import type { ComponentType } from '@/types/circuit';
import type { ReactElement } from 'react';

export interface SchematicSymbolSize {
  width: number;
  height: number;
}

const GLOW = '#f1fcff';
const STROKE = '#d7dee9';

interface SymbolProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
  selected?: boolean;
}

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
  diode: { width: 130, height: 80 },
  mosfet: { width: 180, height: 110 },
  opamp: { width: 190, height: 110 },
  inductor: { width: 160, height: 70 },
  potentiometer: { width: 150, height: 90 },
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
  diode: {
    anode: [-64, 0],
    cathode: [64, 0],
  },
  mosfet: {
    gate: [-86, 0],
    drain: [86, -24],
    source: [86, 24],
  },
  opamp: {
    'in+': [-86, -22],
    'in-': [-86, 22],
    out: [86, 0],
    vcc: [-10, -56],
    gnd: [-10, 56],
  },
  inductor: {
    a: [-72, 0],
    b: [72, 0],
  },
  potentiometer: {
    a: [-72, 0],
    wiper: [0, -30],
    b: [72, 0],
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
    case 'diode':
      return 'D';
    case 'mosfet':
      return 'MOSFET';
    case 'opamp':
      return 'OpAmp';
    case 'inductor':
      return 'L';
    case 'potentiometer':
      return 'POT';
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

export function DiodeSymbol({
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
      <line x1="-64" y1="0" x2="-20" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <path d="M -20 -14 L -20 14 L 16 0 Z" fill="#3a4a6a" stroke="#a98b4e" strokeWidth="2.6" />
      <line x1="16" y1="0" x2="64" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="16" y1="-18" x2="16" y2="18" stroke={glow.stroke} strokeWidth="3" />
      <circle cx="-64" cy="0" r="4" fill={glow.stroke} />
      <circle cx="64" cy="0" r="4" fill={glow.stroke} />
      {selected && <rect x="-70" y="-24" width="140" height="48" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
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

export function MOSFETSymbol({
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
      <line x1="-84" y1="0" x2="-38" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="-38" y1="0" x2="-24" y2="0" stroke="#8a8a8a" strokeWidth="2.6" />
      <line x1="38" y1="-24" x2="84" y2="-24" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="38" y1="24" x2="84" y2="24" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="38" y1="-24" x2="38" y2="24" stroke="#7a7a7a" strokeWidth="2" />
      <line x1="22" y1="-12" x2="38" y2="0" stroke={glow.stroke} strokeWidth="2.1" />
      <line x1="22" y1="12" x2="38" y2="0" stroke={glow.stroke} strokeWidth="2.1" />
      <line x1="-24" y1="0" x2="-24" y2="-26" stroke="#999" strokeWidth="2" />
      <line x1="-24" y1="0" x2="-24" y2="26" stroke="#999" strokeWidth="2" />
      <polyline points="-24,-4 -14,-16 -4,-4" fill="none" stroke="#999" strokeWidth="2" />
      <polygon points="-4,-16 -8,-7 -12,-18" fill="#999" />
      <circle cx="-24" cy="0" r="4" fill={glow.stroke} />
      <circle cx="-84" cy="0" r="4" fill={glow.stroke} />
      <circle cx="84" cy="-24" r="4" fill={glow.stroke} />
      <circle cx="84" cy="24" r="4" fill={glow.stroke} />
      {selected && <rect x="-90" y="-40" width="180" height="80" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function OpAmpSymbol({
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
      <line x1="-94" y1="-50" x2="-94" y2="50" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="-94" y1="-22" x2="-86" y2="-22" stroke={glow.stroke} strokeWidth="2.2" />
      <line x1="-94" y1="22" x2="-86" y2="22" stroke={glow.stroke} strokeWidth="2.2" />
      <line x1="-94" y1="0" x2="-40" y2="-10" stroke={glow.stroke} strokeWidth="2" />
      <line x1="-94" y1="0" x2="-40" y2="10" stroke={glow.stroke} strokeWidth="2" />
      <polyline points="-60,-26 -28,-26 -28,26 -60,26" fill="none" stroke="#7a7a7a" strokeWidth="2.4" />
      <line x1="-60" y1="0" x2="-44" y2="0" stroke="#9d9d9d" strokeWidth="2.6" />
      <line x1="-56" y1="-20" x2="64" y2="0" stroke={glow.stroke} strokeWidth="2.2" />
      <line x1="-56" y1="20" x2="64" y2="0" stroke={glow.stroke} strokeWidth="2.2" />
      <line x1="64" y1="0" x2="86" y2="0" stroke={glow.stroke} strokeWidth="2.4" />
      <line x1="-20" y1="-56" x2="6" y2="-56" stroke={glow.stroke} strokeWidth="2" />
      <line x1="-20" y1="56" x2="6" y2="56" stroke={glow.stroke} strokeWidth="2" />
      <circle cx="64" cy="0" r="4" fill={glow.stroke} />
      <circle cx="-94" cy="-22" r="4" fill={glow.stroke} />
      <circle cx="-94" cy="22" r="4" fill={glow.stroke} />
      <circle cx="-94" cy="0" r="4" fill={glow.stroke} />
      <circle cx="-20" cy="-56" r="3.5" fill={glow.stroke} />
      <circle cx="-20" cy="56" r="3.5" fill={glow.stroke} />
      {selected && <rect x="-94" y="-64" width="180" height="128" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function InductorSymbol({
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
      <line x1="-72" y1="0" x2="-42" y2="0" stroke={glow.stroke} strokeWidth="2.2" />
      <path d="M -42,-10 C -32,10 -22,-10 -12,10 C -2,-10 8,10 18,-10 C 28,10 38,-10 48,10" stroke={glow.stroke} strokeWidth="3.4" fill="none" />
      <line x1="48" y1="0" x2="72" y2="0" stroke={glow.stroke} strokeWidth="2.2" />
      <circle cx="-72" cy="0" r="4" fill={glow.stroke} />
      <circle cx="72" cy="0" r="4" fill={glow.stroke} />
      {selected && <rect x="-78" y="-24" width="156" height="48" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
    </g>
  );
}

export function PotentiometerSymbol({
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
      <rect x="-46" y="-16" width="82" height="30" rx="6" fill="#3c3c45" stroke={glow.stroke} strokeWidth="2.2" />
      <line x1="-46" y1="0" x2="36" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <line x1="36" y1="0" x2="72" y2="0" stroke={glow.stroke} strokeWidth="2.5" />
      <line x1="0" y1="-16" x2="0" y2="-34" stroke="#aaa" strokeWidth="2" />
      <line x1="-2" y1="-34" x2="2" y2="-34" stroke="#aaa" strokeWidth="3" />
      <line x1="-2" y1="-34" x2="-2" y2="-24" stroke="#555" strokeWidth="2" />
      <line x1="2" y1="-34" x2="2" y2="-24" stroke="#555" strokeWidth="2" />
      <circle cx="-72" cy="0" r="4" fill={glow.stroke} />
      <circle cx="72" cy="0" r="4" fill={glow.stroke} />
      <circle cx="0" cy="-34" r="4" fill={glow.stroke} />
      <polygon points="-2,-26 2,-26 0,-16" fill={glow.stroke} />
      {selected && <rect x="-80" y="-46" width="160" height="66" rx="10" fill="none" stroke={GLOW} strokeWidth="2.2" />}
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

export function Timer555Symbol({ x, y, w = 170, h = 90, selected }: SymbolProps): ReactElement {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect
        width={w}
        height={h}
        rx={3}
        fill={selected ? '#1a1a2e' : '#111'}
        stroke={selected ? '#6cf' : '#555'}
        strokeWidth={1.5}
      />
      <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fill="#aaa" fontSize={11} fontFamily="monospace">
        555
      </text>
      <text x={4} y={16} fill="#666" fontSize={8} fontFamily="monospace">
        GND
      </text>
      <text x={4} y={h - 4} fill="#666" fontSize={8} fontFamily="monospace">
        OUT
      </text>
      <text x={w - 4} y={16} textAnchor="end" fill="#666" fontSize={8} fontFamily="monospace">
        VCC
      </text>
    </g>
  );
}

export function MotorSymbol({ x, y, w, h, selected }: SymbolProps): ReactElement {
  const cx = x + (w ?? 130) / 2;
  const cy = y + (h ?? 70) / 2;
  const r = Math.min(w ?? 130, h ?? 70) / 2 - 4;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={selected ? '#6cf' : '#555'} strokeWidth={1.5} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#aaa" fontSize={14} fontFamily="monospace">
        M
      </text>
      <line x1={cx - r} y1={cy} x2={x} y2={cy} stroke="#555" strokeWidth={1.5} />
      <line x1={cx + r} y1={cy} x2={x + (w ?? 130)} y2={cy} stroke="#555" strokeWidth={1.5} />
    </g>
  );
}

export function ArduinoSymbol({ x, y, w = 240, h = 90, selected }: SymbolProps): ReactElement {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill={selected ? '#003333' : '#001a1a'}
        stroke={selected ? '#6cf' : '#00979c'}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 4}
        textAnchor="middle"
        fill="#00979c"
        fontSize={10}
        fontFamily="monospace"
        fontWeight="bold"
      >
        ARDUINO
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 8}
        textAnchor="middle"
        fill="#006666"
        fontSize={8}
        fontFamily="monospace"
      >
        UNO
      </text>
    </g>
  );
}

export function TactileSwitchSymbol({ x, y, w = 140, h = 60, selected }: SymbolProps): ReactElement {
  const mid = y + h / 2;
  const stroke = selected ? '#6cf' : '#555';

  return (
    <g>
      <line x1={x} y1={mid} x2={x + w * 0.35} y2={mid} stroke={stroke} strokeWidth={1.5} />
      <line x1={x + w * 0.65} y1={mid} x2={x + w} y2={mid} stroke={stroke} strokeWidth={1.5} />
      <line x1={x + w * 0.35} y1={mid - 6} x2={x + w * 0.35} y2={mid + 6} stroke={stroke} strokeWidth={1.5} />
      <line x1={x + w * 0.35} y1={mid - 8} x2={x + w * 0.65} y2={mid - 8} stroke={stroke} strokeWidth={1.5} strokeDasharray="2,2" />
      <line x1={x + w * 0.65} y1={mid - 6} x2={x + w * 0.65} y2={mid + 6} stroke={stroke} strokeWidth={1.5} />
    </g>
  );
}
