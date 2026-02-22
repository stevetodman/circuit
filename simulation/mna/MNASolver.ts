/**
 * Modified Nodal Analysis — DC operating point solver.
 *
 * Supports:
 *   - Resistors   (conductance stamp)
 *   - Voltage sources (KVL extra row/column — used for batteries)
 *   - Diodes / LEDs (Shockley model, Newton-Raphson linearisation)
 *   - Capacitors (Backward-Euler companion model)
 *   - BJT NPN (simplified Ebers-Moll linearised)
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
  kind:  'resistor' | 'vsource' | 'diode' | 'capacitor' | 'bjt';
  netA:  number;   // positive terminal netId
  netB:  number;   // negative terminal netId (0 = ground)
  value: number;   // R (Ω), V (V), or forward voltage Vf for diode (informational)
  netC?: number;   // collector (for bjt)
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
}

// ── DC operating-point solver ──────────────────────────────────────────────────
export function solveDC(
  netlist: Netlist,
  dt?: number,
  prevVoltages?: Float32Array,
): SolveResult | null {
  const { elements, netCount } = netlist;

  // Trivial cases
  if (netCount <= 1) {
    return {
      voltages: new Float32Array(1),
      branchCurrents: new Float32Array(0),
    };
  }

  const vsources = elements.filter(e => e.kind === 'vsource');
  const resistors = elements.filter(e => e.kind === 'resistor');
  const diodes   = elements.filter(e => e.kind === 'diode');
  const capacitors = elements.filter(e => e.kind === 'capacitor');
  const bjts     = elements.filter(e => e.kind === 'bjt');

  const nonGroundNodeCount = netCount - 1;          // rows 0…nonGround-1  → netIds 1…
  const n = nonGroundNodeCount + vsources.length;

  if (n === 0) {
    return {
      voltages: new Float32Array(netCount),
      branchCurrents: new Float32Array(0),
    };
  }

  // netId → matrix row (netId 0 = ground → excluded)
  const toRow = (id: number) => id - 1;

  // Newton-Raphson iteration (handles diodes; one pass for diode-free circuits)
  const Vd = new Float64Array(diodes.length).fill(0.65);
  const Vbe = new Float64Array(bjts.length).fill(0.65);
  let lastX: Float64Array | null = null;

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

    // ── Small regularisation — prevents singular matrix for floating nets ─────
    for (let i = 0; i < nonGroundNodeCount; i++) G[i * n + i] += 1e-12;

    // ── Solve ────────────────────────────────────────────────────────────────
    const x = solve(G, b, n);
    if (!x) return null;
    lastX = x;

    // ── Convergence check for diodes + BJTs ──────────────────────────────────
    if (diodes.length === 0 && bjts.length === 0) break;

    const r = new Float32Array(netCount);
    for (let id = 1; id < netCount; id++) r[id] = x[toRow(id)];

    let converged = true;
    for (let di = 0; di < diodes.length; di++) {
      const el   = diodes[di];
      const va   = el.netA > 0 ? r[el.netA] : 0;
      const vb   = el.netB > 0 ? r[el.netB] : 0;
      const newVd = va - vb;
      if (Math.abs(newVd - Vd[di]) > NR_TOL) converged = false;
      Vd[di] = newVd;
    }
    for (let ti = 0; ti < bjts.length; ti++) {
      const el = bjts[ti];
      const vB = el.netB > 0 ? r[el.netB] : 0;
      const vE = el.netC != null && el.netC > 0 ? r[el.netC] : 0;
      const newVbe = Math.max(-5.0, Math.min(0.7, vB - vE));
      if (Math.abs(newVbe - Vbe[ti]) > NR_TOL) converged = false;
      Vbe[ti] = newVbe;
    }
    if (converged) break;
  }

  if (!lastX) return null;

  const voltages = new Float32Array(netCount);
  for (let id = 1; id < netCount; id++) {
    voltages[id] = lastX[toRow(id)];
  }

  const branchCurrents = new Float32Array(resistors.length + vsources.length);
  let branchIndex = 0;

  for (const resistor of resistors) {
    const vA = resistor.netA > 0 ? voltages[resistor.netA] : 0;
    const vB = resistor.netB > 0 ? voltages[resistor.netB] : 0;
    branchCurrents[branchIndex++] = (vA - vB) / Math.max(resistor.value, 1e-9);
  }

  for (let vi = 0; vi < vsources.length; vi++) {
    branchCurrents[branchIndex++] = lastX[nonGroundNodeCount + vi];
  }

  return { voltages, branchCurrents };
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
