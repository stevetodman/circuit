import { create } from 'zustand';
import { temporal } from 'zundo';
import type { CircuitNode, PlacedComponent, Wire, ComponentType, Vec3, PinConnection } from '@/types/circuit';
import { runNetAnalysis } from './netAnalysis';
import type { ExampleCircuit } from '@/features/examples/circuits';
import {
  PITCH, CENTER_GAP, COLS, ROWS, BOARD_TOP_Y, RAIL_GAP, RAIL_HOLES,
  rowZTop, rowZBot,
} from '@/constants/breadboard';

// Re-export constants needed by other modules (dragStore, Pin.tsx, etc.)
export { PITCH, CENTER_GAP, COLS, ROWS, BOARD_TOP_Y, RAIL_GAP, RAIL_HOLES, rowZTop, rowZBot };
export const GRID_UNIT = PITCH;
export const SNAP_THRESHOLD = GRID_UNIT * 0.68; // ~0.173 units — matches Diode

function seedBreadboardNodes(): Record<string, CircuitNode> {
  const nodes: Record<string, CircuitNode> = {};
  const topLetters = ['a', 'b', 'c', 'd', 'e'];
  const botLetters = ['f', 'g', 'h', 'i', 'j'];

  for (let col = 0; col < COLS; col++) {
    const x = (col - (COLS - 1) / 2) * PITCH;
    const colNum = col + 1;

    for (let row = 0; row < ROWS; row++) {
      const id = `bb-${topLetters[row]}${colNum}`;
      nodes[id] = { id, worldPos: [x, BOARD_TOP_Y, rowZTop(row)], netId: null };
    }
    for (let row = 0; row < ROWS; row++) {
      const id = `bb-${botLetters[row]}${colNum}`;
      nodes[id] = { id, worldPos: [x, BOARD_TOP_Y, rowZBot(row)], netId: null };
    }
  }

  const topAZ = rowZTop(0);
  const botJZ = rowZBot(4);

  for (let i = 0; i < RAIL_HOLES; i++) {
    const x = (i * 2 - (RAIL_HOLES - 1)) * PITCH;
    nodes[`bb-tp-${i + 1}`] = { id: `bb-tp-${i + 1}`, worldPos: [x, BOARD_TOP_Y, topAZ - RAIL_GAP], netId: null };
    nodes[`bb-tn-${i + 1}`] = { id: `bb-tn-${i + 1}`, worldPos: [x, BOARD_TOP_Y, topAZ - RAIL_GAP - PITCH], netId: null };
    nodes[`bb-bp-${i + 1}`] = { id: `bb-bp-${i + 1}`, worldPos: [x, BOARD_TOP_Y, botJZ + RAIL_GAP], netId: null };
    nodes[`bb-bn-${i + 1}`] = { id: `bb-bn-${i + 1}`, worldPos: [x, BOARD_TOP_Y, botJZ + RAIL_GAP + PITCH], netId: null };
  }

  return nodes;
}

// ── Topology state (tracked by undo/redo) ────────────────────────────────────
interface TopologyState {
  nodes: Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  wires: Record<string, Wire>;
}

// ── Full store interface ──────────────────────────────────────────────────────
interface CircuitState extends TopologyState {
  selectedNodeId: string | null;
  selectedComponentId: string | null;
  wiringMode: boolean;

  addComponent(type: ComponentType, pos: Vec3, pins?: PinConnection[]): void;
  removeComponent(id: string): void;
  addWire(fromId: string, toId: string, color?: string): void;
  removeWire(id: string): void;
  setProperty(componentId: string, key: string, value: number | string): void;
  rotateComponent: (componentId: string) => void;
  selectNode(id: string | null): void;
  selectComponent(id: string | null): void;
  rotateComponent(id: string): void;
  loadCircuit(components: Record<string, import('@/types/circuit').PlacedComponent>, wires: Record<string, import('@/types/circuit').Wire>): void;
  toggleWiringMode(): void;
  deleteSelected(): void;
  loadExample(circuit: ExampleCircuit): void;
}

const WIRE_COLORS = ['#cc2222', '#1a1a1a', '#cccc00', '#2255cc', '#22aa22', '#eeeeee'];
let wireColorIdx = 0;

