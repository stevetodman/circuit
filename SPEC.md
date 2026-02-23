# SPEC: Fix Zener Diode Reverse Breakdown Model

## Problem
In `simulation/mna/NetlistBuilder.ts`, the zener diode is modelled as two back-to-back
Shockley diodes:
```ts
elements.push({ id: `${comp.id}-fwd`, kind: 'diode', netA, netB, value: 0.7 }); // forward
elements.push({ id: `${comp.id}-rev`, kind: 'diode', netA: netB, netB: netA, value: Vz }); // broken
```
The reverse element passes `value: Vz` (breakdown voltage, e.g. 5.1V), but MNASolver treats
`value` as the forward threshold of the Shockley model. MNASolver clamps Vd to `VD_MAX = 1.2V`
in `MNASolver.ts`, so the reverse diode never conducts at the correct breakdown voltage.

## Solution

### Step 1: Add `kind: 'zener'` to NetlistElement in `simulation/mna/MNASolver.ts`
In the `NetlistElement` discriminated union, add:
```ts
| { kind: 'zener'; id: string; netA: number; netB: number; value: number } // value = breakdown voltage Vz
```

### Step 2: Handle `kind: 'zener'` in MNASolver
In the Newton-Raphson diode stamping loop (where `el.kind === 'diode'` is handled), add a parallel
branch for `el.kind === 'zener'`:

A zener in reverse bias conducts when `V_cathode - V_anode > Vz`. Model it as:
- In forward bias (Vak > 0): standard Shockley with Vf = 0.7V (like a normal diode)
- In reverse bias (Vak < 0): Shockley with Vf = Vz but with netA/netB swapped

Concretely, in the NR loop:
```ts
} else if (el.kind === 'zener') {
  // Forward: standard diode behaviour (Vf = 0.7)
  const Vak_fwd = (nodeVoltage(el.netA) - nodeVoltage(el.netB));
  // ... stamp forward Shockley with value 0.7, same as kind:'diode'

  // Reverse breakdown: diode from netB→netA with Vf = Vz
  const Vak_rev = (nodeVoltage(el.netB) - nodeVoltage(el.netA));
  // ... stamp reverse Shockley with value Vz, same equations but netA/netB swapped
}
```

Look at the existing `kind: 'diode'` stamping code and duplicate it for zener,
once forward (netA→netB, threshold 0.7) and once reverse (netB→netA, threshold Vz).

### Step 3: Update `NetlistBuilder.ts` — zener case
Change:
```ts
elements.push({ id: `${comp.id}-rev`, kind: 'diode', netA: netB, netB: netA, value: Vz });
```
To:
```ts
elements.push({ id: `${comp.id}-rev`, kind: 'zener', netA, netB, value: Vz });
```
(The single `kind: 'zener'` element handles both forward and reverse — remove the separate forward push too, or keep both: zener handles breakdown, forward 'diode' handles forward conduction. The simplest correct approach: one `kind: 'zener'` element that internally handles both directions.)

## Simplest Correct Approach
Replace both diode pushes for zener with one:
```ts
elements.push({ id: comp.id, kind: 'zener', netA, netB, value: Vz });
```
And in MNASolver, `kind: 'zener'` stamps TWO contributions per iteration:
1. Forward Shockley (netA→netB, Vf=0.7)
2. Reverse Shockley (netB→netA, Vf=Vz)

## Files to Change
- `simulation/mna/MNASolver.ts` — add zener to NetlistElement type + NR stamping
- `simulation/mna/NetlistBuilder.ts` — change zener case to use kind:'zener'

## What NOT to do
- Do NOT change how regular diodes/LEDs work
- Do NOT change schottky handling
- Only these 2 simulation files
