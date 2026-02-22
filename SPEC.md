# SPEC: Module-Linked Example Circuits

Add example circuits for all 11 guided modules, so each module can auto-load a relevant starting point.

## Read These Files First

- `features/examples/circuits.ts` — existing example circuits format
- `features/modules/definitions.ts` — the 11 module definitions with their `autoLoadId` fields
- `types/circuit.ts` — PlacedComponent, Wire, Node types

## Task

In `features/examples/circuits.ts`, add new example circuits that map to the module `autoLoadId` values.

Look at the existing example circuits to understand the format (nodes, components, wires arrays).

The module definitions use these `autoLoadId` values (add circuits for each):
1. Module "hello-electricity" — `autoLoadId: 'battery-only'`
   - Just a 9V battery placed at columns 25-26
   
2. Module "complete-circle" — `autoLoadId: 'battery-resistor'`  
   - Battery + 220Ω resistor wired in a loop
   
3. Module "first-led" — `autoLoadId: 'battery-led-resistor'`
   - Battery + 220Ω resistor + red LED wired correctly
   
4. Module "bodyguard" — `autoLoadId: 'ohms-law-demo'`
   - Battery + resistor + LED (same as first-led but with different resistor value)
   
5. Modules 5-11 — only add circuits where the `autoLoadId` is set in definitions.ts
   Read definitions.ts to see which modules have `autoLoadId` and what values they use.

## Circuit Format

Each circuit should be a valid `ExampleCircuit` object:
```typescript
{
  id: 'battery-only',
  name: 'Battery Only',
  description: 'Single 9V battery',
  circuit: {
    components: [...],
    nodes: {},
    wires: []
  }
}
```

To understand node IDs: breadboard main grid is `bb-{row}{col}` where rows are `a-j` and cols are `1-63`. Power rails are `bb-tp-{n}` (top positive) and `bb-tn-{n}` (top negative).

Look at the existing blink/voltage-divider/RC examples to understand the exact JSON structure for components, pins (each component has pin definitions), and wires.

Keep circuits minimal — just what the student needs to see the concept, not a complete solution.

Run `pnpm build` — must pass with zero errors.
