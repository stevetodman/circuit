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
  id?: string;
  name: string;
  description: string;
  circuit?: {
    components: PlacedComponent[];
    nodes: Record<string, unknown>;
    wires: Wire[];
  };
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

const btnNode1 = topNodeId(CENTER_COL - 10, 2);
const btnNode2 = topNodeId(CENTER_COL - 8, 2);
const btnNode3 = topNodeId(CENTER_COL - 6, 2);
const btnNode4 = topNodeId(CENTER_COL - 2, 2);
const btnNode5 = topNodeId(CENTER_COL, 2);

const zGnd1 = topNodeId(CENTER_COL - 12, 3); // col 20 — battery−
const zHv   = topNodeId(CENTER_COL - 8,  3); // col 24 — battery+ / 12 V input
const zOut  = topNodeId(CENTER_COL - 4,  3); // col 28 — regulated output (~5.1 V)
const zGnd2 = topNodeId(CENTER_COL,      3); // col 32 — zener anode (wired back to GND)

const switchNodeA = topNodeId(CENTER_COL - 8, 1);
const switchNodeB = topNodeId(CENTER_COL - 6, 1);
const switchNodeC = topNodeId(CENTER_COL - 4, 1);
const switchNodeD = topNodeId(CENTER_COL - 2, 1);

const timer555NodeVcc = topNodeId(CENTER_COL + 2, 1);
const timer555NodeGnd = topNodeId(CENTER_COL + 4, 1);
const timer555NodeTrig = topNodeId(CENTER_COL + 6, 1);
const timer555NodeOut = topNodeId(CENTER_COL + 8, 1);
const timerMonoNodeVcc = topNodeId(CENTER_COL + 10, 1);
const timerMonoNodeGnd = topNodeId(CENTER_COL + 12, 1);
const timerMonoNodeTrig = topNodeId(CENTER_COL + 14, 1);
const timerMonoNodeThresh = topNodeId(CENTER_COL + 16, 1);
const timerMonoNodeOut = topNodeId(CENTER_COL + 18, 1);

// Pot Dimmer (row 4 = 'e')
const potDimBatPos = topNodeId(CENTER_COL - 10, 4); // col 22 — battery+
const potDimBatNeg = topNodeId(CENTER_COL - 8,  4); // col 24 — battery−
const potDimPotA   = topNodeId(CENTER_COL - 6,  4); // col 26 — pot terminal a
const potDimPotW   = topNodeId(CENTER_COL - 4,  4); // col 28 — wiper (output tap)
const potDimPotB   = topNodeId(CENTER_COL - 2,  4); // col 30 — pot terminal b
const potDimRes2   = topNodeId(CENTER_COL + 2,  4); // col 34 — resistor p2 / LED anode
const potDimLedK   = topNodeId(CENTER_COL + 4,  4); // col 36 — LED cathode

const bjtSwitchBatPos      = topNodeId(CENTER_COL - 12, 0);
const bjtSwitchBatNeg      = topNodeId(CENTER_COL - 10, 0);
const bjtSwitchBaseNode    = topNodeId(CENTER_COL - 8, 0);
const bjtSwitchCollector   = topNodeId(CENTER_COL - 4, 0);

const rcFilterBatPos  = topNodeId(CENTER_COL - 16, 1);
const rcFilterBatNeg  = topNodeId(CENTER_COL - 14, 1);
const rcFilterOut     = topNodeId(CENTER_COL - 12, 1);
const rcFilterGround  = railNode('bn', 1);

const hBridgeBatPos = topNodeId(CENTER_COL - 10, 2);
const hBridgeBatNeg = topNodeId(CENTER_COL - 8, 2);
const hBridgeS1In   = topNodeId(CENTER_COL - 6, 2);
const hBridgeS1Out  = topNodeId(CENTER_COL - 4, 2);
const hBridgeMotorA = topNodeId(CENTER_COL - 2, 2);
const hBridgeMotorB = topNodeId(CENTER_COL, 2);
const hBridgeS2In   = topNodeId(CENTER_COL + 2, 2);

const potDividerBatPos = topNodeId(CENTER_COL - 12, 4);
const potDividerBatNeg = topNodeId(CENTER_COL - 10, 4);
const potDividerPotA   = topNodeId(CENTER_COL - 8, 4);
const potDividerPotW   = topNodeId(CENTER_COL - 6, 4);
const potDividerPotB   = topNodeId(CENTER_COL - 4, 4);
const potDividerRes    = topNodeId(CENTER_COL + 2, 4);
const potDividerLedK   = topNodeId(CENTER_COL + 4, 4);

const starterPotDimBatPos = topNodeId(5, 2);
const starterPotDimBatNeg = topNodeId(6, 2);
const starterPotDimPotA = topNodeId(15, 0);
const starterPotDimPotW = topNodeId(15, 2);
const starterPotDimPotB = topNodeId(15, 4);
const starterPotDimLedA = topNodeId(25, 2);
const starterPotDimLedK = topNodeId(26, 2);

const starterSwitchLedBatPos = topNodeId(5, 2);
const starterSwitchLedBatNeg = topNodeId(6, 2);
const starterSwitchLedSwP1 = topNodeId(15, 2);
const starterSwitchLedSwP2 = topNodeId(16, 2);
const starterSwitchLedR1 = topNodeId(20, 2);
const starterSwitchLedR2 = topNodeId(21, 2);
const starterSwitchLedLedA = topNodeId(25, 2);
const starterSwitchLedLedK = topNodeId(26, 2);

const starterVoltageDividerBatPos = topNodeId(5, 2);
const starterVoltageDividerBatNeg = topNodeId(6, 2);
const starterVoltageDividerR1P1 = topNodeId(15, 2);
const starterVoltageDividerR1P2 = topNodeId(16, 2);
const starterVoltageDividerMid = topNodeId(18, 2);
const starterVoltageDividerR2P1 = topNodeId(20, 2);
const starterVoltageDividerR2P2 = topNodeId(21, 2);
const starterVoltageDividerLedA = topNodeId(18, 2);
const starterVoltageDividerLedK = topNodeId(6, 2);

