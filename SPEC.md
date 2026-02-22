# SPEC: Module Auto-Load + Health Checker False Positive Fix

Two small fixes. Read each file fully before editing.

## Fix 1: Health Checker False Positive

File: `components/SimController.tsx`

The health checker currently fires "No current flowing" even when the canvas has 0 or 1 components.

Find the health check logic (checks at most every 3s, looks for all-zero voltages).

Change the "no complete circuit" check:
- BEFORE: `components >= 2 && battery exists && all voltages near 0`
- AFTER: `components >= 3 && battery exists && led exists && all voltages near 0`

The minimum meaningful circuit is: battery + resistor + LED. Require at least 3 components total AND a battery AND an LED before firing this warning. This eliminates the false positive on empty canvas and on partially-built circuits.

Also: the "floating pin" check should only fire if there are >= 2 components placed.

## Fix 2: Auto-Load Circuit When Starting a Module

File: `store/moduleStore.ts` and `app/page.tsx`

When `startModule(id)` is called, if the module has an `autoLoadId` field, load that circuit.

### How example circuits are loaded

In `app/page.tsx`, look for how the example loader works. The `EXAMPLE_CIRCUITS` array from `features/examples/circuits.ts` is used. Circuits are loaded via `useCircuitStore.getState().loadFromJSON(circuit)`.

### Changes to moduleStore.ts

The `startModule` action currently just sets state. Change it to also accept a callback or use a side effect to trigger circuit loading.

Actually, the cleaner approach: in `app/page.tsx`, watch `activeModuleId` changes and trigger the circuit load there.

Add to `app/page.tsx`:
```tsx
// In the Home component, after the module store imports:
const activeModuleId = useModuleStore((s) => s.activeModuleId);

// In a useEffect:
useEffect(() => {
  if (!activeModuleId) return;
  const mod = MODULES.find((m) => m.id === activeModuleId);
  if (!mod?.autoLoadId) return;
  const circuit = EXAMPLE_CIRCUITS.find((c) => c.id === mod.autoLoadId);
  if (circuit) {
    useCircuitStore.getState().loadFromJSON(circuit.circuit);
  }
}, [activeModuleId]);
```

Make sure to import `MODULES` from `@/features/modules/definitions` and `EXAMPLE_CIRCUITS` from `@/features/examples/circuits`.

Also import `useModuleStore` from `@/store/moduleStore`.

Read `app/page.tsx` fully to see existing imports and where to add this.
Read `features/examples/circuits.ts` to check the `id` field exists on each example.

Run `pnpm build` — must pass with zero errors.
