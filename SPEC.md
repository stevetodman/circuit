# SPEC: Fix Inductor DC Analysis Mode

## Problem
In `simulation/mna/MNASolver.ts`, when `dt === undefined` (DC operating point solve),
inductors use a hardcoded companion model with `dt = 0.001`:

```ts
} else {
  for (const el of inductors) {
    const geq = 1 / 0.001;  // ← WRONG: hardcoded 1ms timestep
    stamp2(G, b, n, rA, rB, geq, 0, 0);
  }
}
```

In DC analysis, inductors are ideal shorts (zero resistance). The hardcoded `geq = 1/0.001 = 1000 S`
gives 1mΩ effective resistance, which is close but not correct — and can cause numerical issues
for pure-inductor circuits (inductor + battery with no capacitors).

## Fix

In `simulation/mna/MNASolver.ts`, find the DC inductor stamping (the `} else {` branch
that runs when `dt === undefined`) and change to:

```ts
} else {
  // DC analysis: inductor is ideal short circuit
  for (const el of inductors) {
    const rA = toRow(el.netA);
    const rB = toRow(el.netB);
    // Use very large conductance (near-ideal short)
    const geq = 1e9;
    stamp2(G, b, n, rA, rB, geq, 0, 0);
  }
}
```

`1e9 S` (1 nΩ resistance) is effectively a short for any practical circuit while avoiding
a true 0-ohm stamp that could cause division issues.

## Files to Change
- `simulation/mna/MNASolver.ts` only — find the DC inductor branch and change `1 / 0.001` to `1e9`

## What NOT to do
- Do NOT change the transient inductor model (the `if (dt !== undefined)` branch) — that stays as-is
- Do NOT change capacitor handling
- Only 1 file, 1 line change
