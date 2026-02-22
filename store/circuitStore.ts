import { create } from 'zustand';
import type { CircuitNode, PlacedComponent, Wire, ComponentType, Vec3 } from '@/types/circuit';

export const PITCH = 0.254;        // 2.54mm in Three.js units (1 unit = 10mm)
export const CENTER_GAP = 0.508;   // gap between rows e and f
export const GRID_UNIT = PITCH;    // alias used in snap calculations
export const SNAP_THRESHOLD = GRID_UNIT * 0.68; // ~0.173 units — matches Diode
export const COLS = 63;
export const ROWS = 5;             // rows per side (a-e and f-j)
export const BOARD_TOP_Y = 0.15;   // top surface of board (board height = 0.3)
export const RAIL_GAP = PITCH * 2; // gap between main grid and power rail
export const RAIL_HOLES = 25;      // holes per power rail strip

/** Row z position for top half (row 0=a farthest, row 4=e closest to gap) */
export function rowZTop(rowIndex: number): number {
  return -(CENTER_GAP / 2 + (ROWS - 1 - rowIndex) * PITCH);
}

/** Row z position for bottom half (row 0=f closest to gap, row 4=j farthest) */
export function rowZBot(rowIndex: number): number {
  return CENTER_GAP / 2 + rowIndex * PITCH;
}

function seedBreadboardNodes(): Record<string, CircuitNode> {
  const nodes: Record<string, CircuitNode> = {};
  const topLetters = ['a', 'b', 'c', 'd', 'e'];
  const botLetters = ['f', 'g', 'h', 'i', 'j'];

  for (let col = 0; col < COLS; col++) {
    const x = (col - (COLS - 1) / 2) * PITCH;
    const colNum = col + 1;

    // Top half (a=0 farthest from center, e=4 closest)
    for (let row = 0; row < ROWS; row++) {
      const id = `bb-${topLetters[row]}${colNum}`;
      nodes[id] = { id, worldPos: [x, BOARD_TOP_Y, rowZTop(row)], netId: null };
    }

    // Bottom half (f=0 closest to center, j=4 farthest)
    for (let row = 0; row < ROWS; row++) {
      const id = `bb-${botLetters[row]}${colNum}`;
      nodes[id] = { id, worldPos: [x, BOARD_TOP_Y, rowZBot(row)], netId: null };
    }
  }

  // Power rails: 25 holes each, spaced 2×PITCH apart
  const topAZ = rowZTop(0);  // a row z (most negative)
  const botJZ = rowZBot(4);  // j row z (most positive)

  for (let i = 0; i < RAIL_HOLES; i++) {
    const x = (i * 2 - (RAIL_HOLES - 1)) * PITCH;

    const topPosId = `bb-tp-${i + 1}`;
    const topNegId = `bb-tn-${i + 1}`;
    const botPosId = `bb-bp-${i + 1}`;
    const botNegId = `bb-bn-${i + 1}`;

    nodes[topPosId] = { id: topPosId, worldPos: [x, BOARD_TOP_Y, topAZ - RAIL_GAP], netId: null };
    nodes[topNegId] = { id: topNegId, worldPos: [x, BOARD_TOP_Y, topAZ - RAIL_GAP - PITCH], netId: null };
    nodes[botPosId] = { id: botPosId, worldPos: [x, BOARD_TOP_Y, botJZ + RAIL_GAP], netId: null };
    nodes[botNegId] = { id: botNegId, worldPos: [x, BOARD_TOP_Y, botJZ + RAIL_GAP + PITCH], netId: null };
  }

  return nodes;
}

interface CircuitState {
  nodes: Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  wires: Record<string, Wire>;
  selectedNodeId: string | null;
  wiringMode: boolean;

  addComponent(type: ComponentType, pos: Vec3): void;
  removeComponent(id: string): void;
  addWire(fromId: string, toId: string, color?: string): void;
  removeWire(id: string): void;
  setProperty(componentId: string, key: string, value: number | string): void;
  selectNode(id: string | null): void;
  toggleWiringMode(): void;
}

export const useCircuitStore = create<CircuitState>()((set) => ({
  nodes: seedBreadboardNodes(),
  components: {},
  wires: {},
  selectedNodeId: null,
  wiringMode: false,

  addComponent(type, pos) {
    const id = crypto.randomUUID();
    set((state) => ({
      components: {
        ...state.components,
        [id]: { id, type, anchorPos: pos, rotationY: 0, pins: [], props: {} },
      },
    }));
  },

  removeComponent(id) {
    set((state) => {
      const { [id]: _removed, ...rest } = state.components;
      return { components: rest };
    });
  },

  addWire(fromId, toId, color = '#cc2222') {
    const id = crypto.randomUUID();
    set((state) => ({
      wires: { ...state.wires, [id]: { id, fromNodeId: fromId, toNodeId: toId, color } },
    }));
  },

  removeWire(id) {
    set((state) => {
      const { [id]: _removed, ...rest } = state.wires;
      return { wires: rest };
    });
  },

  setProperty(componentId, key, value) {
    set((state) => ({
      components: {
        ...state.components,
        [componentId]: {
          ...state.components[componentId],
          props: { ...state.components[componentId].props, [key]: value },
        },
      },
    }));
  },

  selectNode(id) {
    set({ selectedNodeId: id });
  },

  toggleWiringMode() {
    set((state) => ({ wiringMode: !state.wiringMode }));
  },
}));
