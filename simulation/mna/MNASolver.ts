/**
 * Modified Nodal Analysis — DC operating point solver.
 *
 * Supports:
 *   - Resistors   (conductance stamp)
 *   - Voltage sources (KVL extra row/column — used for batteries)
 *   - Diodes / LEDs (Shockley model, Newton-Raphson linearisation)
 *   - Capacitors (Backward-Euler companion model)
 *   - Inductors (R_eq = L/dt, I_eq = I_prev)
 *   - BJT NPN (simplified Ebers-Moll linearised)
 *   - MOSFET (voltage-controlled switch approximation)
 *   - Op-amp (iterative clamp + gain control)
 *
 * Matrix form: G · x = b
 *   G  = (n + m) × (n + m) admittance/KVL matrix
 *        n = non-ground nets, m = voltage source count
 *   x  = [node voltages v₁…vₙ ; vs branch currents i₁…iₘ]
 *   b  = current excitation vector
 *
 * Ground node has netId = 0 and is excluded from the matrix.
 */

// ── Types ──────────────────────────────────────────────────────────────────────
export interface NetlistElement {
  id:    string;
  kind:  'resistor' | 'vsource' | 'diode' | 'capacitor' | 'bjt' | 'mosfet' | 'opamp' | 'inductor';
  netA:  number;   // positive terminal netId
  netB:  number;   // negative terminal netId (0 = ground)
  value: number;   // R (Ω), V (V), or forward voltage Vf for diode (informational)
  netC?: number;   // collector (for bjt), gate (for mosfet), in- (for opamp)
  netD?: number;   // vcc (for opamp)
  netE?: number;   // gnd (for opamp)
}

export interface Netlist {
  elements: NetlistElement[];
  netCount: number;   // total distinct nets including ground (0)
  wireBranchIndex?: Record<string, number>;
}

// ── Diode parameters ───────────────────────────────────────────────────────────
const IS      = 1e-14;    // saturation current (A)
const VT      = 0.02585;  // thermal voltage at 25 °C (V)
const VD_MAX  = 1.2;      // clamp to prevent exp() overflow
const VD_MIN  = -5.0;
const NR_ITER = 60;
const NR_TOL  = 1e-9;

// ── Gaussian elimination with partial pivoting ─────────────────────────────────
function solve(G: Float64Array, b: Float64Array, n: number): Float64Array | null {
  const A = G.slice(); // work on a copy
  const r = b.slice();

  for (let k = 0; k < n; k++) {
    // Find pivot
    let maxVal = Math.abs(A[k * n + k]);
    let maxRow = k;
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i * n + k]);
      if (v > maxVal) { maxVal = v; maxRow = i; }
    }
    if (maxVal < 1e-14) return null; // singular / floating net

    // Swap rows
    if (maxRow !== k) {
      for (let j = 0; j < n; j++) {
        const t = A[k * n + j]; A[k * n + j] = A[maxRow * n + j]; A[maxRow * n + j] = t;
      }
      const t = r[k]; r[k] = r[maxRow]; r[maxRow] = t;
    }

    // Eliminate column k below pivot
    const piv = A[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = A[i * n + k] / piv;
      A[i * n + k] = 0;
      for (let j = k + 1; j < n; j++) A[i * n + j] -= f * A[k * n + j];
      r[i] -= f * r[k];
    }
  }

  // Back-substitution
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = r[i];
    for (let j = i + 1; j < n; j++) x[i] -= A[i * n + j] * x[j];
    x[i] /= A[i * n + i];
  }
  return x;
}

export interface SolveResult {
  voltages: Float32Array;
  branchCurrents: Float32Array;
  converged: boolean; // P1-15: false if NR did not converge within NR_ITER
  inductorCurrents?: Record<string, number>;
}

