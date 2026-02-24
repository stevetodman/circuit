import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  PIN_TEMPLATES,
  type CircuitNode,
  type PlacedComponent,
  type CircuitBlock,
  type CircuitNote,
  type Wire,
  type ComponentType,
  type Vec3,
  type PinConnection,
} from '@/types/circuit';
import { runNetAnalysis } from './netAnalysis';
import { useToastStore } from './toastStore';
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
  netLabels: Record<number, string>;
  notes?: Record<string, CircuitNote>;
  circuitBlocks?: CircuitBlock[];
  name?: string;
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
  netLabels: Record<number, string>;
  notes: Record<string, CircuitNote>;
}
type TopologyStateForHistory = Omit<TopologyState, 'notes'>;

// ── Full store interface ──────────────────────────────────────────────────────
interface CircuitState extends TopologyState {
  circuitBlocks: CircuitBlock[];
  selectedNodeId: string | null;
  selectedComponentId: string | null;
  selectedComponentIds: string[];
  setSelectedComponents: (ids: string[]) => void;
  circuitName: string;
  clipboardLength: number;
  setCircuitName: (name: string) => void;
  setSelectedComponentIds: (ids: string[]) => void;
  wiringMode: boolean;
  wireBranchIndices: Record<string, number>;
  setWireBranchIndices: (indices: Record<string, number>) => void;
  getDesignator: (componentId: string) => string;

  addComponent(type: ComponentType, pos: Vec3, pins?: PinConnection[], rotationY?: number, props?: Record<string, number | string>): void;
  removeComponent(id: string): void;
  toggleComponentLock(id: string): void;
  swapComponentType(id: string, newType: ComponentType): void;
  nudgeComponent(id: string, dx: number, dz: number): void;
  moveComponent(id: string, newAnchorPos: Vec3): void;
  moveComponents(moves: Array<{ id: string; newAnchorPos: Vec3 }>): void;
  addWire(fromId: string, toId: string, color?: string): void;
  removeWire(id: string): void;
  updateWireColor: (id: string, color: string) => void;
  setWireColor: (id: string, color: string) => void;
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
  pasteClipboardAt(worldPos: Vec3): void;
  selectAll(): void;
  saveToJSON(): string;
  loadFromJSON(data: string | ExampleCircuit): void;
  newCircuit(): void;
  saveAsBlock(name: string): void;
  deleteBlock(id: string): void;
  placeBlock(blockId: string, anchorPos: Vec3): void;
  setNetLabel: (netId: number, label: string) => void;
  removeNetLabel: (netId: number) => void;
  addNote: (attachedTo: string | null, position: Vec3) => string;
  updateNote: (id: string, text: string) => void;
  removeNote: (id: string) => void;
}

const WIRE_COLORS = ['#cc2222', '#1a1a1a', '#cccc00', '#2255cc', '#22aa22', '#eeeeee'];
const DESIGNATOR_PREFIX: Record<string, string> = {
  resistor: 'R',
  capacitor: 'C',
  led: 'D',
  battery: 'V',
  bjt: 'Q',
  timer555: 'U',
  arduino: 'A',
  motor: 'M',
  tactileSwitch: 'SW',
  diode: 'D',
  zener: 'D',
  schottky: 'D',
  pnp: 'Q',
  mosfet: 'Q',
  opamp: 'U',
  inductor: 'L',
  potentiometer: 'RV',
};
let wireColorIdx = 0;

// ── Copy/paste clipboard (module-level, not persisted) ───────────────────────
type ClipboardComponent = Omit<PlacedComponent, 'id'>;
let componentClipboard: ClipboardComponent[] = [];

const PRIMARY_PROP: Partial<Record<ComponentType, string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'breakdownVoltage',
};

