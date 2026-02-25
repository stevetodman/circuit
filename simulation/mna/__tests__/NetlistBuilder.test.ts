import { describe, it, expect } from 'vitest';
import { buildNetlist } from '../NetlistBuilder';
import type { CircuitNode, PlacedComponent } from '@/types/circuit';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeNode(id: string, netId: number | null): CircuitNode {
  return { id, worldPos: [0, 0, 0], netId };
}

function makeComponent(
  id: string,
  type: PlacedComponent['type'],
  pins: Array<{ name: string; nodeId: string; netId: number | null }>,
  props: Record<string, number | string> = {},
): { comp: PlacedComponent; nodes: Record<string, CircuitNode> } {
  const nodes: Record<string, CircuitNode> = {};
  const pinConnections = pins.map(({ name, nodeId, netId }) => {
    nodes[nodeId] = makeNode(nodeId, netId);
    return { name, nodeId };
  });
  const comp: PlacedComponent = {
    id,
    type,
    anchorPos: [0, 0, 0],
    rotationY: 0,
    pins: pinConnections,
    props,
  };
  return { comp, nodes };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buildNetlist', () => {
  it('empty circuit — no components, netCount=1', () => {
    const result = buildNetlist({}, {}, {});
    expect(result.elements).toHaveLength(0);
    expect(result.netCount).toBe(1); // only ground net
  });

  it('single 220Ω resistor — produces correct resistor element', () => {
    const { comp, nodes } = makeComponent('r1', 'resistor',
      [{ name: 'p1', nodeId: 'n1', netId: 1 }, { name: 'p2', nodeId: 'n0', netId: 0 }],
      { resistance: 220 },
    );
    const result = buildNetlist(nodes, { r1: comp }, {});
    expect(result.elements).toHaveLength(1);
    const el = result.elements[0];
    expect(el.kind).toBe('resistor');
    expect(el.netA).toBe(1);
    expect(el.netB).toBe(0);
    expect(el.value).toBe(220);
  });

  it('9V battery — produces vsource element', () => {
    const { comp, nodes } = makeComponent('bat1', 'battery',
      [{ name: 'pos', nodeId: 'np', netId: 1 }, { name: 'neg', nodeId: 'nn', netId: 0 }],
      { voltage: 9 },
    );
    const result = buildNetlist(nodes, { bat1: comp }, {});
    expect(result.elements).toHaveLength(1);
    const el = result.elements[0];
    expect(el.kind).toBe('vsource');
    expect(el.netA).toBe(1);
    expect(el.netB).toBe(0);
    expect(el.value).toBe(9);
  });

  it('LED — produces diode element', () => {
    const { comp, nodes } = makeComponent('led1', 'led',
      [{ name: 'anode', nodeId: 'na', netId: 2 }, { name: 'cathode', nodeId: 'nc', netId: 0 }],
      { forwardVoltage: 2.0 },
    );
    const result = buildNetlist(nodes, { led1: comp }, {});
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].kind).toBe('diode');
  });

  it('component with null netId pin — skipped (not stamped)', () => {
    // If a pin has netId=null the component should not appear in elements
    const { comp, nodes } = makeComponent('r1', 'resistor',
      [{ name: 'p1', nodeId: 'n1', netId: 1 }, { name: 'p2', nodeId: 'n_float', netId: null }],
      { resistance: 1000 },
    );
    const result = buildNetlist(nodes, { r1: comp }, {});
    expect(result.elements).toHaveLength(0);
  });

  it('netCount = max netId + 1', () => {
    // Components spanning nets 0–5 → netCount should be 6
    const allNodes: Record<string, CircuitNode> = {};
    const allComps: Record<string, PlacedComponent> = {};

    for (let i = 0; i < 5; i++) {
      const { comp, nodes } = makeComponent(`r${i}`, 'resistor',
        [{ name: 'p1', nodeId: `n${i}`, netId: i }, { name: 'p2', nodeId: `n${i + 1}`, netId: i + 1 }],
        { resistance: 1000 },
      );
      Object.assign(allNodes, nodes);
      allComps[`r${i}`] = comp;
    }

    const result = buildNetlist(allNodes, allComps, {});
    expect(result.netCount).toBe(6);
  });

  it('two pins on same net — component is skipped (netA === netB)', () => {
    // Both pins on net 1 → short circuit guard
    const { comp, nodes } = makeComponent('r1', 'resistor',
      [{ name: 'p1', nodeId: 'n1a', netId: 1 }, { name: 'p2', nodeId: 'n1b', netId: 1 }],
      { resistance: 100 },
    );
    const result = buildNetlist(nodes, { r1: comp }, {});
    expect(result.elements).toHaveLength(0);
  });
});