const starterRcTimBatPos = topNodeId(5, 2);
const starterRcTimBatNeg = topNodeId(6, 2);
const starterRcTimR1P1 = topNodeId(15, 2);
const starterRcTimR1P2 = topNodeId(16, 2);
const starterRcTimCapA = topNodeId(20, 2);
const starterRcTimCapB = topNodeId(21, 2);

const starterBjtSwitchBatPos = topNodeId(5, 2);
const starterBjtSwitchBatNeg = topNodeId(6, 2);
const starterBjtSwitchBase = topNodeId(20, 1);
const starterBjtSwitchCollector = topNodeId(20, 0);
const starterBjtSwitchEmitter = topNodeId(20, 2);
const starterBjtSwitchBaseResP2 = topNodeId(20, 1);
const starterBjtSwitchLedA = topNodeId(25, 2);
const starterBjtSwitchLedK = topNodeId(26, 2);

const starterBlinkerBatPos = topNodeId(5, 2);
const starterBlinkerBatNeg = topNodeId(6, 2);
const starterBlinkerVcc = topNodeId(15, 2);
const starterBlinkerGnd = topNodeId(16, 2);
const starterBlinkerTrig = topNodeId(20, 2);
const starterBlinkerOut = topNodeId(25, 2);
const starterBlinkerR1P2 = topNodeId(20, 2);
const starterBlinkerCapA = topNodeId(25, 2);
const starterBlinkerLedA = topNodeId(25, 2);
const starterBlinkerLedK = topNodeId(26, 2);

const starterArduinoPin13 = topNodeId(26, 2);
const starterArduinoResA = topNodeId(26, 2);
const starterArduinoResB = topNodeId(27, 2);
const starterArduinoLedA = topNodeId(27, 2);
const starterArduinoLedK = topNodeId(28, 2);
const starterArduinoGnd = railNode('tn', 1);

