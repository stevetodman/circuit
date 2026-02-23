import { PITCH } from '@/constants/breadboard';

export type Vec3 = [number, number, number];

export type ComponentType =
  | 'led'
  | 'resistor'
  | 'capacitor'
  | 'bjt'
  | 'pnp'
  | 'timer555'
  | 'arduino'
  | 'battery'
  | 'motor'
  | 'tactileSwitch'
  | 'diode'
  | 'zener'
  | 'schottky'
  | 'mosfet'
  | 'opamp'
  | 'inductor'
  | 'potentiometer';

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

export interface Timer555Props {
  r1: number;
  r2: number;
  capacitance: number;
}

export interface BJTProps {
  hFE: number;
}

export interface MotorProps {
  rpm: number;
}

export interface TactileSwitchProps {
  normallyOpen: number;
}

export interface ArduinoProps {
  clockMhz: number;
}

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

type TypedComponent<T extends ComponentType, P> = {
  type: T;
  properties?: P;
};

type BasePlacedComponent = {
  id: string;
  anchorPos: Vec3;
  rotationY: number;
  pins: PinConnection[];
  props: Record<string, number | string>;
  // For overload detection (M6: smoke effect)
  powerRating?: number;   // watts
  maxCurrent?: number;    // amps
  measuredPower?: number;
  measuredCurrent?: number;
};

export const PIN_TEMPLATES: Record<ComponentType, PinTemplate[]> = {
  led: [
    { name: 'anode', offset: [-PITCH, 0, 0] },
    { name: 'cathode', offset: [PITCH, 0, 0] },
  ],
  resistor: [
    { name: 'p1', offset: [-PITCH * 2, 0, 0] },
    { name: 'p2', offset: [PITCH * 2, 0, 0] },
  ],
  capacitor: [
    { name: 'pos', offset: [-PITCH, 0, 0] },
    { name: 'neg', offset: [PITCH, 0, 0] },
  ],
  bjt: [
    { name: 'base', offset: [0, 0, -PITCH] },
    { name: 'collector', offset: [-PITCH, 0, 0] },
    { name: 'emitter', offset: [PITCH, 0, 0] },
  ],
  timer555: [
    { name: 'vcc', offset: [-PITCH, 0, -PITCH] },
    { name: 'gnd', offset: [PITCH, 0, -PITCH] },
    { name: 'out', offset: [-PITCH, 0, PITCH] },
    { name: 'trig', offset: [PITCH, 0, PITCH] },
  ],
  arduino: arduinoPins.map((name, index) => ({
    name,
    offset: [0, 0, -(arduinoPins.length - 1) * PITCH / 2 + index * PITCH],
  })),
  battery: [
    { name: 'pos', offset: [-PITCH, 0, 0] },
    { name: 'neg', offset: [PITCH, 0, 0] },
  ],
  motor: [
    { name: 'p1', offset: [-PITCH, 0, 0] },
    { name: 'p2', offset: [PITCH, 0, 0] },
  ],
  tactileSwitch: [
    { name: 'p1', offset: [-PITCH, 0, 0] },
    { name: 'p2', offset: [PITCH, 0, 0] },
  ],
  diode: [
    { name: 'anode', offset: [-PITCH, 0, 0] },
    { name: 'cathode', offset: [PITCH, 0, 0] },
  ],
  zener: [
    { name: 'anode', offset: [-PITCH, 0, 0] },
    { name: 'cathode', offset: [PITCH, 0, 0] },
  ],
  schottky: [
    { name: 'anode', offset: [-PITCH, 0, 0] },
    { name: 'cathode', offset: [PITCH, 0, 0] },
  ],
  pnp: [
    { name: 'base', offset: [0, 0, -PITCH] },
    { name: 'collector', offset: [-PITCH, 0, 0] },
    { name: 'emitter', offset: [PITCH, 0, 0] },
  ],
  mosfet: [
    { name: 'gate', offset: [-PITCH * 1.5, 0, 0] },
    { name: 'drain', offset: [0, 0, 0] },
    { name: 'source', offset: [PITCH * 1.5, 0, 0] },
  ],
  opamp: [
    { name: 'in+', offset: [-PITCH * 1.5, 0, -PITCH / 2] },
    { name: 'in-', offset: [-PITCH * 1.5, 0, PITCH / 2] },
    { name: 'out', offset: [PITCH * 1.5, 0, 0] },
    { name: 'vcc', offset: [0, 0, -PITCH * 1.6] },
    { name: 'gnd', offset: [0, 0, PITCH * 1.6] },
  ],
  inductor: [
    { name: 'a', offset: [-PITCH, 0, 0] },
    { name: 'b', offset: [PITCH, 0, 0] },
  ],
  potentiometer: [
    { name: 'a', offset: [-PITCH, 0, 0] },
    { name: 'wiper', offset: [0, 0, 0] },
    { name: 'b', offset: [PITCH, 0, 0] },
  ],
};

