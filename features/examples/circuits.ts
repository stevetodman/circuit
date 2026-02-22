import type { Vec3, PlacedComponent, Wire } from '@/types/circuit';
import { BOARD_TOP_Y, COLS, PITCH, rowZTop } from '@/constants/breadboard';

const TOP_ROWS = ['a', 'b', 'c', 'd', 'e'] as const;
const CENTER_COL = 32;

function colToX(col: number): number {
  return (col - (COLS - 1) / 2) * PITCH;
}

function topNodePos(col: number, row: number): Vec3 {
  return [colToX(col), BOARD_TOP_Y, rowZTop(row)];
}

export function bbNode(row: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j', col: number): string {
  return `bb-${row}${col}`;
}

export function railNode(rail: 'tp' | 'tn' | 'bp' | 'bn', n: number): string {
  return `bb-${rail}-${n}`;
}

function topNodeId(col: number, row: number): string {
  return bbNode(TOP_ROWS[row], col);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2];
}

export interface ExampleCircuit {
  name: string;
  description: string;
  components: PlacedComponent[];
  wires: Wire[];
}

const ledNode1 = topNodeId(CENTER_COL - 12, 0);
const ledNode2 = topNodeId(CENTER_COL - 10, 0);
const ledNode3 = topNodeId(CENTER_COL - 6, 0);
const ledNode4 = topNodeId(CENTER_COL - 4, 0);

const divNode1 = topNodeId(CENTER_COL - 2, 0);
const divNode2 = topNodeId(CENTER_COL + 2, 0);
const divNode3 = topNodeId(CENTER_COL + 6, 0);
const rectNodePos = topNodeId(CENTER_COL + 10, 0);
const rectNodeNeg = topNodeId(CENTER_COL + 12, 0);
const rectNodeBridge = topNodeId(CENTER_COL + 14, 0);

const rcNodeA = topNodeId(CENTER_COL - 16, 1);
const rcNodeB = topNodeId(CENTER_COL - 14, 1);
const rcNodeC = topNodeId(CENTER_COL - 12, 1);
const rcNodeD = topNodeId(CENTER_COL - 10, 1);
const rcGround = railNode('bn', 1);

const switchNodeA = topNodeId(CENTER_COL - 8, 1);
const switchNodeB = topNodeId(CENTER_COL - 6, 1);
const switchNodeC = topNodeId(CENTER_COL - 4, 1);
const switchNodeD = topNodeId(CENTER_COL - 2, 1);

const timer555NodeVcc = topNodeId(CENTER_COL + 2, 1);
const timer555NodeGnd = topNodeId(CENTER_COL + 4, 1);
const timer555NodeTrig = topNodeId(CENTER_COL + 6, 1);
const timer555NodeOut = topNodeId(CENTER_COL + 8, 1);

