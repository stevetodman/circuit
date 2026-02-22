# SPEC: Circuit Naming — Name your circuit

Let users give their circuit a name. Shown in the browser tab and in a text input in the sidebar.
Persists in localStorage via the existing Zustand persist middleware.

## Read First
- `store/circuitStore.ts` — add circuitName here (read the full file first — understand zundo + persist)
- `components/sidebar/Sidebar.tsx` — add the name input here (read full file first)
- `app/page.tsx` — update `document.title` dynamically (read full file first)

## Part 1: Add circuitName to circuitStore

In `store/circuitStore.ts`, read the file first to understand the store structure.

Add to the interface:
```ts
circuitName: string;
setCircuitName: (name: string) => void;
```

Add to the initial state:
```ts
circuitName: '',
```

Add the action:
```ts
setCircuitName: (name) => set({ circuitName: name }),
```

In `loadFromJSON`, load the name from the circuit if available:
```ts
// Add inside loadFromJSON, after loading components/wires:
circuitName: (circuit as any).name ?? '',
```

The `saveToJSON` / export — check if the store has one. If so, include `name: get().circuitName`.

IMPORTANT: `setCircuitName` should NOT be wrapped in `zundo` temporal tracking (it's metadata, not topology). Read the file to understand how the temporal wrapper is structured and place it outside if possible. If the temporal wrapper wraps everything, putting it inside is fine — it won't cause issues.

## Part 2: Circuit name input in Sidebar

In `components/sidebar/Sidebar.tsx`, add a name input near the top of the sidebar content,
above the tab panel or just above the Export section (read the file to find the best location).

```tsx
const circuitName    = useCircuitStore((s) => s.circuitName);
const setCircuitName = useCircuitStore((s) => s.setCircuitName);
```

Add the input UI:
```tsx
<div className="px-3 pt-2 pb-1 border-b border-white/[0.06]">
  <input
    type="text"
    value={circuitName}
    onChange={(e) => setCircuitName(e.target.value)}
    placeholder="Untitled circuit"
    className="w-full bg-transparent text-white/70 text-[12px] font-medium
               placeholder:text-white/20 border-b border-white/[0.08]
               focus:border-white/20 focus:text-white/90 focus:outline-none
               py-0.5 transition-colors"
    maxLength={80}
  />
</div>
```

IMPORTANT: Use individual selectors for `circuitName` and `setCircuitName` (two separate `useCircuitStore` calls), NOT an inline object selector. Inline objects cause React 18 useSyncExternalStore infinite loops.

## Part 3: Dynamic page title

In `app/page.tsx`, read the file first to understand existing useEffects.

Add:
```tsx
const circuitName = useCircuitStore((state) => state.circuitName);

useEffect(() => {
  document.title = circuitName.trim()
    ? `${circuitName.trim()} — Circuit Sandbox`
    : 'Circuit Sandbox';
}, [circuitName]);
```

## Important notes
- Use INDIVIDUAL selectors everywhere (never inline objects)
- The `circuitName` will auto-persist because circuitStore already uses Zustand `persist` middleware — verify this by checking for `persist` in circuitStore.ts
- If circuitStore does NOT use persist, that's fine — the name will reset on page reload, which is acceptable
- Keep the input minimal — no submit button, no label, just the placeholder text "Untitled circuit"
- Do NOT touch canvas files, uiStore, or Toolbar

Run `pnpm build` — must pass with zero errors.
