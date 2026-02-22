import { create } from 'zustand';
import { temporal } from 'zundo';
import { PIN_TEMPLATES, type CircuitNode, type PlacedComponent, type Wire, type ComponentType, type Vec3, type PinConnection } from '@/types/circuit';
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
export const CIRCUIT_SAVE_KEY = 'circuit-sandbox-save';

type SavedCircuitJSON = {
  version: 1;
  nodes: Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  wires: Record<string, Wire>;
};

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
  selectedComponentIds: string[];
  wiringMode: boolean;
  setWireBranchIndices: (indices: Record<string, number>) => void;

  addComponent(type: ComponentType, pos: Vec3, pins?: PinConnection[], rotationY?: number): void;
  removeComponent(id: string): void;
  addWire(fromId: string, toId: string, color?: string): void;
  removeWire(id: string): void;
  setProperty(componentId: string, key: string, value: number | string): void;
  selectNode(id: string | null): void;
  selectComponent(id: string | null): void;
  toggleSelectedComponent(id: string): void;
  rotateComponent(id: string): void;
  loadCircuit(components: Record<string, import('@/types/circuit').PlacedComponent>, wires: Record<string, import('@/types/circuit').Wire>): void;
  toggleWiringMode(): void;
  deleteSelected(): void;
  loadExample(circuit: ExampleCircuit): void;
  copySelected(): void;
  pasteClipboard(offsetCols?: number): void;
  selectAll(): void;
  saveToJSON(): string;
  loadFromJSON(data: string): void;
}

const WIRE_COLORS = ['#cc2222', '#1a1a1a', '#cccc00', '#2255cc', '#22aa22', '#eeeeee'];
let wireColorIdx = 0;

// ── Copy/paste clipboard (module-level, not persisted) ───────────────────────
type ClipboardComponent = Omit<PlacedComponent, 'id'>;
let componentClipboard: ClipboardComponent[] = [];

function rotateOffset(offset: Vec3, rotationY: number): Vec3 {
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos * offset[0] + sin * offset[2], offset[1], -sin * offset[0] + cos * offset[2]];
}

function nearestNodeId(nodes: Record<string, CircuitNode>, point: Vec3): string {
  let nearest = '';
  let bestDist = Infinity;
  for (const node of Object.values(nodes)) {
    const dx = node.worldPos[0] - point[0];
    const dz = node.worldPos[2] - point[2];
    const d = dx * dx + dz * dz;
    if (d < bestDist) { bestDist = d; nearest = node.id; }
  }
  return nearest;
}

function clonePinsForPaste(
  comp: ClipboardComponent,
  anchorOffset: Vec3,
  nodes: Record<string, CircuitNode>,
): PinConnection[] {
  return comp.pins.map((pin) => {
    const template = PIN_TEMPLATES[comp.type].find((t) => t.name === pin.name);
    const localOffset = template ? rotateOffset(template.offset, comp.rotationY) : [0, 0, 0] as Vec3;
    const target: Vec3 = [anchorOffset[0] + localOffset[0], anchorOffset[1] + localOffset[1], anchorOffset[2] + localOffset[2]];
    return { ...pin, nodeId: nearestNodeId(nodes, target) || pin.nodeId };
  });
}

const AUTO_SAVE_DEBOUNCE_MS = 500;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let clearUndoHistory: (() => void) | null = null;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function parseCircuitJSON(json: string): SavedCircuitJSON | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!isRecord(parsed)) return null;
    const { version, nodes, components, wires } = parsed as Partial<Record<keyof SavedCircuitJSON, unknown>>;
    if (version !== 1) return null;
    if (!isRecord(nodes) || !isRecord(components) || !isRecord(wires)) return null;
    return {
      version: 1,
      nodes: nodes as Record<string, CircuitNode>,
      components: components as Record<string, PlacedComponent>,
      wires: wires as Record<string, Wire>,
    };
  } catch { return null; }
}

