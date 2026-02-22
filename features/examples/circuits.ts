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
];
