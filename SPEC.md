# SPEC: P5.2 — AC Frequency Sweep / Bode Plot

Add an AC small-signal frequency sweep panel to the circuit simulator. Press `D` to open.
Run `npx tsc --noEmit` and confirm exit 0 before finishing.

---

## Overview

When the user opens the Bode Plot panel (`D` key), they pick a probe net from a dropdown and click "Run Sweep". The solver sweeps 1 Hz → 1 MHz (100 log-spaced points), computes gain (dB) and phase (°) at each frequency, then draws two stacked line charts: gain on top, phase on bottom.

**Only linear elements participate** in AC analysis: resistors, capacitors, inductors, voltage sources (batteries). Diodes, BJTs, MOSFETs, op-amps are skipped (their nonlinear nature requires full small-signal bias — out of scope here).

---

## Files to Create

### `simulation/mna/ACSolver.ts`

```ts
import type { Netlist } from './MNASolver';

export interface ACSweepPoint {
  freq: number;      // Hz
  gainDB: number;    // 20·log10(|Vout|), Vin = 1V AC
  phaseDeg: number;  // atan2(Im(Vout), Re(Vout)) · 180/π
}

export function acSweep(
  netlist: Netlist,
  probeNetId: number,
  fMin: number,     // e.g. 1
  fMax: number,     // e.g. 1e6
  numPoints: number, // e.g. 100
): ACSweepPoint[] | null
```

**Algorithm — 2n×2n real-valued complex MNA:**

For each log-spaced frequency f (n_pts points from fMin to fMax):

1. **Filter elements**: keep only `kind === 'resistor' | 'capacitor' | 'inductor' | 'vsource'` from `netlist.elements`. If no vsource exists, return null.

2. **Sizes**:
   ```
   omega = 2 * Math.PI * f
   nonGnd = netlist.netCount - 1          // indices 1..netCount-1
   nVs    = vsources.length
   nc     = nonGnd + nVs                  // complex unknowns count
   N      = 2 * nc                        // real matrix size (real + imag interleaved)
   toRow(id) = id - 1                     // netId → matrix row (0-based, excludes ground)
   ```

3. **Build N×N real matrix A and N-vector b (all zeros initially).**
   
   Represent: rows 0..nc-1 = "real part equations", rows nc..2nc-1 = "imaginary part equations".
   Columns 0..nc-1 = "real part unknowns", columns nc..2nc-1 = "imaginary part unknowns".

