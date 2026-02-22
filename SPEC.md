# SPEC: New Circuit Button

Add a "New Circuit" button that clears the board after confirmation.
Beginners currently have no way to start fresh without deleting everything manually.

## Read First
- `components/sidebar/Sidebar.tsx` — where to add the button (above ExportPanel)
- `store/circuitStore.ts` — look for a `clearAll` or `resetCircuit` action; check what `loadFromJSON` does
- `app/page.tsx` — check if there's any "new circuit" logic already

## What to build

### Part 1: Add `newCircuit()` action to circuitStore
In `store/circuitStore.ts`, add a `newCircuit()` method to the store interface and implementation:
```ts
newCircuit: () => void;
```
Implementation: reset to empty state
```ts
newCircuit() {
  set({ nodes: {}, components: {}, wires: [], circuitName: '', selectedComponentId: null, selectedComponentIds: [], selectedNodeId: null, wiringMode: false });
  clearUndoHistory();
},
```

### Part 2: Add the button to Sidebar.tsx

In `Sidebar.tsx`, above the `<ExportPanel />` section, add a "New Circuit" button with an inline confirmation flow:
- Default state: button labeled "＋ New Circuit" with style `w-full py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/5 rounded transition-colors border border-dashed border-white/10 hover:border-white/20`
- When clicked: show a confirmation inline (replace the button with two small buttons):
  - "Clear board?" label + "Confirm" button (red-tinted) + "Cancel" button
  - On Confirm: call `useCircuitStore.getState().newCircuit()`; reset confirmation state
  - On Cancel: reset confirmation state

Use a local `useState<boolean>` for the confirmation state — no store changes needed.

```tsx
const [confirming, setConfirming] = useState(false);
const newCircuit = useCircuitStore(s => s.newCircuit);
```

Layout when confirming:
```tsx
<div className="flex items-center gap-2 px-1 py-1">
  <span className="text-[11px] text-white/50 flex-1">Clear board?</span>
  <button onClick={() => { newCircuit(); setConfirming(false); }}
    className="text-[11px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 hover:bg-red-800/50">
    Confirm
  </button>
  <button onClick={() => setConfirming(false)}
    className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-white/50 hover:bg-white/10">
    Cancel
  </button>
</div>
```

## Zustand selector pattern (CRITICAL)
Always use individual selectors — NEVER inline objects:
```tsx
// CORRECT:
const newCircuit = useCircuitStore(s => s.newCircuit);

// WRONG (causes infinite render loop in React 18):
const { newCircuit } = useCircuitStore(s => ({ newCircuit: s.newCircuit }));
```

## Important
- Files to modify: `store/circuitStore.ts`, `components/sidebar/Sidebar.tsx`
- Do NOT use window.confirm() — use the inline confirmation pattern above
- Do NOT modify uiStore, Toolbar, or KeyboardShortcuts
- Run `pnpm build` — must pass with zero TypeScript errors