export type PlacedComponent =
  | (BasePlacedComponent & TypedComponent<'led', { color?: string; forwardVoltage?: number }>)
  | (BasePlacedComponent & TypedComponent<'resistor', { resistance?: number }>)
  | (BasePlacedComponent & TypedComponent<'capacitor', { capacitance?: number }>)
  | (BasePlacedComponent & TypedComponent<'bjt', { hFE?: number }>)
  | (BasePlacedComponent & TypedComponent<'timer555', { r1?: number; r2?: number; capacitance?: number }>)
  | (BasePlacedComponent & TypedComponent<'arduino', { clockMhz?: number }>)
  | (BasePlacedComponent & TypedComponent<'battery', Record<string, never>>)
  | (BasePlacedComponent & TypedComponent<'motor', { rpm?: number; resistance?: number }>)
  | (BasePlacedComponent & TypedComponent<'tactileSwitch', { closed?: number }>)
  | (BasePlacedComponent & TypedComponent<'diode', { forwardVoltage?: number }>)
  | (BasePlacedComponent & TypedComponent<'zener', { breakdownVoltage?: number }>)
  | (BasePlacedComponent & TypedComponent<'schottky', { forwardVoltage?: number }>)
  | (BasePlacedComponent & TypedComponent<'pnp', { hFE?: number }>)
  | (BasePlacedComponent & TypedComponent<'mosfet', { rdsOn?: number }>)
  | (BasePlacedComponent & TypedComponent<'opamp', Record<string, never>>)
  | (BasePlacedComponent & TypedComponent<'inductor', { inductance?: number }>)
  | (BasePlacedComponent & TypedComponent<'potentiometer', { resistance?: number; wiper?: number }>);

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

// ── SharedArrayBuffer layout (M5) ────────────────────────────────────────────
// Byte offsets into the SAB — must stay in sync with SimBridge.ts:
//
//  [0              .. MAX_NETS*4-1          ]  Float32Array[MAX_NETS]     net voltages  (V)
//  [MAX_NETS*4     .. MAX_NETS*5-1          ]  Uint8Array[MAX_NETS]       digital HIGH/LOW
//  [MAX_NETS*5     .. MAX_NETS*5+MAX_BR*4-1 ]  Float32Array[MAX_BRANCHES] branch currents (A)
//  [MAX_NETS*5+MAX_BR*4 .. +7              ]  Float64[1]                 simulation timestamp (s)
//
// MAX_BRANCHES = max placed components (256). ngspice computes per-branch
// current so we can derive power = V_drop × I for smoke/overload detection.
export const MAX_NETS = 256;
export const MAX_BRANCHES = 256;

export const SAB_VOLTAGE_OFFSET  = 0;
export const SAB_DIGITAL_OFFSET  = MAX_NETS * 4;
export const SAB_CURRENT_OFFSET  = MAX_NETS * 4 + MAX_NETS;           // branch currents
export const SAB_TIMESTAMP_OFFSET = MAX_NETS * 4 + MAX_NETS + MAX_BRANCHES * 4; // timestamp

export const SAB_TOTAL_BYTES =
  MAX_NETS * 4 +        // voltages
  MAX_NETS +            // digital
  MAX_BRANCHES * 4 +    // currents
  8;                    // timestamp (Float64)
