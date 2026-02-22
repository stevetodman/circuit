import type { Vec3, PlacedComponent, Wire } from '@/types/circuit';
import { BOARD_TOP_Y, COLS, PITCH, rowZTop } from '@/constants/breadboard';

const TOP_ROWS = ['a', 'b', 'c', 'd', 'e'] as const;

function colToX(col: number): number {
  return (col - (COLS - 1) / 2) * PITCH;
}

function topNodePos(col: number, row: number): Vec3 {
  return [colToX(col), BOARD_TOP_Y, rowZTop(row)];
}

function topNodeId(col: number, row: number): string {
  return `bb-${TOP_ROWS[row]}${col}`;
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

const ledNode1 = topNodeId(20, 0);
const ledNode2 = topNodeId(22, 0);
const ledNode3 = topNodeId(26, 0);
const ledNode4 = topNodeId(28, 0);

const divNode1 = topNodeId(30, 0);
const divNode2 = topNodeId(34, 0);
const divNode3 = topNodeId(38, 0);

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
];
