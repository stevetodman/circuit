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