export const EXAMPLE_CIRCUITS: ExampleCircuit[] = [
  {
    name: 'LED + Resistor',
    description: '9V battery, 470Ω resistor, red LED',
    components: [
      {
        id: 'example-led-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(20, 0), topNodePos(22, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: ledNode1 },
          { name: 'neg', nodeId: ledNode2 },
        ],
        props: {},
      },
      {
        id: 'example-led-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(22, 0), topNodePos(26, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: ledNode2 },
          { name: 'p2', nodeId: ledNode3 },
        ],
        props: { resistance: 470 },
      },
      {
        id: 'example-led-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(26, 0), topNodePos(28, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: ledNode3 },
          { name: 'cathode', nodeId: ledNode4 },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-led-w1', fromNodeId: ledNode1, toNodeId: ledNode2, color: '#888888' },
      { id: 'example-led-w2', fromNodeId: ledNode2, toNodeId: ledNode3, color: '#222222' },
      { id: 'example-led-w3', fromNodeId: ledNode3, toNodeId: ledNode4, color: '#aa0000' },
      { id: 'example-led-w4', fromNodeId: ledNode4, toNodeId: ledNode1, color: '#333333' },
    ],
  },
  {
    name: 'Half-wave Rectifier',
    description: 'Battery, diode, and resistor path',
    components: [
      {
        id: 'example-rect-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(10, 0), topNodePos(12, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: rectNodePos },
          { name: 'neg', nodeId: rectNodeNeg },
        ],
        props: {},
      },
      {
        id: 'example-rect-diode',
        type: 'diode',
        anchorPos: midpoint(topNodePos(12, 0), topNodePos(14, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: rectNodePos },
          { name: 'cathode', nodeId: rectNodeBridge },
        ],
        props: {},
      },
      {
        id: 'example-rect-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(14, 0), topNodePos(12, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: rectNodeBridge },
          { name: 'p2', nodeId: rectNodeNeg },
        ],
        props: { resistance: 4700 },
      },
    ],
    wires: [],
  },
  {
    name: 'Voltage Divider',
    description: 'Two resistors forming a voltage divider',
    components: [
      {
        id: 'example-divider-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(30, 0), topNodePos(38, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: divNode1 },
          { name: 'neg', nodeId: divNode3 },
        ],
        props: {},
      },
      {
        id: 'example-divider-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(30, 0), topNodePos(34, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: divNode1 },
          { name: 'p2', nodeId: divNode2 },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'example-divider-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(34, 0), topNodePos(38, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: divNode2 },
          { name: 'p2', nodeId: divNode3 },
        ],
        props: { resistance: 2200 },
      },
    ],
    wires: [
      { id: 'example-divider-w1', fromNodeId: divNode1, toNodeId: divNode2, color: '#22aa22' },
      { id: 'example-divider-w2', fromNodeId: divNode2, toNodeId: divNode3, color: '#2255cc' },
      { id: 'example-divider-w3', fromNodeId: divNode1, toNodeId: divNode3, color: '#aa2222' },
    ],
  },
  {
    name: 'RC Filter',
    description: 'RC low-pass filter. Capacitor charges/discharges through resistor.',
    components: [
      {
        id: 'example-rc-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(16, 1), topNodePos(18, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: rcNodeA },
          { name: 'neg', nodeId: rcNodeB },
        ],
        props: {},
      },
      {
        id: 'example-rc-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(18, 1), topNodePos(20, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: rcNodeB },
          { name: 'p2', nodeId: rcNodeC },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'example-rc-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(20, 1), topNodePos(22, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: rcNodeC },
          { name: 'neg', nodeId: rcNodeD },
        ],
        props: { capacitance: 10 },
      },
    ],
    wires: [
      { id: 'example-rc-w1', fromNodeId: rcNodeD, toNodeId: rcGround, color: '#333333' },
      { id: 'example-rc-w2', fromNodeId: rcGround, toNodeId: rcNodeA, color: '#333333' },
    ],
  },
  {
    name: 'NPN Switch',
    description: 'NPN transistor used as a switch to drive an LED.',
    components: [
      {
        id: 'example-switch-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(24, 1), topNodePos(26, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: switchNodeA },
          { name: 'neg', nodeId: switchNodeD },
        ],
        props: {},
      },
      {
        id: 'example-switch-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(26, 1), topNodePos(28, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: switchNodeA },
          { name: 'p2', nodeId: switchNodeB },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-switch-bjt',
        type: 'bjt',
        anchorPos: midpoint(topNodePos(28, 1), topNodePos(30, 1)),
        rotationY: 0,
        pins: [
          { name: 'base', nodeId: switchNodeB },
          { name: 'collector', nodeId: switchNodeC },
          { name: 'emitter', nodeId: switchNodeD },
        ],
        props: {},
      },
      {
        id: 'example-switch-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(24, 1), topNodePos(28, 1)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: switchNodeA },
          { name: 'cathode', nodeId: switchNodeC },
        ],
        props: {},
      },
    ],
    wires: [],
  },
  {
    name: '555 Blinker',
    description: '555 timer in astable mode. LED blinks at ~1Hz.',
    components: [
      {
        id: 'example-555-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(34, 1), topNodePos(36, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: timer555NodeVcc },
          { name: 'neg', nodeId: timer555NodeGnd },
        ],
        props: {},
      },
      {
        id: 'example-555-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(34, 1), topNodePos(38, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: timer555NodeVcc },
          { name: 'p2', nodeId: timer555NodeTrig },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'example-555-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(38, 1), topNodePos(40, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: timer555NodeTrig },
          { name: 'p2', nodeId: timer555NodeOut },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-555-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(40, 1), topNodePos(36, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: timer555NodeOut },
          { name: 'neg', nodeId: timer555NodeGnd },
        ],
        props: { capacitance: 10 },
      },
      {
        id: 'example-555-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(40, 1), topNodePos(36, 1)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: timer555NodeOut },
          { name: 'cathode', nodeId: timer555NodeGnd },
        ],
        props: {},
      },
      {
        id: 'example-555-timer',
        type: 'timer555',
        anchorPos: midpoint(topNodePos(34, 1), topNodePos(40, 1)),
        rotationY: 0,
        pins: [
          { name: 'vcc', nodeId: timer555NodeVcc },
          { name: 'gnd', nodeId: timer555NodeGnd },
          { name: 'out', nodeId: timer555NodeOut },
          { name: 'trig', nodeId: timer555NodeTrig },
        ],
        props: {
          r1: 1000,
          r2: 10000,
          capacitance: 10,
        },
      },
    ],
    wires: [],
  },
];