// ── DC operating-point solver ──────────────────────────────────────────────────
export function solveDC(
  netlist: Netlist,
  dt?: number,
  prevVoltages?: Float32Array,
  prevInductorCurrents?: Record<string, number>,
): SolveResult | null {
  const { elements, netCount } = netlist;

  // Trivial cases
  if (netCount <= 1) {
    return {
      voltages: new Float32Array(1),
      branchCurrents: new Float32Array(0),
      converged: true,
    };
  }

  const vsources = elements.filter(e => e.kind === 'vsource');
  const resistors = elements.filter(e => e.kind === 'resistor');
  const diodes   = elements.filter(e => e.kind === 'diode');
  const capacitors = elements.filter(e => e.kind === 'capacitor');
  const bjts     = elements.filter(e => e.kind === 'bjt');
  const mosfets  = elements.filter(e => e.kind === 'mosfet');
  const opamps   = elements.filter(e => e.kind === 'opamp');
  const inductors = elements.filter(e => e.kind === 'inductor');

  const nonGroundNodeCount = netCount - 1;          // rows 0…nonGround-1  → netIds 1…
  const nonLinearSourceCount = vsources.length + opamps.length;
  const n = nonGroundNodeCount + nonLinearSourceCount;

  if (n === 0) {
    return {
      voltages: new Float32Array(netCount),
      branchCurrents: new Float32Array(0),
      converged: true,
    };
  }

  // netId → matrix row (netId 0 = ground → excluded)
  const toRow = (id: number) => id - 1;

  // Newton-Raphson iteration (handles diodes; one pass for diode-free circuits)
  const Vd = new Float64Array(diodes.length).fill(0.65);
  const Vbe = new Float64Array(bjts.length).fill(0.65);
  const opVNext = new Float64Array(opamps.length).fill(0);
  const mosfetOn = new Float32Array(mosfets.length);
  const inductorCurrentsOut: Record<string, number> = {};
  let lastX: Float64Array | null = null;
  let nrConverged = true; // P1-15: track NR convergence

  for (let iter = 0; iter < NR_ITER; iter++) {
    const G = new Float64Array(n * n);
    const b = new Float64Array(n);

    // ── Stamp resistors ──────────────────────────────────────────────────────
    for (const el of elements) {
      if (el.kind !== 'resistor') continue;
      const g = 1.0 / Math.max(el.value, 1e-9);
      stamp2(G, b, n, toRow(el.netA), toRow(el.netB), g, 0, 0);
    }

    // ── Stamp capacitors (Backward Euler companion) ───────────────────────────
    if (dt !== undefined) {
      for (const el of capacitors) {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const geq = el.value / Math.max(dt, 1e-12);
        const prevA = prevVoltages ? prevVoltages[el.netA] ?? 0 : 0;
        const prevB = prevVoltages ? prevVoltages[el.netB] ?? 0 : 0;
        const ih = geq * (prevA - prevB);
        stamp2(G, b, n, rA, rB, geq, ih, -ih);
      }
    }

    // ── Stamp inductors (short DC; companion in transient) ──────────────────
    if (dt !== undefined) {
      for (const el of inductors) {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const L = Math.max(1e-12, el.value);
        const geq = dt / L;
        const iPrev = prevInductorCurrents?.[el.id] ?? 0;
        stamp2(G, b, n, rA, rB, geq, iPrev, -iPrev);
      }
    } else {
      for (const el of inductors) {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const geq = 1 / 0.001;
        stamp2(G, b, n, rA, rB, geq, 0, 0);
      }
    }

    // ── Stamp diodes (linearised Shockley) ───────────────────────────────────
    for (let di = 0; di < diodes.length; di++) {
      const el  = diodes[di];
      const vd  = Math.max(VD_MIN, Math.min(VD_MAX, Vd[di]));
      const expV = Math.exp(vd / VT);
      const Geq  = (IS / VT) * expV;
      const Id   = IS * (expV - 1);
      const Ieq  = Id - Geq * vd;
      stamp2(G, b, n, toRow(el.netA), toRow(el.netB), Geq, -Ieq, Ieq);
    }

    // ── Stamp BJTs (simplified Ebers-Moll linearised around Vbe[ti]) ─────────
    for (let ti = 0; ti < bjts.length; ti++) {
      const el = bjts[ti];
      const netB = toRow(el.netB);
      const netE = el.netC != null ? toRow(el.netC) : -1;
      const netC = toRow(el.netA);
      if (netB < 0 || netE < 0 || netC < 0) continue;
      // Use previous-iteration estimate (Vbe[ti]) — x is not yet available
      const vbe = Vbe[ti];
      const expV = Math.exp(vbe / VT);
      const g = (IS / VT) * expV;
      const ibe = IS * (expV - 1);
      const ieq = ibe - g * vbe;
      const hFE = Number.isFinite(el.value) ? Math.max(0, el.value) : 100;

      stamp2(G, b, n, netB, netE, g, -ieq, ieq);

      if (netC >= 0) {
        if (netB >= 0) G[netC * n + netB] += hFE * g;
        if (netE >= 0) G[netC * n + netE] -= hFE * g;
        b[netC] -= hFE * ieq;
      }
    }

    // ── Stamp MOSFETs (voltage-controlled switches) ──────────────────────────
    for (let mi = 0; mi < mosfets.length; mi++) {
      const el = mosfets[mi];
      const rA = toRow(el.netA);
      const rB = toRow(el.netB);
      const vGate = el.netC != null && el.netC > 0 ? (lastX?.[el.netC - 1] ?? 0) : 0;
      const vSource = el.netB != null && el.netB > 0 ? (lastX?.[el.netB - 1] ?? 0) : 0;
      const vgs = vGate - vSource;
      const isOn = vgs > 2 ? 1 : 0;
      const ron = Math.max(1e-6, el.value);
      const roff = 1_000_000;
      const g = 1 / (isOn ? ron : roff);
      stamp2(G, b, n, rA, rB, g, 0, 0);
    }

    // ── Stamp voltage sources ────────────────────────────────────────────────
    for (let vi = 0; vi < vsources.length; vi++) {
      const el    = vsources[vi];
      const vsRow = nonGroundNodeCount + vi;
      const rA    = el.netA > 0 ? toRow(el.netA) : -1;
      const rB    = el.netB > 0 ? toRow(el.netB) : -1;
      if (rA >= 0) { G[rA * n + vsRow] += 1; G[vsRow * n + rA] += 1; }
      if (rB >= 0) { G[rB * n + vsRow] -= 1; G[vsRow * n + rB] -= 1; }
      b[vsRow] = el.value;
    }

    // ── Stamp op-amps as controlled sources (VCVS approximation) ──────────
    for (let oi = 0; oi < opamps.length; oi++) {
      const el    = opamps[oi];
      const outRow = nonGroundNodeCount + vsources.length + oi;
      const netInP = el.netB != null && el.netB > 0 ? (lastX?.[el.netB - 1] ?? 0) : 0;
      const netInN = el.netC != null && el.netC > 0 ? (lastX?.[el.netC - 1] ?? 0) : 0;
      const netVcc = el.netD != null && el.netD > 0 ? (lastX?.[el.netD - 1] ?? 0) : 0;
      const netGnd = el.netE != null && el.netE > 0 ? (lastX?.[el.netE - 1] ?? 0) : 0;
      const raw = (el.value ?? 100000) * (netInP - netInN);
      const clamped = Math.max(netGnd, Math.min(netVcc, raw));
      opVNext[oi] = clamped;

      const rOut = el.netA > 0 ? toRow(el.netA) : -1;
      if (rOut >= 0) {
        G[rOut * n + outRow] += 1;
        G[outRow * n + rOut] += 1;
      }
      b[outRow] = opVNext[oi];
    }

    // ── Gmin stepping — 1e-9 S across every node prevents singular matrix ────
    // Standard SPICE technique; negligible effect on connected circuits
    for (let i = 0; i < nonGroundNodeCount; i++) G[i * n + i] += 1e-9;

    // ── Solve ────────────────────────────────────────────────────────────────
    const x = solve(G, b, n);
    if (!x) return null;
    lastX = x;

    // ── Convergence check for diodes + BJTs ──────────────────────────────────
    if (diodes.length === 0 && bjts.length === 0 && mosfets.length === 0 && opamps.length === 0) break;

    const r = new Float32Array(netCount);
    for (let id = 1; id < netCount; id++) r[id] = x[toRow(id)];

    let iterConverged = true;
    for (let di = 0; di < diodes.length; di++) {
      const el   = diodes[di];
      const va   = el.netA > 0 ? r[el.netA] : 0;
      const vb   = el.netB > 0 ? r[el.netB] : 0;
      const newVd = va - vb;
      // Clamp update step to ±2 V per iteration to prevent Shockley exp() runaway
      const delta = Math.max(-2.0, Math.min(2.0, newVd - Vd[di]));
      const clampedVd = Vd[di] + delta;
      if (Math.abs(delta) > NR_TOL) iterConverged = false;
      Vd[di] = clampedVd;
    }
    for (let ti = 0; ti < bjts.length; ti++) {
      const el = bjts[ti];
      const vB = el.netB > 0 ? r[el.netB] : 0;
      const vE = el.netC != null && el.netC > 0 ? r[el.netC] : 0;
      const newVbe = Math.max(-5.0, Math.min(0.7, vB - vE));
      if (Math.abs(newVbe - Vbe[ti]) > NR_TOL) iterConverged = false;
      Vbe[ti] = newVbe;
    }
    for (let mi = 0; mi < mosfets.length; mi++) {
      const el = mosfets[mi];
      const vGate = el.netC != null && el.netC > 0 ? r[el.netC] : 0;
      const vSource = el.netB != null && el.netB > 0 ? r[el.netB] : 0;
      const vgs = vGate - vSource;
      const on = vgs > 2 ? 1 : 0;
      if (Math.abs(on - mosfetOn[mi]) > 0.000001) iterConverged = false;
      mosfetOn[mi] = on;
    }
    for (let oi = 0; oi < opamps.length; oi++) {
      const netOut = opamps[oi].netA > 0 ? r[opamps[oi].netA] : 0;
      const target = opVNext[oi];
      if (Math.abs(netOut - target) > 1e-6) iterConverged = false;
    }
    if (iterConverged) break;
    // If we exhaust all iterations without converging, flag it
    if (iter === NR_ITER - 1) nrConverged = false;
  }

  if (!lastX) return null;

  const voltages = new Float32Array(netCount);
  for (let id = 1; id < netCount; id++) {
    voltages[id] = lastX[toRow(id)];
  }

  const branchCurrents = new Float32Array(resistors.length + vsources.length + opamps.length + inductors.length);
  let branchIndex = 0;

  for (const resistor of resistors) {
    const vA = resistor.netA > 0 ? voltages[resistor.netA] : 0;
    const vB = resistor.netB > 0 ? voltages[resistor.netB] : 0;
    branchCurrents[branchIndex++] = (vA - vB) / Math.max(resistor.value, 1e-9);
  }

  // Vsource branch currents (MNA extra variable currents)
  for (let vi = 0; vi < vsources.length; vi++) {
    branchCurrents[branchIndex++] = lastX[nonGroundNodeCount + vi];
  }

  // Op-amp enforced-source branch currents (not physically meaningful, but stable for diagnostics)
  for (let oi = 0; oi < opamps.length; oi++) {
    branchCurrents[branchIndex++] = lastX[nonGroundNodeCount + vsources.length + oi];
  }

  // Inductor branch currents
  for (const el of inductors) {
    const vA = el.netA > 0 ? voltages[el.netA] : 0;
    const vB = el.netB > 0 ? voltages[el.netB] : 0;
    const geq = dt !== undefined ? Math.max(dt, 1e-12) / Math.max(el.value, 1e-12) : 1 / 0.001;
    const iPrev = prevInductorCurrents?.[el.id] ?? 0;
    const current = geq * (vA - vB) + iPrev;
    branchCurrents[branchIndex++] = current;
    inductorCurrentsOut[el.id] = current;
  }

  if (inductors.length > 0 && dt === undefined) {
    for (const el of inductors) {
      const vA = el.netA > 0 ? voltages[el.netA] : 0;
      const vB = el.netB > 0 ? voltages[el.netB] : 0;
      inductorCurrentsOut[el.id] = (vA - vB) / 0.001;
    }
  }

  if (!nrConverged) {
    console.warn('[MNA] Newton-Raphson did not converge within', NR_ITER, 'iterations');
  }

  return { voltages, branchCurrents, inductorCurrents: Object.keys(inductorCurrentsOut).length ? inductorCurrentsOut : undefined, converged: nrConverged };
}

// ── Helper: stamp a 2-terminal element ────────────────────────────────────────
function stamp2(
  G: Float64Array, b: Float64Array, n: number,
  rA: number, rB: number,
  g: number, ibA: number, ibB: number,
) {
  if (rA >= 0) { G[rA * n + rA] += g; b[rA] += ibA; }
  if (rB >= 0) { G[rB * n + rB] += g; b[rB] += ibB; }
  if (rA >= 0 && rB >= 0) { G[rA * n + rB] -= g; G[rB * n + rA] -= g; }
}
