import { describe, it, expect } from 'vitest';
import { solveDC } from '../MNASolver';
import type { Netlist } from '../MNASolver';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('MNASolver — solveDC', () => {
  it('empty netlist returns zero voltages, converged', () => {
    const netlist: Netlist = { elements: [], netCount: 1, wireBranchIndex: {} };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[0]).toBe(0);
    expect(result!.branchCurrents.length).toBe(0);
  });

  it('resistor divider — 9V source, two 1 kΩ resistors in series', () => {
    // Net 0 = ground, Net 1 = top of divider (9V), Net 2 = midpoint (4.5V)
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 9 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 2, netB: 0, value: 1000 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[1]).toBeCloseTo(9, 3);
    expect(result!.voltages[2]).toBeCloseTo(4.5, 3);
  });

  it('diode forward bias — 5V source, 1 kΩ, diode to ground (NR convergence)', () => {
    // Expect diode node voltage ≈ 0.6–0.7 V (Vf)
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'd1', kind: 'diode', netA: 2, netB: 0, value: 0.7 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    // Diode node should be at forward voltage ≈ 0.6–0.7 V
    const vf = result!.voltages[2];
    expect(vf).toBeGreaterThan(0.5);
    expect(vf).toBeLessThan(0.8);
  });

  it('NPN BJT common-emitter — emitter at ground, collector pulled down', () => {
    // Net 1 = Vcc (5V), Net 2 = collector, Net 3 = base, Net 0 = ground (emitter)
    // With Rb=100kΩ, Rc=1kΩ, hFE=100: Ib≈43µA, Ic≈4.3mA → Vc≈0.7V (saturation)
    // Previously BROKEN: netE=toRow(0)=-1 triggered early `continue`, BJT was skipped,
    // Vc floated to Vcc. Now fixed — emitter-at-ground is the standard NPN topology.
    const netlist: Netlist = {
      elements: [
        { id: 'vcc', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'rc', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'rb', kind: 'resistor', netA: 1, netB: 3, value: 100_000 },
        // BJT NPN: netA=collector, netB=base, netC=emitter
        { id: 'q1', kind: 'bjt', netA: 2, netB: 3, netC: 0, value: 100 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    // All voltages should be finite (no NaN or Infinity)
    for (let i = 0; i < result!.voltages.length; i++) {
      expect(Number.isFinite(result!.voltages[i])).toBe(true);
    }
    // Vcc should remain at 5V (enforced by vsource)
    expect(result!.voltages[1]).toBeCloseTo(5, 2);
    // Collector must be pulled well below Vcc — transistor is conducting
    expect(result!.voltages[2]).toBeLessThan(4.5);
    // Base should be forward-biased (Vbe ≈ 0.6-0.7V above ground)
    expect(result!.voltages[3]).toBeGreaterThan(0.4);
    expect(result!.voltages[3]).toBeLessThan(1.0);
  });

  it('RC transient — capacitor charges monotonically toward supply voltage', () => {
    // 5V source, 1 kΩ, 1 µF cap to ground; run 10 steps at dt=1ms
    const C = 1e-6;
    const R = 1000;
    const V = 5;
    const dt = 0.001;

    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: V },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: R },
        { id: 'c1', kind: 'capacitor', netA: 2, netB: 0, value: C },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };

    let prevVoltages = new Float32Array(3);
    let prevVcap = 0;

    for (let step = 0; step < 10; step++) {
      const result = solveDC(netlist, dt, prevVoltages);
      expect(result).not.toBeNull();
      expect(result!.converged).toBe(true);
      const vcap = result!.voltages[2];
      // Each step should bring voltage closer to V
      expect(vcap).toBeGreaterThanOrEqual(prevVcap - 1e-6);
      expect(vcap).toBeLessThanOrEqual(V + 1e-6);
      prevVcap = vcap;
      prevVoltages = new Float32Array(result!.voltages);
    }
    // After 10 ms, cap should have charged somewhat (τ = RC = 1ms → ~99.9% after 10τ)
    expect(prevVcap).toBeGreaterThan(0.001);
  });

  it('singular matrix — direct vsource short circuit returns null', () => {
    // Two voltage sources with conflicting voltages on the same two nets = singular
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'v2', kind: 'vsource', netA: 1, netB: 0, value: 3 },
      ],
      netCount: 2,
      wireBranchIndex: {},
    };
    // Two vsources on the same nodes → singular (duplicate KVL rows)
    const result = solveDC(netlist);
    // Either null or non-finite voltages is acceptable
    if (result !== null) {
      const hasInfinite = Array.from(result.voltages).some((v) => !Number.isFinite(v));
      expect(hasInfinite).toBe(true);
    }
    // If it returns null that's also correct
  });

  it('Gmin prevents singular matrix from floating node', () => {
    // Single resistor, one pin connected to 5V source, other pin floating (no ground path)
    // Gmin (1e-9 S) added to every diagonal should prevent singular matrix
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        // net 2 is floating — no element connects it to ground
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    // Should not crash; voltages should be finite
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.voltages[1])).toBe(true);
    expect(Number.isFinite(result!.voltages[2])).toBe(true);
  });
});
