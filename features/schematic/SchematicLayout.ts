import ELK from 'elkjs/lib/elk.bundled.js';
import type { CircuitNode, PlacedComponent, Wire } from '@/types/circuit';

export interface SchematicPos {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_NODE_SIZE = { w: 150, h: 80 };

const COMPONENT_SIZES: Record<string, { w: number; h: number }> = {
  resistor: { w: 180, h: 80 },
  led: { w: 130, h: 80 },
  battery: { w: 170, h: 70 },
  capacitor: { w: 140, h: 70 },
  bjt: { w: 180, h: 110 },
  pnp: { w: 180, h: 110 },
  arduino: { w: 240, h: 90 },
  motor: { w: 130, h: 70 },
  timer555: { w: 170, h: 90 },
  tactileSwitch: { w: 140, h: 60 },
  diode: { w: 130, h: 80 },
  zener: { w: 130, h: 80 },
  schottky: { w: 130, h: 80 },
  mosfet: { w: 180, h: 110 },
  opamp: { w: 190, h: 110 },
  inductor: { w: 160, h: 70 },
  potentiometer: { w: 150, h: 90 },
};

function getComponentSize(type: PlacedComponent['type']) {
  return COMPONENT_SIZES[type] ?? DEFAULT_NODE_SIZE;
}

function collectNetGroups(
  components: Record<string, PlacedComponent>,
  nodes: Record<string, CircuitNode>,
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();

  for (const component of Object.values(components)) {
    const componentId = component.id;

    for (const pin of component.pins) {
      const netId = nodes[pin.nodeId]?.netId;
      const netKey = netId == null ? `orphan:${pin.nodeId}` : `net:${netId}`;
      const set = groups.get(netKey) ?? new Set<string>();
      set.add(componentId);
      groups.set(netKey, set);
    }
  }

  return groups;
}

function mapNodeToComponents(components: Record<string, PlacedComponent>) {
  const nodeToComponents = new Map<string, Set<string>>();
  for (const component of Object.values(components)) {
    for (const pin of component.pins) {
      const set = nodeToComponents.get(pin.nodeId) ?? new Set<string>();
      set.add(component.id);
      nodeToComponents.set(pin.nodeId, set);
    }
  }
  return nodeToComponents;
}

function collectWireGroups(
  wires: Record<string, Wire>,
  nodeToComponents: Map<string, Set<string>>,
  nodes: Record<string, CircuitNode>,
): Record<string, Set<string>> {
  const groups: Record<string, Set<string>> = {};

  for (const [wireId, wire] of Object.entries(wires)) {
    const fromComponents = nodeToComponents.get(wire.fromNodeId);
    const toComponents = nodeToComponents.get(wire.toNodeId);
    if (!fromComponents?.size || !toComponents?.size) continue;

    const fromNet = nodes[wire.fromNodeId]?.netId;
    const toNet = nodes[wire.toNodeId]?.netId;
    if (fromNet == null || toNet == null) continue;
    if (fromNet !== toNet) continue;

    const set = new Set<string>();
    for (const componentId of fromComponents) set.add(componentId);
    for (const componentId of toComponents) set.add(componentId);

    if (set.size >= 2) {
      groups[`wire:${wireId}`] = set;
    }
  }

  return groups;
}

let layoutCache: {
  key: string;
  result: Record<string, SchematicPos>;
} | null = null;

function applyManualPositions(
  positions: Record<string, SchematicPos>,
  manualPositions: Record<string, { x: number; y: number }>,
): Map<string, SchematicPos> {
  const merged = new Map<string, SchematicPos>();

  for (const [id, pos] of Object.entries(positions)) {
    const manual = manualPositions[id];
    merged.set(id, manual ? { ...pos, x: manual.x, y: manual.y } : pos);
  }

  return merged;
}

function topologyKey(components: Record<string, PlacedComponent>, wires: Record<string, Wire>): string {
  const cIds = Object.keys(components).sort().join(',');
  const wIds = Object.keys(wires).sort().join(',');
  return `${cIds}|${wIds}`;
}

export async function layoutSchematic(
  components: Record<string, PlacedComponent>,
  wires:      Record<string, Wire>,
  nodes:      Record<string, CircuitNode>,
  manualPositions: Record<string, { x: number; y: number }> = {},
  onTopologyChange?: () => void,
): Promise<Map<string, SchematicPos>> {
  const key = topologyKey(components, wires);
  const topologyChanged = layoutCache?.key !== key;
  const effectiveManualPositions = topologyChanged ? {} : manualPositions;

  if (topologyChanged) {
    onTopologyChange?.();
  }

  if (!topologyChanged && layoutCache?.key === key) {
    return applyManualPositions(layoutCache.result, effectiveManualPositions);
  }

  const componentList = Object.values(components);
  const hasComponents = componentList.length > 0;

  const result = new Map<string, SchematicPos>();
  if (!hasComponents) {
    layoutCache = { key, result: {} };
    return applyManualPositions({}, effectiveManualPositions);
  }

  const netGroups = collectNetGroups(components, nodes);
  const wireGroups = collectWireGroups(wires, mapNodeToComponents(components), nodes);
  const edges: Array<{ id: string; sources: string[]; targets: string[] }> = [];
  let edgeCount = 0;

  for (const group of Object.values(wireGroups)) {
    if (group.size < 2) continue;
    const ordered = Array.from(group);
    for (let i = 1; i < ordered.length; i += 1) {
      edges.push({
        id: `wire-${edgeCount++}`,
        sources: [ordered[i - 1]],
        targets: [ordered[i]],
      });
    }
  }

  for (const group of netGroups.values()) {
    if (group.size < 2) continue;
    const ordered = Array.from(group);
    for (let i = 1; i < ordered.length; i += 1) {
      edges.push({
        id: `net-${edgeCount++}`,
        sources: [ordered[i - 1]],
        targets: [ordered[i]],
      });
    }
  }

  const children = componentList.map((component) => {
    const size = getComponentSize(component.type);
    return {
      id: component.id,
      width: size.w,
      height: size.h,
    };
  });

  const elk = new ELK();
  const layout = await elk.layout({
    id: 'root',
    layoutOptions: {
      algorithm: 'layered',
      'elk.direction': 'RIGHT',
      'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': '96',
      'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '56',
      'org.eclipse.elk.spacing.nodeNode': '58',
    },
    children,
    edges,
  });

  if (!layout.children) {
    return applyManualPositions({}, effectiveManualPositions);
  }

  for (const child of layout.children) {
    if (!child.id) continue;
    const x = Number(child.x ?? 0);
    const y = Number(child.y ?? 0);
    const w = Number(child.width ?? getComponentSize(components[child.id]?.type ?? 'resistor').w);
    const h = Number(child.height ?? getComponentSize(components[child.id]?.type ?? 'resistor').h);
    result.set(child.id, { id: child.id, x, y, w, h });
  }

  const cacheResult: Record<string, SchematicPos> = {};
  for (const [id, pos] of result.entries()) {
    cacheResult[id] = pos;
  }
  layoutCache = { key, result: cacheResult };

  return applyManualPositions(cacheResult, effectiveManualPositions);
}