4. **Stamp resistors** (Y = 1/R, purely real):
   For resistor between nodes A, B, g = 1/Math.max(R, 1e-9):
   ```
   rA = toRow(netA), rB = toRow(netB)
   // Real block (top-left): stamp g
   stampReal(A, b, N, nc, rA, rB, g, 0, 0)
   // Imaginary block (bottom-right): stamp g (same)
   stampImag(A, b, N, nc, rA, rB, g, 0, 0)
   ```
   Where `stampReal` and `stampImag` are helpers that add/subtract g at appropriate 2×2 quadrant positions:
   ```ts
   function stampReal(A, b, N, nc, rA, rB, yr, ibAr, ibBr) {
     if (rA >= 0) { A[rA*N+rA] += yr; b[rA] += ibAr; }
     if (rB >= 0) { A[rB*N+rB] += yr; b[rB] += ibBr; }
     if (rA >= 0 && rB >= 0) { A[rA*N+rB] -= yr; A[rB*N+rA] -= yr; }
   }
   function stampImag(A, b, N, nc, rA, rB, yi, ibAi, ibBi) {
     const base = nc;
     if (rA >= 0) { A[(base+rA)*N+(base+rA)] += yi; b[base+rA] += ibAi; }
     if (rB >= 0) { A[(base+rB)*N+(base+rB)] += yi; b[base+rB] += ibBi; }
     if (rA >= 0 && rB >= 0) {
       A[(base+rA)*N+(base+rB)] -= yi;
       A[(base+rB)*N+(base+rA)] -= yi;
     }
   }
   ```
   
   But resistors are purely real (Yi = 0), so only stamp real block and imaginary block symmetrically.
   
   **Full 2×2 block stamp for admittance Y = Yr + j·Yi between nodes rA, rB:**
   ```ts
   function stampComplex(A: Float64Array, b: Float64Array, N: number, nc: number,
                         rA: number, rB: number,
                         Yr: number, Yi: number,
                         ibRe_A: number, ibRe_B: number,
                         ibIm_A: number, ibIm_B: number) {
     // Top-left block: real equations, real unknowns (+Yr)
     if (rA >= 0) { A[rA*N+rA] += Yr; b[rA] += ibRe_A; }
     if (rB >= 0) { A[rB*N+rB] += Yr; b[rB] += ibRe_B; }
     if (rA >= 0 && rB >= 0) { A[rA*N+rB] -= Yr; A[rB*N+rA] -= Yr; }
     // Top-right block: real equations, imaginary unknowns (-Yi)
     if (rA >= 0) A[rA*N+nc+rA] -= Yi;
     if (rB >= 0) A[rB*N+nc+rB] -= Yi;
     if (rA >= 0 && rB >= 0) { A[rA*N+nc+rB] += Yi; A[rB*N+nc+rA] += Yi; }
     // Bottom-left block: imaginary equations, real unknowns (+Yi)
     if (rA >= 0) A[(nc+rA)*N+rA] += Yi;
     if (rB >= 0) A[(nc+rB)*N+rB] += Yi;
     if (rA >= 0 && rB >= 0) { A[(nc+rA)*N+rB] -= Yi; A[(nc+rB)*N+rA] -= Yi; }
     // Bottom-right block: imaginary equations, imaginary unknowns (+Yr)
     if (rA >= 0) { A[(nc+rA)*N+nc+rA] += Yr; b[nc+rA] += ibIm_A; }
     if (rB >= 0) { A[(nc+rB)*N+nc+rB] += Yr; b[nc+rB] += ibIm_B; }
     if (rA >= 0 && rB >= 0) { A[(nc+rA)*N+nc+rB] -= Yr; A[(nc+rB)*N+nc+rA] -= Yr; }
   }
   ```

5. **Stamp each element**:
   - **Resistor**: Y = 1/R + j·0 → `stampComplex(rA, rB, 1/R, 0, 0,0,0,0)`
   - **Capacitor**: Y = 0 + j·ωC → `stampComplex(rA, rB, 0, omega*C, 0,0,0,0)`
   - **Inductor**: Y = 0 + j·(−1/(ωL)) → `stampComplex(rA, rB, 0, -1/(omega*L), 0,0,0,0)`
     (use `Math.max(1e-12, L)` for L, `Math.max(1e-9, omega)` for omega to avoid divide-by-zero)
   - **Voltage source** (index vi, row vsRow = nonGnd + vi):
     Stamp KVL row for both real and imaginary blocks.
     ```ts
     // Real block KVL row:
     const rA_v = el.netA > 0 ? toRow(el.netA) : -1;
     const rB_v = el.netB > 0 ? toRow(el.netB) : -1;
     if (rA_v >= 0) { A[rA_v*N+vsRow] += 1; A[vsRow*N+rA_v] += 1; }
     if (rB_v >= 0) { A[rB_v*N+vsRow] -= 1; A[vsRow*N+rB_v] -= 1; }
     b[vsRow] = el.value; // DC voltage = AC amplitude (1V excitation — see step 6)
     // Imaginary block KVL row (all zeros; pure real voltage source):
     const ivsRow = nc + vsRow;
     if (rA_v >= 0) { A[(nc+rA_v)*N+ivsRow] += 1; A[ivsRow*N+(nc+rA_v)] += 1; }
     if (rB_v >= 0) { A[(nc+rB_v)*N+ivsRow] -= 1; A[ivsRow*N+(nc+rB_v)] -= 1; }
     b[ivsRow] = 0; // imaginary part of voltage = 0
     ```