// ── Store with temporal (undo/redo) middleware ────────────────────────────────
// Only topology (nodes/components/wires) is tracked — UI state is excluded.
export const useCircuitStore = create<CircuitState>()(
  temporal(
    (set, get) => ({
      nodes: seedBreadboardNodes(),
      components: {},
      wires: {},
      selectedNodeId: null,
      selectedComponentId: null,
      selectedComponentIds: [],
      wiringMode: false,

      addComponent(type, pos, pins = [], rotationY = 0) {
        const id = crypto.randomUUID();
        const normalizedRotationY = ((rotationY % 360) + 360) % 360;
        set((state) => {
          const components = {
            ...state.components,
            [id]: { id, type, anchorPos: pos, rotationY: normalizedRotationY, pins, props: {} },
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      removeComponent(id) {
        set((state) => {
          const { [id]: _removed, ...components } = state.components;
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      addWire(fromId, toId, color = WIRE_COLORS[wireColorIdx++ % WIRE_COLORS.length]) {
        const id = crypto.randomUUID();
        set((state) => {
          const wires = { ...state.wires, [id]: { id, fromNodeId: fromId, toNodeId: toId, color } };
          const nodes = runNetAnalysis(state.nodes, wires, state.components);
          return { wires, nodes };
        });
      },

      removeWire(id) {
        set((state) => {
          const { [id]: _removed, ...wires } = state.wires;
          const nodes = runNetAnalysis(state.nodes, wires, state.components);
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
        set({ selectedComponentId: id, selectedComponentIds: id ? [id] : [] });
      },

      toggleSelectedComponent(id) {
        set((state) => {
          const has = state.selectedComponentIds.includes(id);
          const selectedComponentIds = has
            ? state.selectedComponentIds.filter((x) => x !== id)
            : [...state.selectedComponentIds, id];
          return {
            selectedComponentIds,
            selectedComponentId: selectedComponentIds.includes(state.selectedComponentId ?? '')
              ? state.selectedComponentId
              : (selectedComponentIds[0] ?? null),
          };
        });
      },

      copySelected() {
        const state = get();
        const ids = state.selectedComponentIds.length
          ? state.selectedComponentIds
          : (state.selectedComponentId ? [state.selectedComponentId] : []);
        componentClipboard = ids
          .filter((id, i, arr) => arr.indexOf(id) === i)
          .map((id) => {
            const c = state.components[id];
            if (!c) return null;
            return { type: c.type, anchorPos: [...c.anchorPos] as Vec3, rotationY: c.rotationY, pins: c.pins.map((p) => ({ ...p })), props: { ...c.props } };
          })
          .filter((c): c is ClipboardComponent => c != null);
      },

      pasteClipboard(offsetCols = 5) {
        if (!componentClipboard.length) return;
        set((state) => {
          const offsetX = offsetCols * PITCH;
          const components = { ...state.components };
          const pasted: string[] = [];
          for (const tmpl of componentClipboard) {
            const id = crypto.randomUUID();
            const anchorPos: Vec3 = [tmpl.anchorPos[0] + offsetX, tmpl.anchorPos[1], tmpl.anchorPos[2]];
            components[id] = { id, type: tmpl.type, anchorPos, rotationY: tmpl.rotationY, pins: clonePinsForPaste(tmpl, anchorPos, state.nodes), props: { ...tmpl.props } };
            pasted.push(id);
          }
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes, selectedComponentId: pasted[0] ?? null, selectedComponentIds: pasted };
        });
      },

      selectAll() {
        set((state) => {
          const ids = Object.keys(state.components);
          return { selectedComponentIds: ids, selectedComponentId: ids[0] ?? null };
        });
      },

      saveToJSON() {
        const state = get();
        return JSON.stringify({
          version: 1,
          nodes: state.nodes,
          components: state.components,
          wires: state.wires,
        } satisfies SavedCircuitJSON);
      },

      loadFromJSON(data) {
        const payload = parseCircuitJSON(data);
        if (!payload) { console.warn('[circuitStore] Invalid JSON circuit data'); return; }
        const nodes = runNetAnalysis(payload.nodes, payload.wires, payload.components);
        set({ nodes, components: payload.components, wires: payload.wires, selectedComponentId: null, selectedNodeId: null });
        clearUndoHistory?.();
      },

      loadCircuit(components, wires) {
        set((state) => {
          const nodes = runNetAnalysis(state.nodes, wires, components);
          return { components, wires, nodes, selectedComponentId: null, selectedComponentIds: [], selectedNodeId: null };
        });
      },

      toggleWiringMode() {
        set((state) => ({ wiringMode: !state.wiringMode }));
      },

      loadExample(circuit) {
        const componentMap = Object.fromEntries(circuit.components.map((component) => [component.id, component]));
        const wireMap = Object.fromEntries(circuit.wires.map((wire) => [wire.id, wire]));
        set((state) => ({
          components: Object.fromEntries(circuit.components.map((component) => [component.id, component])),
          wires: Object.fromEntries(circuit.wires.map((wire) => [wire.id, wire])),
          nodes: runNetAnalysis(state.nodes, wireMap, componentMap),
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
          const nodes = runNetAnalysis(state.nodes, wires, components);
          return { components, wires, nodes, selectedComponentId: null, selectedComponentIds: [], selectedNodeId: null };
        });
      },

      setWireBranchIndices(indices) {
        set((state) => {
          const wires = { ...state.wires };
          for (const [id, wire] of Object.entries(wires)) {
            const branchIndex = indices[id];
            wires[id] = branchIndex == null ? { ...wire, branchIndex: undefined } : { ...wire, branchIndex };
          }
          return { wires };
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

if (typeof window !== 'undefined') {
  clearUndoHistory = () => useCircuitStore.temporal.getState().clear();

  useCircuitStore.subscribe((state, prev) => {
    if (state.nodes === prev.nodes && state.components === prev.components && state.wires === prev.wires) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      localStorage.setItem(CIRCUIT_SAVE_KEY, useCircuitStore.getState().saveToJSON());
    }, AUTO_SAVE_DEBOUNCE_MS);
  });
}

// Convenience accessor for undo/redo — use in keyboard shortcut handler
export const useCircuitHistory = () => useCircuitStore.temporal;
