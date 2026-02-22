# SPEC: Net Glow — Hovered Net Wire Highlight

When the user hovers a pin on the breadboard, all wires on the same net glow brighter.

## Read First
- `components/canvas/Wire.tsx` — look for the `useFrame` callback that sets `matRef.current.emissiveIntensity`. Currently it's `0.06 + 0.14 * pulse` for normal wires.
- `store/uiStore.ts` — look for `hoveredNodeId: string | null`.
- `store/circuitStore.ts` — look for `nodes: Record<string, { netId: number | null, ... }>`.

## Implementation — Wire.tsx only (no store changes needed)

At the top of the `Wire` component function, after the existing `fromNetId` selector, add two more selectors:

```tsx
const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
const hoveredNetId  = useCircuitStore((s) =>
  hoveredNodeId ? (s.nodes[hoveredNodeId]?.netId ?? -1) : -1
);
```

In the `useFrame` callback, after computing `pulse` and before the overload check, determine if this wire's net is hovered:

```tsx
const isNetHovered = hoveredNetId >= 0 && fromNetId === hoveredNetId;
```

Then at the point where `emissiveIntensity` is assigned (the final assignment before the frame ends, NOT inside the overload branch), replace the existing assignment:

```tsx
// OLD:
matRef.current.emissiveIntensity = 0.06 + 0.14 * pulse;

// NEW:
matRef.current.emissiveIntensity = isNetHovered
  ? 0.35 + 0.20 * pulse   // hovered net: much brighter glow
  : 0.06 + 0.14 * pulse;  // normal
```

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const hoveredNodeId = useUIStore(s => s.hoveredNodeId);    // CORRECT
const hoveredNetId = useCircuitStore(s => ...);             // CORRECT (separate line)
```

## Important
- File: `components/canvas/Wire.tsx` only — no store changes needed
- The overload path already sets its own color and emissive values and returns early — do NOT change it; the net-glow only applies to the normal (non-overloaded) path
- The `fromNetId` variable already exists in Wire.tsx; use it for the net comparison
- `hoveredNetId` must be `>= 0` before comparing (netId -1 means unconnected)
- Run `pnpm build` — must pass with zero TypeScript errors