6. **Override vsource[0] amplitude to 1V** (AC excitation = 1V regardless of circuit's battery voltage):
   ```ts
   b[nonGnd + 0] = 1.0;  // real part of excitation = 1V
   b[nc + nonGnd + 0] = 0; // imaginary part = 0
   ```

7. **Gmin**: Add 1e-9 to diagonal of both real blocks (rows 0..nonGnd-1 and nc..nc+nonGnd-1).

8. **Solve** using Gaussian elimination (copy the `solve` function from MNASolver.ts verbatim — it's a generic real-valued solver). If no solution, skip this frequency point.

9. **Extract probe voltage**:
   ```ts
   const pr = probeNetId > 0 ? probeNetId - 1 : 0;
   const vr = x[pr];         // real part
   const vi = x[nc + pr];    // imaginary part
   const mag = Math.sqrt(vr*vr + vi*vi);
   const gainDB = mag > 1e-20 ? 20 * Math.log10(mag) : -200;
   const phaseDeg = Math.atan2(vi, vr) * 180 / Math.PI;
   ```

10. Return the array of `{ freq, gainDB, phaseDeg }`.

**Include the `solve()` function** (copy verbatim from MNASolver.ts — Gaussian elimination with partial pivoting) since it's not exported.

---

### `store/bodeStore.ts`

```ts
import { create } from 'zustand';

export interface ACSweepPoint {
  freq: number;
  gainDB: number;
  phaseDeg: number;
}

interface BodeStore {
  open: boolean;
  probeNetId: number | null;
  fMin: number;           // default 1
  fMax: number;           // default 1e6
  numPoints: number;      // default 100
  result: ACSweepPoint[] | null;
  isRunning: boolean;
  toggle: () => void;
  close: () => void;
  setProbeNetId: (id: number | null) => void;
  setFreqRange: (fMin: number, fMax: number) => void;
  setResult: (r: ACSweepPoint[] | null) => void;
  setRunning: (v: boolean) => void;
}

export const useBodeStore = create<BodeStore>((set) => ({
  open: false,
  probeNetId: null,
  fMin: 1,
  fMax: 1e6,
  numPoints: 100,
  result: null,
  isRunning: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  setProbeNetId: (id) => set({ probeNetId: id }),
  setFreqRange: (fMin, fMax) => set({ fMin, fMax }),
  setResult: (result) => set({ result }),
  setRunning: (isRunning) => set({ isRunning }),
}));
```

---

### `features/bode/BodePlot.tsx`

React overlay component (not R3F, plain DOM). Positioned `fixed` over the canvas area.

**Structure:**
```tsx
'use client';
import { useRef, useEffect } from 'react';
import { useBodeStore } from '@/store/bodeStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { buildNetlist } from '@/simulation/mna/NetlistBuilder';
import { acSweep } from '@/simulation/mna/ACSolver';

export default function BodePlot() {
  const { open, probeNetId, fMin, fMax, numPoints, result, isRunning,
          close, setProbeNetId, setFreqRange, setResult, setRunning } = useBodeStore();
  const gainCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement>(null);

  // Get available nets for the probe selector
  const { nodes, components, wires } = useCircuitStore(
    useShallow(s => ({ nodes: s.nodes, components: s.components, wires: s.wires }))
  );

  // Run the sweep when user clicks "Run"
  const runSweep = () => {
    if (probeNetId === null) return;
    setRunning(true);
    // Build netlist from circuit
    const netlist = buildNetlist(nodes, components, wires);
    // Run in next tick to allow UI to update
    setTimeout(() => {
      const r = acSweep(netlist, probeNetId, fMin, fMax, numPoints);
      setResult(r);
      setRunning(false);
    }, 0);
  };
  
  // Draw gain chart
  useEffect(() => {
    if (!result || !gainCanvasRef.current) return;
    drawGainChart(gainCanvasRef.current, result);
  }, [result]);
  
  // Draw phase chart  
  useEffect(() => {
    if (!result || !phaseCanvasRef.current) return;
    drawPhaseChart(phaseCanvasRef.current, result);
  }, [result]);

  if (!open) return null;
  // ... render panel
}
```

**Panel layout** (fixed, top-right area, ~420px wide):
```
┌─────────────────────────────────┐
│ ≈ Bode Plot              [✕]    │
├─────────────────────────────────┤
│ Probe: [Net 2 ▼]  [Run Sweep]  │
│ Range: [1Hz–1MHz ▼]            │
├─────────────────────────────────┤
│  Gain (dB)                      │
│  [canvas 400×140px]             │
├─────────────────────────────────┤
│  Phase (°)                      │
│  [canvas 400×120px]             │
└─────────────────────────────────┘
```

**Net selector** — build from runNetAnalysis or use `useSab` to identify active nets. Simplest: pull the `sab` from uiStore and read non-zero voltages, OR just enumerate all unique netIds from `nodes` array (from `circuitStore`). Show them as "Net {id}" in dropdown.

Actually, use `useCircuitStore` to get nodes and show their netIds. Nodes already have netId assigned after `runNetAnalysis`. Map: `Array.from(new Set(nodes.map(n => n.netId).filter(id => id !== null && id > 0)))`.

**Freq range presets** (dropdown):
- "1 Hz – 1 kHz": fMin=1, fMax=1000
- "1 Hz – 1 MHz" (default): fMin=1, fMax=1e6
- "1 kHz – 1 MHz": fMin=1000, fMax=1e6
- "1 kHz – 100 MHz": fMin=1000, fMax=1e8

**Chart drawing** (HTML Canvas 2D API):

`drawGainChart(canvas, points)`:
- Background: `#0d0d10`
- Grid lines: 5–7 horizontal (every 20 dB), vertical at decades (1, 10, 100, 1k, 10k, 100k, 1M Hz)
- Auto-scale Y: min/max of gainDB with 10 dB padding
- X axis: log scale — map freq to pixel: `px = (Math.log10(f) - Math.log10(fMin)) / (Math.log10(fMax) - Math.log10(fMin)) * width`
- Line: `#7c6fff` (violet), 1.5px width
- Labels: Y axis in dB, X axis in Hz/kHz/MHz

`drawPhaseChart(canvas, points)`:
- Same X axis logic
- Y axis: fixed -180° to +180°, gridlines at ±90°, 0°
- Line: `#00b4d8` (teal), 1.5px width

**Styling** — dark panel matching oscilloscope style:
```
background: #0d0d10
border: 1px solid rgba(255,255,255,0.1)
border-radius: 8px
padding: 12px
color: rgba(255,255,255,0.7)
font-size: 11px
font-family: ui-monospace, monospace
```

Position: `fixed`, `top: 48px` (below toolbar), `right: 12px`.

---

## Changes to Existing Files

### `components/KeyboardShortcuts.tsx`

Add `D` key handler to toggle Bode plot:
```ts
import { useBodeStore } from '@/store/bodeStore';
// Inside the keydown handler, add:
if (e.key === 'd' || e.key === 'D') {
  if (!e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    useBodeStore.getState().toggle();
  }
}
```
Place alongside the existing `S` / `O` / `H` key handlers (same pattern).

### `app/page.tsx`

Add BodePlot import (dynamic, ssr:false since it uses canvas):
```ts
const BodePlot = dynamic(() => import('@/features/bode/BodePlot'), { ssr: false });
```
Render `<BodePlot />` alongside `<SchematicView />` and `<Oscilloscope />`.

### `components/Toolbar.tsx`

Add a "≈ Bode" button after the "S Schematic" button:
```tsx
import { useBodeStore } from '@/store/bodeStore';
// In the component:
const bodeOpen = useBodeStore((s) => s.open);
const toggleBode = useBodeStore((s) => s.toggle);
// Button:
<ToolbarBtn onClick={toggleBode} title="Bode Plot (D)" active={bodeOpen} kbd="D">
  ≈ Bode
</ToolbarBtn>
```

---

## NetlistBuilder import

`buildNetlist` does not currently exist as a standalone export. Look at how `analog.worker.ts` calls `NetlistBuilder`. In `simulation/mna/NetlistBuilder.ts`, the main export is:
```ts
export function buildNetlist(nodes: ..., components: ..., wires: ...): Netlist
```
Use this signature. Check the actual export in `NetlistBuilder.ts` and import accordingly. The Netlist type is exported from `MNASolver.ts`.

---

## Type-check

```bash
npx tsc --noEmit
```
Exit 0 required. No console.log. No TODOs.