export const EXAMPLE_CIRCUITS: ExampleCircuit[] = [
  {
    id: 'battery-only',
    name: 'Battery Only',
    description: 'Single 9V battery',
    components: [
      {
        id: 'example-battery-only-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 0) },
          { name: 'neg', nodeId: topNodeId(26, 0) },
        ],
        props: {},
      },
    ],
    wires: [],
    circuit: {
      components: [
        {
          id: 'example-battery-only-battery',
          type: 'battery',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
          rotationY: 0,
          pins: [
            { name: 'pos', nodeId: topNodeId(25, 0) },
            { name: 'neg', nodeId: topNodeId(26, 0) },
          ],
          props: {},
        },
      ],
      nodes: {},
      wires: [],
    },
  },
  {
    id: 'battery-resistor',
    name: 'Battery + Resistor Loop',
    description: '9V battery and 220Ω resistor connected in a closed loop',
    components: [
      {
        id: 'example-loop-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 0) },
          { name: 'neg', nodeId: topNodeId(27, 0) },
        ],
        props: {},
      },
      {
        id: 'example-loop-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 0) },
          { name: 'p2', nodeId: topNodeId(27, 0) },
        ],
        props: { resistance: 220 },
      },
    ],
    wires: [],
    circuit: {
      components: [
        {
          id: 'example-loop-battery',
          type: 'battery',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'pos', nodeId: topNodeId(25, 0) },
            { name: 'neg', nodeId: topNodeId(27, 0) },
          ],
          props: {},
        },
        {
          id: 'example-loop-resistor',
          type: 'resistor',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'p1', nodeId: topNodeId(25, 0) },
            { name: 'p2', nodeId: topNodeId(27, 0) },
          ],
          props: { resistance: 220 },
        },
      ],
      nodes: {},
      wires: [],
    },
  },
  {
    id: 'battery-led-resistor',
    name: 'Battery + 220Ω Resistor + LED',
    description: '9V battery, 220Ω resistor, red LED (proper polarity)',
    components: [
      {
        id: 'example-led-demo-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 0) },
          { name: 'neg', nodeId: topNodeId(27, 0) },
        ],
        props: {},
      },
      {
        id: 'example-led-demo-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 0) },
          { name: 'p2', nodeId: topNodeId(26, 0) },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-led-demo-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(26, 0) },
          { name: 'cathode', nodeId: topNodeId(27, 0) },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [],
    circuit: {
      components: [
        {
          id: 'example-led-demo-battery',
          type: 'battery',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'pos', nodeId: topNodeId(25, 0) },
            { name: 'neg', nodeId: topNodeId(27, 0) },
          ],
          props: {},
        },
        {
          id: 'example-led-demo-resistor',
          type: 'resistor',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
          rotationY: 0,
          pins: [
            { name: 'p1', nodeId: topNodeId(25, 0) },
            { name: 'p2', nodeId: topNodeId(26, 0) },
          ],
          props: { resistance: 220 },
        },
        {
          id: 'example-led-demo-led',
          type: 'led',
          anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'anode', nodeId: topNodeId(26, 0) },
            { name: 'cathode', nodeId: topNodeId(27, 0) },
          ],
          props: { color: 'red' },
        },
      ],
      nodes: {},
      wires: [],
    },
  },
  {
    id: 'ohms-law-demo',
    name: 'Battery + Current-Limiting Resistor',
    description: 'Same topology as the first LED circuit with a different resistor value',
    components: [
      {
        id: 'example-ohms-law-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 0) },
          { name: 'neg', nodeId: topNodeId(27, 0) },
        ],
        props: {},
      },
      {
        id: 'example-ohms-law-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 0) },
          { name: 'p2', nodeId: topNodeId(26, 0) },
        ],
        props: { resistance: 470 },
      },
      {
        id: 'example-ohms-law-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(26, 0) },
          { name: 'cathode', nodeId: topNodeId(27, 0) },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [],
    circuit: {
      components: [
        {
          id: 'example-ohms-law-battery',
          type: 'battery',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'pos', nodeId: topNodeId(25, 0) },
            { name: 'neg', nodeId: topNodeId(27, 0) },
          ],
          props: {},
        },
        {
          id: 'example-ohms-law-resistor',
          type: 'resistor',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
          rotationY: 0,
          pins: [
            { name: 'p1', nodeId: topNodeId(25, 0) },
            { name: 'p2', nodeId: topNodeId(26, 0) },
          ],
          props: { resistance: 470 },
        },
        {
          id: 'example-ohms-law-led',
          type: 'led',
          anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'anode', nodeId: topNodeId(26, 0) },
            { name: 'cathode', nodeId: topNodeId(27, 0) },
          ],
          props: { color: 'red' },
        },
      ],
      nodes: {},
      wires: [],
    },
  },
  {
    id: 'led-resistor',
    name: 'Battery + Current-Limiting Resistor',
    description: 'Same as the Ohm\'s law demo, using the current autoLoadId in module definitions',
    components: [
      {
        id: 'example-led-resistor-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 0) },
          { name: 'neg', nodeId: topNodeId(27, 0) },
        ],
        props: {},
      },
      {
        id: 'example-led-resistor-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 0) },
          { name: 'p2', nodeId: topNodeId(26, 0) },
        ],
        props: { resistance: 470 },
      },
      {
        id: 'example-led-resistor-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(26, 0) },
          { name: 'cathode', nodeId: topNodeId(27, 0) },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [],
    circuit: {
      components: [
        {
          id: 'example-led-resistor-battery',
          type: 'battery',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'pos', nodeId: topNodeId(25, 0) },
            { name: 'neg', nodeId: topNodeId(27, 0) },
          ],
          props: {},
        },
        {
          id: 'example-led-resistor-resistor',
          type: 'resistor',
          anchorPos: midpoint(topNodePos(25, 0), topNodePos(26, 0)),
          rotationY: 0,
          pins: [
            { name: 'p1', nodeId: topNodeId(25, 0) },
            { name: 'p2', nodeId: topNodeId(26, 0) },
          ],
          props: { resistance: 470 },
        },
        {
          id: 'example-led-resistor-led',
          type: 'led',
          anchorPos: midpoint(topNodePos(26, 0), topNodePos(27, 0)),
          rotationY: 0,
          pins: [
            { name: 'anode', nodeId: topNodeId(26, 0) },
            { name: 'cathode', nodeId: topNodeId(27, 0) },
          ],
          props: { color: 'red' },
        },
      ],
      nodes: {},
      wires: [],
    },
  },
  {
    id: 'pot-dimmer',
    name: 'Potentiometer Dimmer',
    description: 'Battery, potentiometer and LED with brightness control',
    components: [
      {
        id: 'example-starter-pot-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterPotDimBatPos },
          { name: 'neg', nodeId: starterPotDimBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-pot',
        type: 'potentiometer',
        anchorPos: midpoint(topNodePos(14, 2), topNodePos(16, 2)),
        rotationY: 0,
        pins: [
          { name: 'a', nodeId: starterPotDimPotA },
          { name: 'wiper', nodeId: starterPotDimPotW },
          { name: 'b', nodeId: starterPotDimPotB },
        ],
        props: { resistance: 10000, wiper: 0.5 },
      },
      {
        id: 'example-starter-pot-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(26, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterPotDimLedA },
          { name: 'cathode', nodeId: starterPotDimLedK },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [
      { id: 'example-starter-pot-w1', fromNodeId: starterPotDimBatPos, toNodeId: starterPotDimPotA, color: '#cc4444' },
      { id: 'example-starter-pot-w2', fromNodeId: starterPotDimPotW, toNodeId: starterPotDimLedA, color: '#22aa22' },
      { id: 'example-starter-pot-w3', fromNodeId: starterPotDimPotB, toNodeId: starterPotDimBatNeg, color: '#333333' },
      { id: 'example-starter-pot-w4', fromNodeId: starterPotDimLedK, toNodeId: starterPotDimBatNeg, color: '#333333' },
    ],
  },
  {
    id: 'switch-led',
    name: 'Battery + Switch + LED',
    description: 'Tactile switch controls current to an LED through a 220Ω resistor',
    components: [
      {
        id: 'example-starter-switch-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterSwitchLedBatPos },
          { name: 'neg', nodeId: starterSwitchLedBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-switch',
        type: 'tactileSwitch',
        anchorPos: midpoint(topNodePos(15, 2), topNodePos(16, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterSwitchLedSwP1 },
          { name: 'p2', nodeId: starterSwitchLedSwP2 },
        ],
        props: { closed: 0 },
      },
      {
        id: 'example-starter-switch-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(21, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterSwitchLedR1 },
          { name: 'p2', nodeId: starterSwitchLedR2 },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-starter-switch-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(26, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterSwitchLedLedA },
          { name: 'cathode', nodeId: starterSwitchLedLedK },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-starter-switch-w1', fromNodeId: starterSwitchLedBatPos, toNodeId: starterSwitchLedSwP1, color: '#cc4444' },
      { id: 'example-starter-switch-w2', fromNodeId: starterSwitchLedSwP2, toNodeId: starterSwitchLedR1, color: '#22aa22' },
      { id: 'example-starter-switch-w3', fromNodeId: starterSwitchLedR2, toNodeId: starterSwitchLedLedA, color: '#2288cc' },
      { id: 'example-starter-switch-w4', fromNodeId: starterSwitchLedLedK, toNodeId: starterSwitchLedBatNeg, color: '#333333' },
    ],
  },
  {
    id: 'voltage-divider-demo',
    name: 'Voltage Divider with Probe',
    description: 'Battery and two 10 kΩ resistors in series with LED at midpoint',
    components: [
      {
        id: 'example-starter-divider-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterVoltageDividerBatPos },
          { name: 'neg', nodeId: starterVoltageDividerBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-divider-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(15, 2), topNodePos(16, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterVoltageDividerR1P1 },
          { name: 'p2', nodeId: starterVoltageDividerR1P2 },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-starter-divider-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(21, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterVoltageDividerR2P1 },
          { name: 'p2', nodeId: starterVoltageDividerR2P2 },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-starter-divider-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(18, 2), topNodePos(19, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterVoltageDividerLedA },
          { name: 'cathode', nodeId: starterVoltageDividerLedK },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [
      { id: 'example-starter-divider-w1', fromNodeId: starterVoltageDividerR1P2, toNodeId: starterVoltageDividerMid, color: '#22aa22' },
      { id: 'example-starter-divider-w2', fromNodeId: starterVoltageDividerMid, toNodeId: starterVoltageDividerR2P1, color: '#22aa22' },
      { id: 'example-starter-divider-w3', fromNodeId: starterVoltageDividerR2P2, toNodeId: starterVoltageDividerBatNeg, color: '#333333' },
      { id: 'example-starter-divider-w4', fromNodeId: starterVoltageDividerLedA, toNodeId: starterVoltageDividerMid, color: '#aa0000' },
      { id: 'example-starter-divider-w5', fromNodeId: starterVoltageDividerLedK, toNodeId: starterVoltageDividerBatNeg, color: '#333333' },
    ],
  },
  {
    id: 'rc-timing',
    name: 'RC Timing',
    description: 'Battery with resistor and capacitor pair for timing/charging behavior',
    components: [
      {
        id: 'example-starter-rc-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterRcTimBatPos },
          { name: 'neg', nodeId: starterRcTimBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-rc-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(15, 2), topNodePos(16, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterRcTimR1P1 },
          { name: 'p2', nodeId: starterRcTimR1P2 },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-starter-rc-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(21, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterRcTimCapA },
          { name: 'neg', nodeId: starterRcTimCapB },
        ],
        props: { capacitance: 100 },
      },
    ],
    wires: [
      { id: 'example-starter-rc-w1', fromNodeId: starterRcTimR1P2, toNodeId: starterRcTimCapA, color: '#22aa22' },
      { id: 'example-starter-rc-w2', fromNodeId: starterRcTimCapB, toNodeId: starterRcTimBatNeg, color: '#333333' },
      { id: 'example-starter-rc-w3', fromNodeId: starterRcTimR1P1, toNodeId: starterRcTimBatPos, color: '#22aa22' },
    ],
  },
  {
    id: 'bjt-switch-demo',
    name: 'NPN BJT LED Switch',
    description: 'NPN transistor switch with base bias and LED output resistor',
    components: [
      {
        id: 'example-starter-bjt-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterBjtSwitchBatPos },
          { name: 'neg', nodeId: starterBjtSwitchBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-bjt-base-res',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(18, 2), topNodePos(20, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterBjtSwitchBatPos },
          { name: 'p2', nodeId: starterBjtSwitchBaseResP2 },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-starter-bjt-transistor',
        type: 'bjt',
        anchorPos: midpoint(topNodePos(20, 1), topNodePos(20, 1)),
        rotationY: 0,
        pins: [
          { name: 'base', nodeId: starterBjtSwitchBase },
          { name: 'collector', nodeId: starterBjtSwitchCollector },
          { name: 'emitter', nodeId: starterBjtSwitchBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-bjt-led-res',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(22, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterBjtSwitchBatPos },
          { name: 'p2', nodeId: starterBjtSwitchLedA },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-starter-bjt-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(26, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterBjtSwitchLedA },
          { name: 'cathode', nodeId: starterBjtSwitchLedK },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [
      { id: 'example-starter-bjt-w1', fromNodeId: starterBjtSwitchBaseResP2, toNodeId: starterBjtSwitchBase, color: '#22aa22' },
      { id: 'example-starter-bjt-w2', fromNodeId: starterBjtSwitchLedK, toNodeId: starterBjtSwitchCollector, color: '#222222' },
    ],
  },
  {
    id: 'blinker-555-demo',
    name: '555 Timer Blinker',
    description: '555 timer with RC timing network and LED output',
    components: [
      {
        id: 'example-starter-555-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(5, 2), topNodePos(6, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterBlinkerBatPos },
          { name: 'neg', nodeId: starterBlinkerBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-starter-555-timer',
        type: 'timer555',
        anchorPos: midpoint(topNodePos(15, 2), topNodePos(18, 2)),
        rotationY: 0,
        pins: [
          { name: 'vcc', nodeId: starterBlinkerVcc },
          { name: 'gnd', nodeId: starterBlinkerGnd },
          { name: 'out', nodeId: starterBlinkerOut },
          { name: 'trig', nodeId: starterBlinkerTrig },
          { name: 'thresh', nodeId: starterBlinkerTrig },
        ],
        props: {
          r1: 1000,
          r2: 10000,
          capacitance: 10,
        },
      },
      {
        id: 'example-starter-555-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(16, 2), topNodePos(17, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterBlinkerVcc },
          { name: 'p2', nodeId: starterBlinkerR1P2 },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'example-starter-555-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(21, 2), topNodePos(23, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterBlinkerR1P2 },
          { name: 'p2', nodeId: starterBlinkerOut },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-starter-555-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(24, 2), topNodePos(25, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: starterBlinkerCapA },
          { name: 'neg', nodeId: starterBlinkerGnd },
        ],
        props: { capacitance: 10 },
      },
      {
        id: 'example-starter-555-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(26, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterBlinkerLedA },
          { name: 'cathode', nodeId: starterBlinkerLedK },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [
      { id: 'example-starter-555-w1', fromNodeId: starterBlinkerBatPos, toNodeId: starterBlinkerVcc, color: '#cc4444' },
      { id: 'example-starter-555-w2', fromNodeId: starterBlinkerBatNeg, toNodeId: starterBlinkerGnd, color: '#333333' },
      { id: 'example-starter-555-w3', fromNodeId: starterBlinkerCapA, toNodeId: starterBlinkerOut, color: '#22aa22' },
      { id: 'example-starter-555-w4', fromNodeId: starterBlinkerOut, toNodeId: starterBlinkerLedA, color: '#aa0000' },
      { id: 'example-starter-555-w5', fromNodeId: starterBlinkerLedK, toNodeId: starterBlinkerBatNeg, color: '#333333' },
    ],
  },
  {
    id: 'arduino-blink',
    name: 'Arduino Blink',
    description: 'Arduino Uno pin 13 and LED with 220Ω resistor',
    components: [
      {
        id: 'example-starter-arduino',
        type: 'arduino',
        anchorPos: midpoint(topNodePos(10, 2), topNodePos(23, 2)),
        rotationY: 0,
        pins: [
          { name: 'd13', nodeId: starterArduinoPin13 },
          { name: 'd12', nodeId: topNodeId(18, 2) },
          { name: 'd11', nodeId: topNodeId(17, 2) },
          { name: 'd10', nodeId: topNodeId(16, 2) },
          { name: 'd9', nodeId: topNodeId(15, 2) },
          { name: 'd8', nodeId: topNodeId(14, 2) },
          { name: 'd7', nodeId: topNodeId(13, 2) },
          { name: 'd6', nodeId: topNodeId(12, 2) },
          { name: 'd5', nodeId: topNodeId(11, 2) },
          { name: 'd4', nodeId: topNodeId(10, 2) },
          { name: 'd3', nodeId: topNodeId(9, 2) },
          { name: 'd2', nodeId: topNodeId(8, 2) },
          { name: 'd1', nodeId: topNodeId(7, 2) },
          { name: 'd0', nodeId: topNodeId(6, 2) },
          { name: 'a0', nodeId: topNodeId(5, 2) },
          { name: 'a1', nodeId: topNodeId(4, 2) },
          { name: 'a2', nodeId: topNodeId(3, 2) },
          { name: 'a3', nodeId: topNodeId(2, 2) },
          { name: 'a4', nodeId: topNodeId(1, 2) },
          { name: 'a5', nodeId: topNodeId(0, 2) },
        ],
        props: {},
      },
      {
        id: 'example-starter-arduino-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(26, 2), topNodePos(27, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: starterArduinoResA },
          { name: 'p2', nodeId: starterArduinoResB },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-starter-arduino-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(27, 2), topNodePos(28, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: starterArduinoLedA },
          { name: 'cathode', nodeId: starterArduinoLedK },
        ],
        props: { color: 'red' },
      },
    ],
    wires: [
      { id: 'example-starter-arduino-w1', fromNodeId: starterArduinoPin13, toNodeId: starterArduinoResA, color: '#22aa22' },
      { id: 'example-starter-arduino-w2', fromNodeId: starterArduinoLedA, toNodeId: starterArduinoResB, color: '#22aa22' },
      { id: 'example-starter-arduino-w3', fromNodeId: starterArduinoLedK, toNodeId: starterArduinoGnd, color: '#333333' },
    ],
  },
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
    name: 'Button + LED',
    description: 'Tactile switch controlling an LED. Click the switch to toggle.',
    components: [
      {
        id: 'example-btn-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 10, 2), topNodePos(CENTER_COL - 8, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: btnNode1 },
          { name: 'neg', nodeId: btnNode2 },
        ],
        props: {},
      },
      {
        id: 'example-btn-switch',
        type: 'tactileSwitch',
        anchorPos: midpoint(topNodePos(CENTER_COL - 8, 2), topNodePos(CENTER_COL - 6, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: btnNode2 },
          { name: 'p2', nodeId: btnNode3 },
        ],
        props: { closed: 0 },
      },
      {
        id: 'example-btn-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 6, 2), topNodePos(CENTER_COL - 2, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: btnNode3 },
          { name: 'p2', nodeId: btnNode4 },
        ],
        props: { resistance: 470 },
      },
      {
        id: 'example-btn-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(CENTER_COL - 2, 2), topNodePos(CENTER_COL, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: btnNode4 },
          { name: 'cathode', nodeId: btnNode5 },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-btn-w1', fromNodeId: btnNode5, toNodeId: btnNode1, color: '#333333' },
    ],
  },
  {
    name: 'Zener Regulator',
    description: '12 V input regulated to 5.1 V by a Zener diode + series resistor.',
    components: [
      {
        id: 'example-zener-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 12, 3), topNodePos(CENTER_COL - 8, 3)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: zHv },
          { name: 'neg', nodeId: zGnd1 },
        ],
        props: { voltage: 12 },
      },
      {
        id: 'example-zener-series-r',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 8, 3), topNodePos(CENTER_COL - 4, 3)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: zHv },
          { name: 'p2', nodeId: zOut },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'example-zener-diode',
        type: 'zener',
        anchorPos: midpoint(topNodePos(CENTER_COL - 4, 3), topNodePos(CENTER_COL, 3)),
        rotationY: 0,
        pins: [
          { name: 'cathode', nodeId: zOut },
          { name: 'anode',   nodeId: zGnd2 },
        ],
        props: { breakdownVoltage: 5.1 },
      },
    ],
    wires: [
      { id: 'example-zener-gnd', fromNodeId: zGnd2, toNodeId: zGnd1, color: '#333344' },
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
          { name: 'thresh', nodeId: timer555NodeTrig },
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
  {
    name: '555 One-Shot Timer',
    description: '555 monostable mode. A momentary trigger pulse gives ~1.1s output pulse.',
    components: [
      {
        id: 'example-555-mono-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL + 10, 1), topNodePos(CENTER_COL + 12, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: timerMonoNodeVcc },
          { name: 'neg', nodeId: timerMonoNodeGnd },
        ],
        props: {},
      },
      {
        id: 'example-555-mono-pullup',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL + 10, 1), topNodePos(CENTER_COL + 12, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: timerMonoNodeVcc },
          { name: 'p2', nodeId: timerMonoNodeTrig },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-555-mono-trigger',
        type: 'tactileSwitch',
        anchorPos: midpoint(topNodePos(CENTER_COL + 12, 1), topNodePos(CENTER_COL + 14, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: timerMonoNodeTrig },
          { name: 'p2', nodeId: timerMonoNodeGnd },
        ],
        props: { closed: 0 },
      },
      {
        id: 'example-555-mono-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL + 10, 1), topNodePos(CENTER_COL + 16, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: timerMonoNodeVcc },
          { name: 'p2', nodeId: timerMonoNodeThresh },
        ],
        props: { resistance: 100000 },
      },
      {
        id: 'example-555-mono-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(CENTER_COL + 16, 1), topNodePos(CENTER_COL + 12, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: timerMonoNodeThresh },
          { name: 'neg', nodeId: timerMonoNodeGnd },
        ],
        props: { capacitance: 10 },
      },
      {
        id: 'example-555-mono-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(CENTER_COL + 18, 1), topNodePos(CENTER_COL + 12, 1)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: timerMonoNodeOut },
          { name: 'cathode', nodeId: timerMonoNodeGnd },
        ],
        props: {},
      },
      {
        id: 'example-555-mono-timer',
        type: 'timer555',
        anchorPos: midpoint(topNodePos(CENTER_COL + 10, 1), topNodePos(CENTER_COL + 18, 1)),
        rotationY: 0,
        pins: [
          { name: 'vcc', nodeId: timerMonoNodeVcc },
          { name: 'gnd', nodeId: timerMonoNodeGnd },
          { name: 'out', nodeId: timerMonoNodeOut },
          { name: 'trig', nodeId: timerMonoNodeTrig },
          { name: 'thresh', nodeId: timerMonoNodeThresh },
        ],
        props: {
          r1: 100000,
          capacitance: 10,
        },
      },
    ],
    wires: [],
  },
  {
    name: 'Pot Dimmer',
    description: 'Potentiometer as voltage divider — adjust wiper in Properties to change LED brightness.',
    components: [
      {
        id: 'example-pot-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 10, 4), topNodePos(CENTER_COL - 8, 4)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: potDimBatPos },
          { name: 'neg', nodeId: potDimBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-pot-pot',
        type: 'potentiometer',
        anchorPos: midpoint(topNodePos(CENTER_COL - 6, 4), topNodePos(CENTER_COL - 2, 4)),
        rotationY: 0,
        pins: [
          { name: 'a',     nodeId: potDimPotA },
          { name: 'wiper', nodeId: potDimPotW },
          { name: 'b',     nodeId: potDimPotB },
        ],
        props: { resistance: 10000, wiper: 0.5 },
      },
      {
        id: 'example-pot-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 4, 4), topNodePos(CENTER_COL + 2, 4)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: potDimPotW },
          { name: 'p2', nodeId: potDimRes2 },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-pot-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(CENTER_COL + 2, 4), topNodePos(CENTER_COL + 4, 4)),
        rotationY: 0,
        pins: [
          { name: 'anode',   nodeId: potDimRes2 },
          { name: 'cathode', nodeId: potDimLedK },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-pot-w1', fromNodeId: potDimBatPos, toNodeId: potDimPotA,   color: '#cc4444' },
      { id: 'example-pot-w2', fromNodeId: potDimPotB,   toNodeId: potDimBatNeg, color: '#333333' },
      { id: 'example-pot-w3', fromNodeId: potDimLedK,   toNodeId: potDimBatNeg, color: '#333333' },
    ],
  },
  {
    name: 'bjt-switch',
    description: 'NPN transistor as a digital switch — base resistor controls LED via collector',
    components: [
      {
        id: 'example-bjt-switch-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 12, 0), topNodePos(CENTER_COL - 10, 0)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: bjtSwitchBatPos },
          { name: 'neg', nodeId: bjtSwitchBatNeg },
        ],
        props: { voltage: 9 },
      },
      {
        id: 'example-bjt-switch-base-res',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 10, 0), topNodePos(CENTER_COL - 8, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: bjtSwitchBatPos },
          { name: 'p2', nodeId: bjtSwitchBaseNode },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-bjt-switch-collector-res',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 10, 0), topNodePos(CENTER_COL - 4, 0)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: bjtSwitchBatPos },
          { name: 'p2', nodeId: bjtSwitchCollector },
        ],
        props: { resistance: 470 },
      },
      {
        id: 'example-bjt-switch-bjt',
        type: 'bjt',
        anchorPos: midpoint(topNodePos(CENTER_COL - 6, 0), topNodePos(CENTER_COL - 4, 0)),
        rotationY: 0,
        pins: [
          { name: 'base', nodeId: bjtSwitchBaseNode },
          { name: 'collector', nodeId: bjtSwitchCollector },
          { name: 'emitter', nodeId: bjtSwitchBatNeg },
        ],
        props: {},
      },
      {
        id: 'example-bjt-switch-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(CENTER_COL - 4, 0), topNodePos(CENTER_COL - 10, 0)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: bjtSwitchCollector },
          { name: 'cathode', nodeId: bjtSwitchBatNeg },
        ],
        props: {},
      },
    ],
    wires: [],
  },
  {
    name: 'rc-filter',
    description: 'RC low-pass filter — capacitor smooths voltage changes',
    components: [
      {
        id: 'example-rc-filter-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 16, 1), topNodePos(CENTER_COL - 14, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: rcFilterBatPos },
          { name: 'neg', nodeId: rcFilterBatNeg },
        ],
        props: { voltage: 5 },
      },
      {
        id: 'example-rc-filter-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 14, 1), topNodePos(CENTER_COL - 12, 1)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: rcFilterBatPos },
          { name: 'p2', nodeId: rcFilterOut },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'example-rc-filter-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 12, 1), topNodePos(CENTER_COL - 14, 1)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: rcFilterOut },
          { name: 'neg', nodeId: rcFilterBatNeg },
        ],
        props: { capacitance: 100 },
      },
    ],
    wires: [
      { id: 'example-rc-filter-w1', fromNodeId: rcFilterBatNeg, toNodeId: rcFilterGround, color: '#333333' },
    ],
  },
  {
    name: 'h-bridge',
    description: 'H-bridge motor control — two switches control motor direction',
    components: [
      {
        id: 'example-hbridge-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 10, 2), topNodePos(CENTER_COL - 8, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: hBridgeBatPos },
          { name: 'neg', nodeId: hBridgeBatNeg },
        ],
        props: { voltage: 9 },
      },
      {
        id: 'example-hbridge-switch-1',
        type: 'tactileSwitch',
        anchorPos: midpoint(topNodePos(CENTER_COL - 6, 2), topNodePos(CENTER_COL - 4, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: hBridgeS1In },
          { name: 'p2', nodeId: hBridgeS1Out },
        ],
        props: { closed: 0 },
      },
      {
        id: 'example-hbridge-switch-2',
        type: 'tactileSwitch',
        anchorPos: midpoint(topNodePos(CENTER_COL + 2, 2), topNodePos(CENTER_COL - 8, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: hBridgeS2In },
          { name: 'p2', nodeId: hBridgeBatNeg },
        ],
        props: { closed: 0 },
      },
      {
        id: 'example-hbridge-motor',
        type: 'motor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 2, 2), topNodePos(CENTER_COL, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: hBridgeMotorA },
          { name: 'p2', nodeId: hBridgeMotorB },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-hbridge-w1', fromNodeId: hBridgeBatPos, toNodeId: hBridgeS1In, color: '#cc8800' },
      { id: 'example-hbridge-w2', fromNodeId: hBridgeS1Out, toNodeId: hBridgeMotorA, color: '#22aa22' },
      { id: 'example-hbridge-w3', fromNodeId: hBridgeMotorB, toNodeId: hBridgeS2In, color: '#2255cc' },
    ],
  },
  {
    name: 'pot-voltage-divider',
    description: 'Potentiometer as adjustable voltage divider — wiper picks off variable voltage',
    components: [
      {
        id: 'example-pot-divider-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(CENTER_COL - 12, 4), topNodePos(CENTER_COL - 10, 4)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: potDividerBatPos },
          { name: 'neg', nodeId: potDividerBatNeg },
        ],
        props: { voltage: 5 },
      },
      {
        id: 'example-pot-divider-pot',
        type: 'potentiometer',
        anchorPos: midpoint(topNodePos(CENTER_COL - 8, 4), topNodePos(CENTER_COL - 4, 4)),
        rotationY: 0,
        pins: [
          { name: 'a', nodeId: potDividerPotA },
          { name: 'wiper', nodeId: potDividerPotW },
          { name: 'b', nodeId: potDividerPotB },
        ],
        props: { resistance: 10000, wiper: 0.5 },
      },
      {
        id: 'example-pot-divider-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(CENTER_COL - 6, 4), topNodePos(CENTER_COL + 2, 4)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: potDividerPotW },
          { name: 'p2', nodeId: potDividerRes },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'example-pot-divider-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(CENTER_COL + 2, 4), topNodePos(CENTER_COL + 4, 4)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: potDividerRes },
          { name: 'cathode', nodeId: potDividerLedK },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'example-pot-divider-w1', fromNodeId: potDividerBatPos, toNodeId: potDividerPotA, color: '#cc4444' },
      { id: 'example-pot-divider-w2', fromNodeId: potDividerPotB, toNodeId: potDividerBatNeg, color: '#333333' },
      { id: 'example-pot-divider-w3', fromNodeId: potDividerLedK, toNodeId: potDividerBatNeg, color: '#333333' },
    ],
  },
  {
    id: 'mosfet-led',
    name: 'MOSFET Switch',
    description: 'N-channel MOSFET controlled by a voltage divider gates an LED',
    components: [
      {
        id: 'mosfet-led-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(22, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(20, 2) },
          { name: 'neg', nodeId: topNodeId(22, 2) },
        ],
        props: {},
      },
      {
        id: 'mosfet-led-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(27, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 2) },
          { name: 'p2', nodeId: topNodeId(27, 2) },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'mosfet-led-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(27, 2), topNodePos(27, 4)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(27, 2) },
          { name: 'p2', nodeId: topNodeId(27, 4) },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'mosfet-led-mosfet',
        type: 'mosfet',
        anchorPos: midpoint(topNodePos(33, 2), topNodePos(33, 2)),
        rotationY: 0,
        pins: [
          { name: 'gate', nodeId: topNodeId(27, 2) },
          { name: 'drain', nodeId: topNodeId(35, 2) },
          { name: 'source', nodeId: topNodeId(35, 4) },
        ],
        props: {},
      },
      {
        id: 'mosfet-led-r3',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(32, 2), topNodePos(35, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(32, 2) },
          { name: 'p2', nodeId: topNodeId(35, 2) },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'mosfet-led-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(30, 2), topNodePos(32, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(30, 2) },
          { name: 'cathode', nodeId: topNodeId(32, 2) },
        ],
        props: { color: '#ff3333' },
      },
    ],
    wires: [
      { id: 'mosfet-led-w1', fromNodeId: topNodeId(20, 2), toNodeId: topNodeId(30, 2), color: '#cc4444' },
      { id: 'mosfet-led-w2', fromNodeId: topNodeId(22, 2), toNodeId: topNodeId(35, 4), color: '#333333' },
      { id: 'mosfet-led-w3', fromNodeId: topNodeId(20, 2), toNodeId: topNodeId(25, 2), color: '#cc4444' },
      { id: 'mosfet-led-w4', fromNodeId: topNodeId(27, 4), toNodeId: topNodeId(35, 4), color: '#333333' },
    ],
  },
  {
    id: 'diode-demo',
    name: 'Diode Forward Bias',
    description: 'Diode allows current in one direction only — shows 0.7V forward voltage drop',
    components: [
      {
        id: 'diode-demo-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(27, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 2) },
          { name: 'neg', nodeId: topNodeId(27, 2) },
        ],
        props: {},
      },
      {
        id: 'diode-demo-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(28, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 2) },
          { name: 'p2', nodeId: topNodeId(28, 2) },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'diode-demo-diode',
        type: 'diode',
        anchorPos: midpoint(topNodePos(28, 2), topNodePos(30, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(28, 2) },
          { name: 'cathode', nodeId: topNodeId(30, 2) },
        ],
        props: {},
      },
    ],
    wires: [
      { id: 'diode-demo-w1', fromNodeId: topNodeId(30, 2), toNodeId: topNodeId(27, 2), color: '#333333' },
    ],
  },
  {
    id: 'capacitor-charge',
    name: 'RC Charge / Discharge',
    description: '470µF capacitor charges through 10kΩ — watch the voltage curve on the oscilloscope',
    components: [
      {
        id: 'capacitor-charge-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(27, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(25, 2) },
          { name: 'neg', nodeId: topNodeId(27, 2) },
        ],
        props: {},
      },
      {
        id: 'capacitor-charge-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(25, 2), topNodePos(28, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(25, 2) },
          { name: 'p2', nodeId: topNodeId(28, 2) },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'capacitor-charge-capacitor',
        type: 'capacitor',
        anchorPos: midpoint(topNodePos(28, 2), topNodePos(27, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(28, 2) },
          { name: 'neg', nodeId: topNodeId(27, 2) },
        ],
        props: { capacitance: 0.00047 },
      },
    ],
    wires: [],
  },
  {
    id: 'parallel-leds',
    name: 'Parallel LEDs',
    description: 'Two LEDs with individual resistors in parallel — both glow at same brightness',
    components: [
      {
        id: 'parallel-leds-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(22, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(20, 2) },
          { name: 'neg', nodeId: topNodeId(22, 2) },
        ],
        props: {},
      },
      {
        id: 'parallel-leds-red-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(20, 2) },
          { name: 'p2', nodeId: topNodeId(24, 2) },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'parallel-leds-red-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(24, 2), topNodePos(26, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(24, 2) },
          { name: 'cathode', nodeId: topNodeId(22, 2) },
        ],
        props: { color: '#ff3333' },
      },
      {
        id: 'parallel-leds-green-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(20, 2), topNodePos(40, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(20, 2) },
          { name: 'p2', nodeId: topNodeId(40, 2) },
        ],
        props: { resistance: 220 },
      },
      {
        id: 'parallel-leds-green-led',
        type: 'led',
        anchorPos: midpoint(topNodePos(40, 2), topNodePos(42, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(40, 2) },
          { name: 'cathode', nodeId: topNodeId(22, 2) },
        ],
        props: { color: '#22cc44' },
      },
    ],
    wires: [],
  },
  {
    id: 'voltage-divider-leds',
    name: 'Voltage Divider + 2 LEDs',
    description: 'Voltage divider feeds two LEDs at different brightness levels',
    components: [
      {
        id: 'voltage-divider-leds-battery',
        type: 'battery',
        anchorPos: midpoint(topNodePos(22, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'pos', nodeId: topNodeId(22, 2) },
          { name: 'neg', nodeId: topNodeId(24, 2) },
        ],
        props: {},
      },
      {
        id: 'voltage-divider-leds-r1',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(22, 2), topNodePos(28, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(22, 2) },
          { name: 'p2', nodeId: topNodeId(28, 2) },
        ],
        props: { resistance: 1000 },
      },
      {
        id: 'voltage-divider-leds-r2',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(28, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(28, 2) },
          { name: 'p2', nodeId: topNodeId(24, 2) },
        ],
        props: { resistance: 4700 },
      },
      {
        id: 'voltage-divider-leds-led1-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(22, 2), topNodePos(30, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(22, 2) },
          { name: 'p2', nodeId: topNodeId(30, 2) },
        ],
        props: { resistance: 100 },
      },
      {
        id: 'voltage-divider-leds-led1',
        type: 'led',
        anchorPos: midpoint(topNodePos(30, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(30, 2) },
          { name: 'cathode', nodeId: topNodeId(24, 2) },
        ],
        props: { color: '#ff3333' },
      },
      {
        id: 'voltage-divider-leds-led2-resistor',
        type: 'resistor',
        anchorPos: midpoint(topNodePos(28, 2), topNodePos(34, 2)),
        rotationY: 0,
        pins: [
          { name: 'p1', nodeId: topNodeId(28, 2) },
          { name: 'p2', nodeId: topNodeId(34, 2) },
        ],
        props: { resistance: 100 },
      },
      {
        id: 'voltage-divider-leds-led2',
        type: 'led',
        anchorPos: midpoint(topNodePos(34, 2), topNodePos(24, 2)),
        rotationY: 0,
        pins: [
          { name: 'anode', nodeId: topNodeId(34, 2) },
          { name: 'cathode', nodeId: topNodeId(24, 2) },
        ],
        props: { color: '#ff3333' },
      },
    ],
    wires: [],
  },
];