function getSmartDefaultProps(
  type: ComponentType,
  components: Record<string, PlacedComponent>,
): Record<string, number | string> {
  const propKey = PRIMARY_PROP[type];
  if (!propKey) return {};

  const existing = Object.values(components).filter((c) => c.type === type).pop();
  if (!existing) return {};

  const val = existing.props[propKey as keyof PlacedComponent['props']];
  if (typeof val !== 'number' && typeof val !== 'string') return {};
  return { [propKey]: val };
}

function rotateOffset(offset: Vec3, rotationY: number): Vec3 {
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos * offset[0] + sin * offset[2], offset[1], -sin * offset[0] + cos * offset[2]];
}

function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as Vec3;
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

function snapToNode(x: number, z: number, nodes: Record<string, CircuitNode>): string | null {
  let bestNodeId: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const node of Object.values(nodes)) {
    const dx = node.worldPos[0] - x;
    const dz = node.worldPos[2] - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDist) {
      bestDist = d2;
      bestNodeId = node.id;
    }
  }

  if (!bestNodeId) return null;
  return bestDist <= SNAP_THRESHOLD * SNAP_THRESHOLD ? bestNodeId : null;
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
    const rawNetLabels = (parsed as Record<string, unknown>).netLabels;
    const rawNotes = (parsed as Record<string, unknown>).notes;
    const rawCircuitBlocks = (parsed as Record<string, unknown>).circuitBlocks;
    const netLabels = isRecord(rawNetLabels) ? rawNetLabels : {};
    const notes = isRecord(rawNotes) ? rawNotes : {};
    const circuitBlocks = Array.isArray(rawCircuitBlocks) ? rawCircuitBlocks : [];
    if (version !== 1) return null;
    if (!isRecord(nodes) || !isRecord(components) || !isRecord(wires)) return null;
    return {
      version: 1,
      nodes: nodes as Record<string, CircuitNode>,
      components: components as Record<string, PlacedComponent>,
      wires: wires as Record<string, Wire>,
      netLabels: netLabels as Record<number, string>,
      notes: notes as Record<string, CircuitNote>,
      circuitBlocks: circuitBlocks as CircuitBlock[],
    };
  } catch { return null; }
}

function exampleCircuitToPayload(example: ExampleCircuit): SavedCircuitJSON {
  const components = Object.fromEntries(example.components.map((component) => [component.id, component]));
  const wires = Object.fromEntries(example.wires.map((wire) => [wire.id, wire]));
  return {
    version: 1,
    nodes: seedBreadboardNodes(),
    components,
    wires,
    netLabels: {},
    notes: {},
    circuitBlocks: [],
  };
}

function getDesignatorFromState(components: Record<string, PlacedComponent>, componentId: string): string {
  const component = components[componentId];
  if (!component) return '';
  const prefix = DESIGNATOR_PREFIX[component.type] ?? 'X';
  let count = 0;
  for (const [id, candidate] of Object.entries(components)) {
    if (candidate.type !== component.type) continue;
    count += 1;
    if (id === componentId) return `${prefix}${count}`;
  }
  return `${prefix}${count || 1}`;
}

