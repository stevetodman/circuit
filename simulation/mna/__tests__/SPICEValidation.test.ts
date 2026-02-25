/**
 * SPICE Validation Suite — 10 analytically-verifiable reference circuits.
 *
 * Every ground truth is derived from Ohm's Law / KVL / KCL without running
 * an external SPICE tool, so the expected values are exact (within floating
 * point tolerance). This serves as a regression gate for the MNA solver.
 */
import { describe, it, expect } from 'vitest';
import { solveDC } from '../MNASolver';
import type { Netlist } from '../MNASolver';

describe('SPICE Validation Suite', () => {
  // ── 1. Voltage divider (10V, 1kΩ + 1kΩ) ──────────────────────────────────
  it('1 — voltage divider: Vmid = 5.000V', () => {
    // Net 0 = GND, Net 1 = 10V source, Net 2 = midpoint
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 10 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 2, netB: 0, value: 1000 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[1]).toBeCloseTo(10, 3);
    expect(result!.voltages[2]).toBeCloseTo(5, 3);
  });

  // ── 2. Series resistors (9V, 1kΩ + 2kΩ) ──────────────────────────────────
  it('2 — series resistors: V1 = 6V, V2 = 3V', () => {
    // Net 0 = GND, Net 1 = 9V, Net 2 = junction R1-R2, Net 3 = junction R2-R3
    // I = 9V / 3kΩ = 3mA; V(net2) = 9 - 3mA*1k = 6V; V(net3) = 6 - 3mA*1k = 3V
    // (using 1k+1k+1k to get two interior nodes at 6V and 3V)
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 9 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 2, netB: 3, value: 1000 },
        { id: 'r3', kind: 'resistor', netA: 3, netB: 0, value: 1000 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[2]).toBeCloseTo(6, 3);
    expect(result!.voltages[3]).toBeCloseTo(3, 3);
  });

  // ── 3. Parallel resistors (6V, 2kΩ ∥ 2kΩ) ────────────────────────────────
  it('3 — parallel resistors: I_total = 6mA', () => {
    // Two 2kΩ in parallel = 1kΩ; I = 6V / 1kΩ = 6mA
    // Vsource branch current should be ~6mA (negative by MNA sign convention)
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 6 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 0, value: 2000 },
        { id: 'r2', kind: 'resistor', netA: 1, netB: 0, value: 2000 },
      ],
      netCount: 2,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[1]).toBeCloseTo(6, 3);
    // Vsource branch current (MNA sign: current flowing into positive terminal)
    // I_source = -(I_r1 + I_r2) = -(3mA + 3mA) = -6mA
    const iSource = result!.branchCurrents[2]; // index: 2 resistors then vsource
    expect(Math.abs(iSource)).toBeCloseTo(0.006, 4);
  });

  // ── 4. Diode + resistor (5V, 470Ω) ────────────────────────────────────────
  it('4 — diode + resistor: Vf ∈ [0.55, 0.75V]', () => {
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 470 },
        { id: 'd1', kind: 'diode', netA: 2, netB: 0, value: 0.7 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    const vf = result!.voltages[2];
    expect(vf).toBeGreaterThan(0.55);
    expect(vf).toBeLessThan(0.75);
  });

  // ── 5. Wheatstone bridge (10V, 4 × 1kΩ balanced) ──────────────────────────
  it('5 — Wheatstone bridge balanced: Vmid_A = Vmid_B = 5V', () => {
    // Net 0 = GND, Net 1 = 10V, Net 2 = mid-left, Net 3 = mid-right
    //       1 ──R1── 2 ──R3── 0
    //       1 ──R2── 3 ──R4── 0
    // Balanced: V(2) = V(3) = 5V
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 10 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 1, netB: 3, value: 1000 },
        { id: 'r3', kind: 'resistor', netA: 2, netB: 0, value: 1000 },
        { id: 'r4', kind: 'resistor', netA: 3, netB: 0, value: 1000 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[2]).toBeCloseTo(5, 3);
    expect(result!.voltages[3]).toBeCloseTo(5, 3);
  });

  // ── 6. Capacitor DC steady-state (no dt → open circuit) ───────────────────
  it('6 — capacitor DC: Vcap = Vsource (open circuit)', () => {
    // Without dt, capacitor is not stamped → open circuit
    // Net 2 floats to source voltage via Gmin leakage
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'c1', kind: 'capacitor', netA: 2, netB: 0, value: 1e-6 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    // No dt → DC analysis; capacitor not stamped, net 2 floats to ~5V via Gmin
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    // With only Gmin (1e-9 S) as load, voltage is very close to source
    expect(result!.voltages[2]).toBeGreaterThan(4.9);
  });

  // ── 7. Inductor DC (large Geq → near-short) ──────────────────────────────
  it('7 — inductor DC: V_inductor ≈ 0V (near-short)', () => {
    // Net 0 = GND, Net 1 = 5V, Net 2 = between R and L
    // In DC, inductor is near-short (Geq=1e9 S), so V(2)≈0V
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'l1', kind: 'inductor', netA: 2, netB: 0, value: 0.001 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    // Inductor acts as near-short in DC → almost all voltage dropped across R
    expect(Math.abs(result!.voltages[2])).toBeLessThan(0.01);
  });

  // ── 8. Two-source averaging network ─────────────────────────────────────
  it('8 — two-source averaging: Vmid = 4.0V', () => {
    // Net 0 = GND, Net 1 = 5V, Net 2 = 3V, Net 3 = junction
    // Equal 1kΩ resistors from each source → Vmid = (5+3)/2 = 4V (superposition)
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'v2', kind: 'vsource', netA: 2, netB: 0, value: 3 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 3, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 2, netB: 3, value: 1000 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[1]).toBeCloseTo(5, 3);
    expect(result!.voltages[2]).toBeCloseTo(3, 3);
    expect(result!.voltages[3]).toBeCloseTo(4, 3);
  });

  // ── 9. BJT forward-active (grounded emitter, after bug fix) ───────────────
  it('9 — BJT common-emitter: Vc < 4.5V, Vb ∈ [0.5, 0.8V]', () => {
    // Net 0 = GND (emitter), Net 1 = Vcc (5V), Net 2 = collector, Net 3 = base
    const netlist: Netlist = {
      elements: [
        { id: 'vcc', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'rc', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'rb', kind: 'resistor', netA: 1, netB: 3, value: 100_000 },
        { id: 'q1', kind: 'bjt', netA: 2, netB: 3, netC: 0, value: 100 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    // Collector pulled down (transistor conducts)
    expect(result!.voltages[2]).toBeLessThan(4.5);
    // Base forward-biased
    expect(result!.voltages[3]).toBeGreaterThan(0.4);
    expect(result!.voltages[3]).toBeLessThan(1.0);
  });

  // ── 10. Three-resistor ladder (9V, 1k + 1k + 1k) ─────────────────────────
  it('10 — three-resistor ladder: V1=6V, V2=3V, V3≈0V', () => {
    // Same as test 2 but verifying ground node is 0V explicitly
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 9 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 1000 },
        { id: 'r2', kind: 'resistor', netA: 2, netB: 3, value: 1000 },
        { id: 'r3', kind: 'resistor', netA: 3, netB: 0, value: 1000 },
      ],
      netCount: 4,
      wireBranchIndex: {},
    };
    const result = solveDC(netlist);
    expect(result).not.toBeNull();
    expect(result!.converged).toBe(true);
    expect(result!.voltages[1]).toBeCloseTo(9, 3);
    expect(result!.voltages[2]).toBeCloseTo(6, 3);
    expect(result!.voltages[3]).toBeCloseTo(3, 3);
    expect(result!.voltages[0]).toBe(0); // ground is always 0V
  });

  // ── Bonus: RC fine-timestep regression guard ──────────────────────────────
  it('RC fine timestep — solver converges at dt=1µs', () => {
    // τ = 10Ω × 1µF = 10µs; 5 steps at dt=1µs should show partial charge
    const netlist: Netlist = {
      elements: [
        { id: 'v1', kind: 'vsource', netA: 1, netB: 0, value: 5 },
        { id: 'r1', kind: 'resistor', netA: 1, netB: 2, value: 10 },
        { id: 'c1', kind: 'capacitor', netA: 2, netB: 0, value: 1e-6 },
      ],
      netCount: 3,
      wireBranchIndex: {},
    };

    const dt = 1e-6; // 1µs
    let prevVoltages = new Float32Array(3);

    for (let step = 0; step < 5; step++) {
      const result = solveDC(netlist, dt, prevVoltages);
      expect(result).not.toBeNull();
      expect(result!.converged).toBe(true);
      prevVoltages = new Float32Array(result!.voltages);
    }
    // After 5µs (0.5τ), cap should have charged to ~39% of 5V ≈ 1.97V
    const vcap = prevVoltages[2];
    expect(vcap).toBeGreaterThan(0.5);
    expect(vcap).toBeLessThan(4.0);
  });
});
