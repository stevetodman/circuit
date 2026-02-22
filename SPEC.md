# SPEC: Oscilloscope Freeze / Pause

Add a ⏸/▶ freeze toggle to the oscilloscope so users can pause the waveform display and inspect a captured snapshot.

## Read First
- `store/scopeStore.ts` — add `frozen` + `toggleFrozen`
- `features/oscilloscope/Oscilloscope.tsx` — add freeze button; gate RAF loop on `frozen`

## Part 1: scopeStore.ts — add frozen state

Add to the interface and initial state:
```ts
frozen: boolean;
toggleFrozen: () => void;
```
Initial: `frozen: false`. Action: `toggleFrozen: () => set((s) => ({ frozen: !s.frozen }))`.

## Part 2: Oscilloscope.tsx — pause the render loop when frozen

Read the existing `useEffect` that starts the `window.requestAnimationFrame(render)` loop (the one that depends on `[open]`).

Import `frozen` and `toggleFrozen` from `useScopeStore`:
```tsx
const frozen = useScopeStore((s) => s.frozen);
const toggleFrozen = useScopeStore((s) => s.toggleFrozen);
```

Add `frozen` to the useEffect dependency array. At the very top of the effect body, before starting the RAF loop, bail out if frozen:
```tsx
if (frozen) return; // leave canvas as-is when paused
```

This means when the user hits ⏸, `frozen` becomes true, the effect re-runs, bails immediately (no new RAF loop started), and the canvas stays frozen at whatever frame it last rendered.

## Part 3: Oscilloscope.tsx — freeze button in the top-right controls

In the top-right control row (the `div` containing Auto, +, ✕ all, × buttons), add a freeze button **before** the existing `Auto` button:

```tsx
<button
  onClick={toggleFrozen}
  className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
    frozen
      ? 'border-amber-400/60 text-amber-300'
      : 'border-white/20 text-white/65 hover:text-white/90'
  }`}
  title={frozen ? 'Resume (▶)' : 'Freeze waveform (⏸)'}
>
  {frozen ? '▶' : '⏸'}
</button>
```

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const frozen = useScopeStore(s => s.frozen);       // CORRECT
const { frozen } = useScopeStore(s => ({ ... }));  // WRONG — crash
```

## Important
- Files: `store/scopeStore.ts`, `features/oscilloscope/Oscilloscope.tsx`
- When frozen, the canvas keeps showing the last rendered frame (no clearing, no redraw)
- Run `pnpm build` — must pass with zero TypeScript errors
