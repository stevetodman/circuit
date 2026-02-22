# Codex Agent Spec: Simulation Models (Capacitor, BJT, 555, Motor)

Read ALL relevant files before writing code. Run `npx tsc --noEmit` after every file.

## Files to Read First

- `simulation/mna/MNASolver.ts`
- `simulation/mna/NetlistBuilder.ts`
- `simulation/workers/analog.worker.ts`
- `types/circuit.ts`
- `components/sidebar/PropertiesInspector.tsx`
- `store/circuitStore.ts`

---

## Goal

Four component types are currently electrical no-ops. Implement minimal but correct models for each.

---

## Model 1 — Capacitor (Backward Euler transient stepping)

The analog worker currently re-solves DC on every topology change (event-driven). For capacitors to work, we need time-stepping.

### `simulation/workers/analog.worker.ts`

Add a `setInterval` loop that runs at 1 kHz (every 1 ms) when the netlist has capacitors:

```typescript
const DT_MS = 1;
let intervalId: ReturnType<typeof setInterval> | null = null;

function startLoop() {
  if (intervalId) return;
  intervalId = setInterval(tick, DT_MS);
}
function stopLoop() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}
function tick() {
  if (!currentNetlist || !voltageView) return;
  const result = solveDC(currentNetlist, DT_MS / 1000, prevVoltages);
  if (result) {
    voltageView.set(result.voltages.subarray(0, MAX_NETS));
    prevVoltages = result.voltages;
    if (timestampView) timestampView[0] = performance.now();
    self.postMessage({ type: 'VOLTAGES_READY', singular: false });
  }
}
```

Store `currentNetlist` when UPDATE_NETLIST arrives. Start loop when netlist has capacitors; otherwise solve once and stop loop.

### `simulation/mna/NetlistBuilder.ts`

Add capacitor to the switch:

```typescript
case 'capacitor': {
  const netA = pinNet(comp, 'p1');
  const netB = pinNet(comp, 'p2');
  if (netA == null || netB == null || netA === netB) break;
  const C = typeof props.capacitance === 'number' ? props.capacitance : 1e-6;
  elements.push({ id: comp.id, kind: 'capacitor', netA, netB, value: C });
  break;
}
```

### `simulation/mna/MNASolver.ts`

Add `'capacitor'` to `NetlistElement` kind union. Add `dt?: number` and `prevVoltages?: Float32Array` parameters to `solveDC(netlist, dt?, prevVoltages?)`.

Capacitor stamp (Backward Euler companion model):
- Equivalent conductance: `G_eq = C / dt`  (when dt is defined)
- History current: `I_hist = G_eq * V_prev`
- Stamp as conductance (same as resistor with R = dt/C) + current source `I_hist`

When `dt` is undefined (DC case), treat capacitor as open circuit (skip).

---

## Model 2 — BJT NPN (Simplified Ebers-Moll)

### `simulation/mna/NetlistBuilder.ts`

```typescript
case 'bjt': {
  const netC = pinNet(comp, 'collector');
  const netB = pinNet(comp, 'base');
  const netE = pinNet(comp, 'emitter');
  if (netC == null || netB == null || netE == null) break;
  const hFE = typeof props.hFE === 'number' ? props.hFE : 100;
  elements.push({ id: comp.id, kind: 'bjt', netA: netC, netB: netB, netC: netE, value: hFE });
  break;
}
```

### `simulation/mna/MNASolver.ts`

Add `'bjt'` to kind union. Add `netC?: number` to `NetlistElement`.

BJT stamp (simplified NR-linearized at each iteration):
- V_BE = x[netB] - x[netE]
- I_BE = IS * (exp(V_BE / VT) - 1)  (Shockley, same as diode)
- I_C = hFE * I_BE
- Stamp base-emitter as diode. Stamp collector as current-controlled current source: add `hFE * g_diode` to G[netC][netB] and G[netC][netE].

Use `IS = 1e-14`, `VT = 0.02585`. Clamp V_BE to [-5, 0.7].

---

## Model 3 — 555 Timer (Behavioral astable)

A full 555 model is complex. Implement a behavioral model: it outputs a square wave at frequency determined by R1, R2, C.

### `types/circuit.ts`

The 555 component `props` will use: `r1` (resistance 1, default 1000), `r2` (resistance 2, default 1000), `capacitance` (default 1e-6).

### `simulation/workers/analog.worker.ts`

Add a software 555 behavioral model that runs in the tick loop:
- Compute astable frequency: `f = 1.44 / ((R1 + 2*R2) * C)`
- Each tick, compute phase; if phase > 0.5, output HIGH (Vcc) else LOW (0)
- Write the output pin voltage directly to `voltageView[outputNetId]`

This runs on the main tick loop rather than inside MNA — the 555 output is treated as a voltage source whose value changes over time.

Store 555 components separately in the worker; update their output voltage at each tick based on elapsed time.

---

## Model 4 — Motor (Resistive + back-EMF)

Simple model: motor = series resistor (winding resistance) with a back-EMF voltage source proportional to current.

### `simulation/mna/NetlistBuilder.ts`

```typescript
case 'motor': {
  const netA = pinNet(comp, 'p1');
  const netB = pinNet(comp, 'p2');
  if (netA == null || netB == null || netA === netB) break;
  // Model as 10Ω winding resistance
  elements.push({ id: comp.id, kind: 'resistor', netA, netB, value: 10 });
  break;
}
```

This is intentionally simple — at least the motor participates in circuit analysis.

---

## PropertiesInspector: Add missing prop defs

### `components/sidebar/PropertiesInspector.tsx`

Add entries to `PROP_DEFS` for:

```typescript
timer555: [
  { key: 'r1',          label: 'R1',          type: 'number', default: 1000,  min: 100,  max: 1e6,  step: 100,  unit: 'Ω' },
  { key: 'r2',          label: 'R2',          type: 'number', default: 1000,  min: 100,  max: 1e6,  step: 100,  unit: 'Ω' },
  { key: 'capacitance', label: 'Capacitance', type: 'number', default: 1e-6,  min: 1e-9, max: 1e-3, step: 1e-7, unit: 'F' },
],
motor: [
  { key: 'rpm',         label: 'Target RPM',  type: 'number', default: 1000,  min: 0,    max: 10000, step: 100, unit: 'RPM' },
],
tactileSwitch: [
  { key: 'normallyOpen', label: 'State',       type: 'number', default: 1, min: 0, max: 1, step: 1, unit: '' },
],
arduino: [
  { key: 'clockMhz',   label: 'Clock',        type: 'number', default: 16,   min: 1,    max: 20,   step: 1,   unit: 'MHz' },
],
```

---

## Verification

```bash
npx tsc --noEmit
pnpm build
```

Manual tests:
- Place a capacitor between power rails → no crash, solver runs
- Place a BJT → does not crash (may not visually do much yet)
- 555 component: properties panel shows R1, R2, capacitance fields
