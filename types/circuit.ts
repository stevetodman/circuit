export type Vec3 = [number, number, number];

export type ComponentType =
  | 'led'
  | 'resistor'
  | 'capacitor'
  | 'bjt'
  | 'timer555'
  | 'arduino'
  | 'battery'
  | 'motor'
  | 'tactileSwitch';

export interface CircuitNode {
  id: string;
  worldPos: Vec3;
  netId: number | null;
}

export interface PinConnection {
  name: string;
  nodeId: string;
}

export interface PinTemplate {
  name: string;
  offset: Vec3;
}

const PIN_PITCH = 0.254; // 2.54mm in Three.js units (1 unit = 10mm)
const arduinoPins = [
  'd13',
  'd12',
  'd11',
  'd10',
  'd9',
  'd8',
  'd7',
  'd6',
  'd5',
  'd4',
  'd3',
  'd2',
  'd1',
  'd0',
  'a0',
  'a1',
  'a2',
  'a3',
  'a4',
  'a5',
];

export const PIN_TEMPLATES: Record<ComponentType, PinTemplate[]> = {
  led: [
    { name: 'anode', offset: [-PIN_PITCH, 0, 0] },
    { name: 'cathode', offset: [PIN_PITCH, 0, 0] },
  ],
  resistor: [
    { name: 'p1', offset: [-PIN_PITCH * 2, 0, 0] },
    { name: 'p2', offset: [PIN_PITCH * 2, 0, 0] },
  ],
  capacitor: [
    { name: 'pos', offset: [-PIN_PITCH, 0, 0] },
    { name: 'neg', offset: [PIN_PITCH, 0, 0] },
  ],
  bjt: [
    { name: 'base', offset: [0, 0, -PIN_PITCH] },
    { name: 'collector', offset: [-PIN_PITCH, 0, 0] },
    { name: 'emitter', offset: [PIN_PITCH, 0, 0] },
  ],
  timer555: [
    { name: 'vcc', offset: [-PIN_PITCH, 0, -PIN_PITCH] },
    { name: 'gnd', offset: [PIN_PITCH, 0, -PIN_PITCH] },
    { name: 'out', offset: [-PIN_PITCH, 0, PIN_PITCH] },
    { name: 'trig', offset: [PIN_PITCH, 0, PIN_PITCH] },
  ],
  arduino: arduinoPins.map((name, index) => ({
    name,
    offset: [0, 0, -(arduinoPins.length - 1) * PIN_PITCH / 2 + index * PIN_PITCH],
  })),
  battery: [
    { name: 'pos', offset: [-PIN_PITCH, 0, 0] },
    { name: 'neg', offset: [PIN_PITCH, 0, 0] },
  ],
  motor: [
    { name: 'p1', offset: [-PIN_PITCH, 0, 0] },
    { name: 'p2', offset: [PIN_PITCH, 0, 0] },
  ],
  tactileSwitch: [
    { name: 'p1', offset: [-PIN_PITCH, 0, 0] },
    { name: 'p2', offset: [PIN_PITCH, 0, 0] },
  ],
};

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  anchorPos: Vec3;
  rotationY: number;
  pins: PinConnection[];
  props: Record<string, number | string>;
  // For overload detection (M6: smoke effect)
  powerRating?: number;   // watts
  maxCurrent?: number;    // amps
  measuredPower?: number;
  measuredCurrent?: number;
}

export interface Wire {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  color: string;
}

export interface Snap {
  ownNodeId: string;
  targetNodeId: string;
  offset: Vec3;
  distance: number;
}

// SharedArrayBuffer layout (M5)
// [0..255]   Float32Array — net voltages (V)
// [256..511] Uint8Array   — digital HIGH/LOW per net
// [2048]     Float64Array — simulation timestamp
export const MAX_NETS = 256;
export const SAB_VOLTAGE_OFFSET = 0;
export const SAB_DIGITAL_OFFSET = MAX_NETS * 4;
export const SAB_TIMESTAMP_OFFSET = MAX_NETS * 4 + MAX_NETS;
