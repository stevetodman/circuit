import type { Netlist } from './MNASolver';

export interface ACSweepPoint {
  freq: number;
  gainDB: number;
  phaseDeg: number;
}

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

function stampComplex(
  A: Float64Array,
  b: Float64Array,
  N: number,
  nc: number,
  rA: number,
  rB: number,
  Yr: number,
  Yi: number,
  ibReA: number,
  ibReB: number,
  ibImA: number,
  ibImB: number,
) {
  // Top-left block: real equations, real unknowns (+Yr)
  if (rA >= 0) { A[rA * N + rA] += Yr; b[rA] += ibReA; }
  if (rB >= 0) { A[rB * N + rB] += Yr; b[rB] += ibReB; }
  if (rA >= 0 && rB >= 0) { A[rA * N + rB] -= Yr; A[rB * N + rA] -= Yr; }

  // Top-right block: real equations, imaginary unknowns (-Yi)
  if (rA >= 0) A[rA * N + nc + rA] -= Yi;
  if (rB >= 0) A[rB * N + nc + rB] -= Yi;
  if (rA >= 0 && rB >= 0) { A[rA * N + nc + rB] += Yi; A[rB * N + nc + rA] += Yi; }

  // Bottom-left block: imag equations, real unknowns (+Yi)
  if (rA >= 0) A[(nc + rA) * N + rA] += Yi;
  if (rB >= 0) A[(nc + rB) * N + rB] += Yi;
  if (rA >= 0 && rB >= 0) { A[(nc + rA) * N + rB] -= Yi; A[(nc + rB) * N + rA] -= Yi; }

  // Bottom-right block: imaginary equations, imaginary unknowns (+Yr)
  if (rA >= 0) { A[(nc + rA) * N + nc + rA] += Yr; b[nc + rA] += ibImA; }
  if (rB >= 0) { A[(nc + rB) * N + nc + rB] += Yr; b[nc + rB] += ibImB; }
  if (rA >= 0 && rB >= 0) { A[(nc + rA) * N + nc + rB] -= Yr; A[(nc + rB) * N + nc + rA] -= Yr; }
}

export function acSweep(
  netlist: Netlist,
  probeNetId: number,
  fMin: number,
  fMax: number,
  numPoints: number,
): ACSweepPoint[] | null {
  const { elements, netCount } = netlist;
  const acElements = elements.filter((el) =>
    el.kind === 'resistor' || el.kind === 'capacitor' || el.kind === 'inductor' || el.kind === 'vsource'
  );
  const vsources = acElements.filter((el) => el.kind === 'vsource');

  if (vsources.length === 0) return null;
  if (numPoints <= 0 || fMin <= 0 || fMax <= 0) return [];

  const nonGnd = Math.max(0, netCount - 1);
  const nVs = vsources.length;
  const nc = nonGnd + nVs;
  const N = 2 * nc;
  const toRow = (id: number) => id - 1;
  const points: ACSweepPoint[] = [];
  const safeNumPoints = Math.max(1, Math.floor(numPoints));
  const logFMin = Math.log10(fMin);
  const logFMax = Math.log10(fMax);
  const logStep = safeNumPoints <= 1 ? 0 : (logFMax - logFMin) / (safeNumPoints - 1);

  for (let i = 0; i < safeNumPoints; i++) {
    const freq = Math.pow(10, logFMin + logStep * i);
    const omega = 2 * Math.PI * freq;

    const A = new Float64Array(N * N);
    const b = new Float64Array(N);

    for (const el of acElements) {
      if (el.kind === 'resistor') {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const yr = 1 / Math.max(el.value, 1e-9);
        stampComplex(A, b, N, nc, rA, rB, yr, 0, 0, 0, 0, 0);
        continue;
      }

      if (el.kind === 'capacitor') {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const yi = omega * el.value;
        stampComplex(A, b, N, nc, rA, rB, 0, yi, 0, 0, 0, 0);
        continue;
      }

      if (el.kind === 'inductor') {
        const rA = toRow(el.netA);
        const rB = toRow(el.netB);
        const l = Math.max(1e-12, el.value);
        const safeOmega = Math.max(1e-9, omega);
        const yi = -1 / (safeOmega * l);
        stampComplex(A, b, N, nc, rA, rB, 0, yi, 0, 0, 0, 0);
        continue;
      }

      const vsourceIndex = vsources.indexOf(el as typeof vsources[number]);
      if (vsourceIndex < 0) continue;
      const vsRow = nonGnd + vsourceIndex;
      const rA = el.netA > 0 ? toRow(el.netA) : -1;
      const rB = el.netB > 0 ? toRow(el.netB) : -1;

      if (rA >= 0) {
        A[rA * N + vsRow] += 1;
        A[vsRow * N + rA] += 1;
      }
      if (rB >= 0) {
        A[rB * N + vsRow] -= 1;
        A[vsRow * N + rB] -= 1;
      }
      b[vsRow] = el.value;

      const ivsRow = nc + vsRow;
      if (rA >= 0) {
        A[(nc + rA) * N + ivsRow] += 1;
        A[ivsRow * N + (nc + rA)] += 1;
      }
      if (rB >= 0) {
        A[(nc + rB) * N + ivsRow] -= 1;
        A[ivsRow * N + (nc + rB)] -= 1;
      }
      b[ivsRow] = 0;
    }

    b[nonGnd + 0] = 1;
    b[nc + nonGnd + 0] = 0;

    for (let r = 0; r < nonGnd; r++) {
      A[r * N + r] += 1e-9;
      A[(nc + r) * N + nc + r] += 1e-9;
    }

    const x = solve(A, b, N);
    if (!x) continue;

    const probeRow = probeNetId > 0 ? probeNetId - 1 : 0;
    if (probeRow < 0 || probeRow >= nonGnd) continue;

    const vr = x[probeRow];
    const vi = x[nc + probeRow];
    const mag = Math.sqrt(vr * vr + vi * vi);
    const gainDB = mag > 1e-20 ? 20 * Math.log10(mag) : -200;
    const phaseDeg = Math.atan2(vi, vr) * 180 / Math.PI;

    points.push({ freq, gainDB, phaseDeg });
  }

  return points;
}