// ── Store with temporal (undo/redo) middleware ────────────────────────────────
// Only topology (nodes/components/wires) is tracked — UI state is excluded.
export const useCircuitStore = create<CircuitState>()(
  temporal(
    (set, get) => ({
    nodes: seedBreadboardNodes(),
    components: {},
    circuitBlocks: [],
    wires: {},
    netLabels: {},
      notes: {},
      selectedNodeId: null,
      selectedComponentId: null,
      selectedComponentIds: [],
      circuitName: '',
      clipboardLength: 0,
      wiringMode: false,
      wireBranchIndices: {},

      addComponent(type, pos, pins = [], rotationY = 0, props) {
        const id = crypto.randomUUID();
        const normalizedRotationY = ((rotationY % 360) + 360) % 360;
        set((state) => {
          const smartProps = props ?? getSmartDefaultProps(type, state.components);
          const components = {
            ...state.components,
            [id]: {
              id,
              type,
              anchorPos: pos,
              rotationY: normalizedRotationY,
              pins,
              props: smartProps,
            } as PlacedComponent,
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      removeComponent(id) {
        const comp = get().components[id];
        if (comp?.locked) {
          useToastStore.getState().addToast('Component is locked — unlock to delete', 'warn');
          return;
        }
        set((state) => {
          const { [id]: _removed, ...components } = state.components;
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
        useToastStore.getState().addToast('Deleted — Ctrl+Z to undo', 'info');
      },

      toggleComponentLock(id) {
        set((state) => {
          const component = state.components[id];
          if (!component) return state;
          return {
            components: {
              ...state.components,
              [id]: { ...component, locked: !component.locked },
            },
          };
        });
      },

      swapComponentType(id, newType) {
        const comp = get().components[id];
        if (!comp || comp.locked) return;

        set((state) => {
          const components = {
            ...state.components,
            [id]: { ...comp, type: newType, props: {} } as PlacedComponent,
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
        useToastStore.getState().addToast(`Swapped to ${newType} — Ctrl+Z to undo`, 'info');
      },

      addWire(fromId, toId, color = WIRE_COLORS[wireColorIdx++ % WIRE_COLORS.length]) {
        if (fromId === toId) {
          useToastStore.getState().addToast("Can't connect a pin to itself", 'warn');
          return;
        }
        const fromNode = get().nodes[fromId];
        const toNode = get().nodes[toId];
        if (fromNode?.netId != null && fromNode.netId === toNode?.netId) {
          useToastStore.getState().addToast('Those pins are already connected', 'warn');
          return;
        }
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
        useToastStore.getState().addToast('Wire deleted — Ctrl+Z to undo', 'info');
      },

      updateWireColor(id, color) {
        set((state) => ({
          wires: { ...state.wires, [id]: { ...state.wires[id], color } },
        }));
      },

      setWireColor(id, color) {
        set((state) => {
          const wire = state.wires[id];
          if (!wire) return state;
          return { wires: { ...state.wires, [id]: { ...wire, color } } };
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
        if (get().components[componentId]?.locked) return;
        set((state) => {
          const component = state.components[componentId];
          if (!component) return state;
          const components = {
            ...state.components,
            [componentId]: { ...component, rotationY: (component.rotationY + 90) % 360 },
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      nudgeComponent(componentId, dx, dz) {
        const comp = get().components[componentId];
        if (!comp || comp.locked) return;

        const candidateAnchor: Vec3 = [
          comp.anchorPos[0] + dx,
          comp.anchorPos[1],
          comp.anchorPos[2] + dz,
        ];
        let snappedAnchor: Vec3 = [candidateAnchor[0], candidateAnchor[1], candidateAnchor[2]];
        const pinTemplates = PIN_TEMPLATES[comp.type] ?? [];
        const pins: import('@/types/circuit').PinConnection[] = [];

        for (const pinDef of pinTemplates) {
          const pinOffset = rotateOffset(pinDef.offset, comp.rotationY);
          const pinWorld: Vec3 = [
            candidateAnchor[0] + pinOffset[0],
            candidateAnchor[1] + pinOffset[1],
            candidateAnchor[2] + pinOffset[2],
          ];

          let bestNodeId: string | null = null;
          let bestWorldPos: Vec3 | null = null;
          let bestDist = Number.POSITIVE_INFINITY;

          for (const node of Object.values(get().nodes)) {
            const dxn = pinWorld[0] - node.worldPos[0];
            const dyn = pinWorld[1] - node.worldPos[1];
            const dzn = pinWorld[2] - node.worldPos[2];
            const d = Math.sqrt(dxn * dxn + dyn * dyn + dzn * dzn);
            if (d < bestDist) {
              bestDist = d;
              bestNodeId = node.id;
              bestWorldPos = node.worldPos;
            }
          }

          if (bestNodeId) {
            pins.push({ name: pinDef.name, nodeId: bestNodeId });
          }

          if (bestDist < SNAP_THRESHOLD && bestWorldPos) {
            snappedAnchor = [
              bestWorldPos[0] - pinOffset[0],
              bestWorldPos[1] - pinOffset[1],
              bestWorldPos[2] - pinOffset[2],
            ] as Vec3;
          }
        }

        if (pins.length === 0) {
          const fallbackPins = comp.pins.map((pin) => ({ ...pin }));
          pins.push(...fallbackPins);
        }

        set((state) => {
          const component = state.components[componentId];
          if (!component) return state;
          const components = {
            ...state.components,
            [componentId]: {
              ...component,
              anchorPos: snappedAnchor,
              pins,
            },
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      moveComponent(id, newAnchorPos) {
        set((state) => {
          const comp = state.components[id];
          if (!comp || comp.locked) return state;
          const pinTemplates = PIN_TEMPLATES[comp.type] ?? [];
          const pins = pinTemplates.map((t, i) => {
            const rotated = rotateOffset(t.offset, comp.rotationY);
            const wx = newAnchorPos[0] + rotated[0];
            const wz = newAnchorPos[2] + rotated[2];
            const nodeId = snapToNode(wx, wz, state.nodes);
            return { name: t.name, nodeId: nodeId ?? comp.pins[i]?.nodeId ?? '' };
          });

          const components = {
            ...state.components,
            [id]: { ...comp, anchorPos: newAnchorPos, pins },
          };
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      moveComponents(moves) {
        set((state) => {
          let components = { ...state.components };
          for (const { id, newAnchorPos } of moves) {
            const comp = components[id];
            if (!comp || comp.locked) continue;

            const pinTemplates = PIN_TEMPLATES[comp.type] ?? [];
            const pins = pinTemplates.map((t, i) => {
              const rotated = rotateOffset(t.offset, comp.rotationY);
              const wx = newAnchorPos[0] + rotated[0];
              const wz = newAnchorPos[2] + rotated[2];
              const nodeId = snapToNode(wx, wz, state.nodes);
              return { name: t.name, nodeId: nodeId ?? comp.pins[i]?.nodeId ?? '' };
            });

            components = {
              ...components,
              [id]: { ...comp, anchorPos: newAnchorPos, pins },
            };
          }
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes };
        });
      },

      selectNode(id) {
        set({ selectedNodeId: id, wiringMode: id != null });
      },

      selectComponent(id) {
        set({ selectedComponentId: id, selectedComponentIds: id ? [id] : [] });
      },

      setSelectedComponents(ids) {
        const uniqueIds = [...new Set(ids)];
        set({ selectedComponentIds: uniqueIds, selectedComponentId: uniqueIds[0] ?? null });
      },
      setSelectedComponentIds(ids) {
        get().setSelectedComponents(ids);
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
        set({ clipboardLength: componentClipboard.length });
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

      saveAsBlock(name) {
        const state = get();
        const selectedIds = state.selectedComponentIds;
        if (selectedIds.length < 2) return;

        const selectedComponents = selectedIds
          .map((id) => state.components[id])
          .filter((component): component is PlacedComponent => component != null);
        if (selectedComponents.length < 2) return;

        const anchor = selectedComponents[0].anchorPos;
        const componentsForBlock = selectedComponents.map((component) => ({
          type: component.type,
          relativePos: subVec3(component.anchorPos, anchor),
          rotationY: component.rotationY,
          props: { ...component.props },
        }));

        set({
          circuitBlocks: [
            ...state.circuitBlocks,
            {
              id: crypto.randomUUID(),
              name,
              components: componentsForBlock,
            },
          ],
        });
      },

      deleteBlock(id) {
        set((state) => ({
          circuitBlocks: state.circuitBlocks.filter((block) => block.id !== id),
        }));
      },

      placeBlock(blockId, anchorPos) {
        const state = get();
        const block = state.circuitBlocks.find((candidate) => candidate.id === blockId);
        if (!block) return;

        const newComponentIds: string[] = [];
        for (const component of block.components) {
          const before = new Set(Object.keys(get().components));
          const worldPos: Vec3 = [
            anchorPos[0] + component.relativePos[0],
            anchorPos[1] + component.relativePos[1],
            anchorPos[2] + component.relativePos[2],
          ] as Vec3;

          useCircuitStore.getState().addComponent(component.type, worldPos, [], component.rotationY);
          const after = new Set(Object.keys(get().components));
          const added = [...after].find((id) => !before.has(id));

          if (!added) continue;
          newComponentIds.push(added);

          for (const [key, value] of Object.entries(component.props)) {
            useCircuitStore.getState().setProperty(added, key, value);
          }
        }

        if (newComponentIds.length > 0) {
          set({ selectedComponentId: newComponentIds[0], selectedComponentIds: newComponentIds });
        }
      },

      pasteClipboardAt(worldPos) {
        if (!componentClipboard.length) return;
        const anchorOrigin = componentClipboard[0].anchorPos;
        set((state) => {
          const components = { ...state.components };
          const pasted: string[] = [];
          for (const tmpl of componentClipboard) {
            const dx = tmpl.anchorPos[0] - anchorOrigin[0];
            const dz = tmpl.anchorPos[2] - anchorOrigin[2];
            const anchorPos: Vec3 = [worldPos[0] + dx, worldPos[1], worldPos[2] + dz];
            const id = crypto.randomUUID();
            components[id] = {
              id,
              type: tmpl.type,
              anchorPos,
              rotationY: tmpl.rotationY,
              pins: clonePinsForPaste(tmpl, anchorPos, state.nodes),
              props: { ...tmpl.props },
            };
            pasted.push(id);
          }
          const nodes = runNetAnalysis(state.nodes, state.wires, components);
          return { components, nodes, selectedComponentId: pasted[0] ?? null, selectedComponentIds: pasted };
        });
      },
      addNote(attachedTo, position) {
        const id = `note-${Date.now()}`;
        set((state) => ({
          notes: { ...state.notes, [id]: { id, text: 'Note', attachedTo, position } },
        }));
        return id;
      },

      updateNote(id, text) {
        set((state) => {
          const note = state.notes[id];
          if (!note) return state;
          return { notes: { ...state.notes, [id]: { ...note, text } } };
        });
      },

      removeNote(id) {
        set((state) => {
          const { [id]: _removed, ...notes } = state.notes;
          return { notes };
        });
      },

      selectAll() {
        set((state) => {
          const ids = Object.keys(state.components);
          return { selectedComponentIds: ids, selectedComponentId: ids[0] ?? null };
        });
      },

      loadCircuit(components, wires) {
        set((state) => {
          const nodes = runNetAnalysis(state.nodes, wires, components);
          return {
            components,
            wires,
            nodes,
            notes: {},
            netLabels: {},
            selectedComponentId: null,
            selectedComponentIds: [],
            selectedNodeId: null,
          };
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
          notes: {},
          selectedComponentId: null,
          selectedNodeId: null,
          netLabels: {},
        }));
      },

      deleteSelected() {
        const idsToDelete: string[] = get().selectedComponentIds.length > 0
          ? get().selectedComponentIds
          : (get().selectedComponentId ? [get().selectedComponentId as string] : []);
        const safeIds = idsToDelete.filter((id) => !get().components[id]?.locked);
        if (safeIds.length !== idsToDelete.length) {
          useToastStore.getState().addToast('Some components are locked — unlock to delete', 'warn');
        }
        const deletedAny = safeIds.length > 0;
        set((state) => {
          let wires = state.wires;
          let components = state.components;

          // Delete all multi-selected components (or fall back to single selection)
          for (const id of safeIds) {
            const { [id]: _c, ...rest } = components;
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
        if (deletedAny) {
          useToastStore.getState().addToast('Deleted — Ctrl+Z to undo', 'info');
        }
      },

      setWireBranchIndices(indices) {
        // Store separately so this does NOT mutate `wires` and re-trigger
        // SimController's [nodes, components, wires] useEffect.
        set({ wireBranchIndices: indices });
      },
      setCircuitName(name) {
        set({ circuitName: name });
      },

      getDesignator: (componentId) => getDesignatorFromState(get().components, componentId),

      saveToJSON() {
        const state = get();
        return JSON.stringify({
          version: 1,
          name: state.circuitName,
          nodes: state.nodes,
          components: state.components,
          wires: state.wires,
          netLabels: state.netLabels,
          notes: state.notes,
          circuitBlocks: state.circuitBlocks,
        } satisfies SavedCircuitJSON);
      },

      loadFromJSON(data) {
        const payload = typeof data === 'string'
          ? parseCircuitJSON(data)
          : exampleCircuitToPayload(data);
        if (!payload) { console.warn('[circuitStore] Invalid JSON circuit data'); return; }
        const payloadName = typeof data === 'string'
          ? (payload as { name?: string }).name
          : (data as { name?: string }).name;
        const nodes = runNetAnalysis(payload.nodes, payload.wires, payload.components);
        componentClipboard = []; // clear stale clipboard from previous circuit
        set({
          clipboardLength: 0,
          nodes,
          components: payload.components,
          wires: payload.wires,
          netLabels: payload.netLabels ?? {},
          notes: payload.notes ?? {},
          circuitBlocks: payload.circuitBlocks ?? [],
          circuitName: payloadName ?? '',
          selectedComponentId: null,
          selectedNodeId: null,
          selectedComponentIds: [],
        });
        clearUndoHistory?.();
      },

      newCircuit() {
        set({
          nodes: {},
          components: {},
          wires: {},
          circuitBlocks: [],
          netLabels: {},
          notes: {},
          circuitName: '',
          selectedComponentId: null,
          selectedComponentIds: [],
          selectedNodeId: null,
          wiringMode: false,
        });
        clearUndoHistory?.();
      },

      setNetLabel(netId, label) {
        const trimmed = label.trim();
        if (!trimmed) {
          set((state) => {
            const { [netId]: _removed, ...rest } = state.netLabels;
            return { netLabels: rest };
          });
          return;
        }
        set((state) => ({ netLabels: { ...state.netLabels, [netId]: trimmed } }));
      },

      removeNetLabel(netId) {
        set((state) => {
          const { [netId]: _removed, ...rest } = state.netLabels;
          return { netLabels: rest };
        });
      },
    }),
    {
      // Only snapshot topology + net labels for undo — not UI cursor state
      partialize: (state): TopologyStateForHistory => ({
        nodes: state.nodes,
        components: state.components,
        wires: state.wires,
        netLabels: state.netLabels,
      }),
      limit: 100,
    }
  )
);

if (typeof window !== 'undefined') {
  clearUndoHistory = () => useCircuitStore.temporal.getState().clear();

  useCircuitStore.subscribe((state, prev) => {
    if (
      state.nodes === prev.nodes &&
      state.components === prev.components &&
      state.wires === prev.wires &&
      state.netLabels === prev.netLabels &&
      state.notes === prev.notes &&
      state.circuitBlocks === prev.circuitBlocks
    ) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      localStorage.setItem(CIRCUIT_SAVE_KEY, useCircuitStore.getState().saveToJSON());
    }, AUTO_SAVE_DEBOUNCE_MS);
  });
}

// Convenience accessor for undo/redo — use in keyboard shortcut handler
export const useCircuitHistory = () => useCircuitStore.temporal;

// Pause/resume undo tracking — used by PropertiesInspector to batch
// a whole field-edit session (focus→blur) into a single undo entry.
export const pausePropertyUndo  = () => useCircuitStore.temporal.getState().pause();
export const resumePropertyUndo = () => useCircuitStore.temporal.getState().resume();