// ── Store with temporal (undo/redo) middleware ────────────────────────────────
// Only topology (nodes/components/wires) is tracked — UI state is excluded.
export const useCircuitStore = create<CircuitState>()(
  temporal(
    (set) => ({
      nodes: seedBreadboardNodes(),
      components: {},
      wires: {},
      selectedNodeId: null,
      selectedComponentId: null,
      wiringMode: false,

      addComponent(type, pos, pins = []) {
        const id = crypto.randomUUID();
        set((state) => {
          const components = {
            ...state.components,
            [id]: { id, type, anchorPos: pos, rotationY: 0, pins, props: {} },
          };
          const nodes = runNetAnalysis(state.nodes, state.wires);
          return { components, nodes };
        });
      },

      removeComponent(id) {
        set((state) => {
          const { [id]: _removed, ...components } = state.components;
          const nodes = runNetAnalysis(state.nodes, state.wires);
          return { components, nodes };
        });
      },

      addWire(fromId, toId, color = WIRE_COLORS[wireColorIdx++ % WIRE_COLORS.length]) {
        const id = crypto.randomUUID();
        set((state) => {
          const wires = { ...state.wires, [id]: { id, fromNodeId: fromId, toNodeId: toId, color } };
          const nodes = runNetAnalysis(state.nodes, wires);
          return { wires, nodes };
        });
      },

      removeWire(id) {
        set((state) => {
          const { [id]: _removed, ...wires } = state.wires;
          const nodes = runNetAnalysis(state.nodes, wires);
          return { wires, nodes };
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

      rotateComponent(componentId) {
        set((state) => {
          const component = state.components[componentId];
          if (!component) return state;
          return {
            components: {
              ...state.components,
              [componentId]: {
                ...component,
                rotationY: (component.rotationY + 90) % 360,
              },
            },
          };
        });
      },

      selectNode(id) {
        set({ selectedNodeId: id });
      },

      selectComponent(id) {
        set({ selectedComponentId: id });
      },

      rotateComponent(id) {
        set((state) => ({
          components: {
            ...state.components,
            [id]: {
              ...state.components[id],
              rotationY: ((state.components[id]?.rotationY ?? 0) + 90) % 360,
            },
          },
        }));
      },

      loadCircuit(components, wires) {
        set((state) => {
          const nodes = runNetAnalysis(state.nodes, wires);
          return { components, wires, nodes, selectedComponentId: null, selectedNodeId: null };
        });
      },

      toggleWiringMode() {
        set((state) => ({ wiringMode: !state.wiringMode }));
      },

      loadExample(circuit) {
        set((state) => ({
          components: Object.fromEntries(circuit.components.map((component) => [component.id, component])),
          wires: Object.fromEntries(circuit.wires.map((wire) => [wire.id, wire])),
          nodes: runNetAnalysis(state.nodes, Object.fromEntries(circuit.wires.map((wire) => [wire.id, wire]))),
          selectedComponentId: null,
          selectedNodeId: null,
        }));
      },

      deleteSelected() {
        set((state) => {
          let wires = state.wires;
          let components = state.components;

          if (state.selectedComponentId) {
            const { [state.selectedComponentId]: _c, ...rest } = components;
            components = rest;
          }
          if (state.selectedNodeId) {
            // Delete any wire connected to this node
            wires = Object.fromEntries(
              Object.entries(wires).filter(
                ([, w]) => w.fromNodeId !== state.selectedNodeId && w.toNodeId !== state.selectedNodeId
              )
            );
          }
          const nodes = runNetAnalysis(state.nodes, wires);
          return { components, wires, nodes, selectedComponentId: null, selectedNodeId: null };
        });
      },
    }),
    {
      // Only snapshot topology for undo — not UI cursor state
      partialize: (state): TopologyState => ({
        nodes: state.nodes,
        components: state.components,
        wires: state.wires,
      }),
      limit: 100,
    }
  )
);

// Convenience accessor for undo/redo — use in keyboard shortcut handler
export const useCircuitHistory = () => useCircuitStore.temporal;
