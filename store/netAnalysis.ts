import type { CircuitNode, Wire } from '@/types/circuit';
import { COLS, RAIL_HOLES } from '@/store/circuitStore';

const TOP_LETTERS = ['a', 'b', 'c', 'd', 'e'];
const BOT_LETTERS = ['f', 'g', 'h', 'i', 'j'];

function buildImplicitEdges(nodeIds: string[]): [string, string][] {
  const edges: [string, string][] = [];
  const nodeSet = new Set(nodeIds);

  for (let col = 1; col <= COLS; col++) {
    const topGroup = TOP_LETTERS.map((r) => `bb-${r}${col}`).filter((id) => nodeSet.has(id));
    const botGroup = BOT_LETTERS.map((r) => `bb-${r}${col}`).filter((id) => nodeSet.has(id));

    for (let i = 1; i < topGroup.length; i++) {
      edges.push([topGroup[0], topGroup[i]]);
    }
    for (let i = 1; i < botGroup.length; i++) {
      edges.push([botGroup[0], botGroup[i]]);
    }
  }

  const railStrips = [
    Array.from({ length: RAIL_HOLES }, (_, i) => `bb-tp-${i + 1}`),
    Array.from({ length: RAIL_HOLES }, (_, i) => `bb-tn-${i + 1}`),
    Array.from({ length: RAIL_HOLES }, (_, i) => `bb-bp-${i + 1}`),
    Array.from({ length: RAIL_HOLES }, (_, i) => `bb-bn-${i + 1}`),
  ];
  for (const strip of railStrips) {
    const valid = strip.filter((id) => nodeSet.has(id));
    for (let i = 1; i < valid.length; i++) {
      edges.push([valid[0], valid[i]]);
    }
  }

  return edges;
}

export function runNetAnalysis(nodes: Record<string, CircuitNode>, wires: Record<string, Wire>): Record<string, CircuitNode> {
  const nodeIds = Object.keys(nodes);
  const adj: Record<string, Set<string>> = {};
  const netIds: Record<string, number> = {};

  for (const id of nodeIds) {
    adj[id] = new Set<string>();
  }

  for (const wire of Object.values(wires)) {
    adj[wire.fromNodeId]?.add(wire.toNodeId);
    adj[wire.toNodeId]?.add(wire.fromNodeId);
  }

  for (const [a, b] of buildImplicitEdges(nodeIds)) {
    adj[a]?.add(b);
    adj[b]?.add(a);
  }

  let nextNet = 1;
  const visited = new Set<string>();

  const bfs = (startId: string, netId: number) => {
    const queue = [startId];
    visited.add(startId);
    netIds[startId] = netId;

    while (queue.length) {
      const current = queue.shift()!;
      const neighbours = adj[current];
      if (!neighbours) continue;

      for (const neighbour of neighbours) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          netIds[neighbour] = netId;
          queue.push(neighbour);
        }
      }
    }
  };

  const groundNodes = nodeIds.filter((id) => id.startsWith('bb-tn-') || id.startsWith('bb-bn-'));
  for (const gndId of groundNodes) {
    if (!visited.has(gndId)) {
      bfs(gndId, 0);
    }
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && (adj[id]?.size ?? 0) > 0) {
      bfs(id, nextNet++);
    }
  }

  const updated: Record<string, CircuitNode> = {};
  for (const [id, node] of Object.entries(nodes)) {
    updated[id] = { ...node, netId: netIds[id] ?? null };
  }

  const assigned = Object.fromEntries(nodeIds.map((id) => [id, netIds[id] ?? null]));
  const assignedNetCount = new Set(Object.values(netIds)).size;
  console.log(`[NetAnalysis] ${assignedNetCount} nets assigned`);
  console.log('[NetAnalysis] node assignments:', assigned);

  return updated;
}
