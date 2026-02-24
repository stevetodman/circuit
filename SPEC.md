<<<<<<< HEAD
# SPEC

This file is used by Codex agents during feature implementation sprints.
It is overwritten per-sprint and conflicts are always resolved with `git checkout --ours SPEC.md`.

See `CLAUDE.md` for architecture, patterns, and implementation guidance.
See `memory/MEMORY.md` for sprint history and roadmap progress.
=======
# SPEC: Paste-at-Cursor + Canvas Context Menu Improvements (p9.b)

## Goal
1. Right-click empty canvas → "Paste here" places clipboard at the clicked world position
2. The existing canvas context menu (CanvasContextMenu.tsx) shows recently-used parts at the cursor
3. Count badge in CanvasSearch shows "X of Y" when filtering

## Acceptance Criteria
1. Right-clicking empty canvas (no component under cursor) shows context menu with:
   - "Paste here" item (only if clipboard has components)
   - 5 recently-used component types (same as current)
   - A tiny search field to filter components
2. "Paste here" places the clipboard contents with the anchor at the clicked world position (not +5 cols from original)
3. CanvasSearch shows result count: "3 of 12" when query is non-empty
4. CanvasSearch search-by-designator already works (done directly) — just make sure it's not regressed

## Current State
- `CanvasContextMenu.tsx` already exists (added in p1.4 sprint)
- `circuitStore.pasteClipboard(offsetCols?)` pastes with a column offset — needs `pasteClipboardAt(worldPos)` variant
- `uiStore.canvasMenu: { x, y, worldPos } | null` already holds the world position of right-click

## Implementation

### 1. `store/circuitStore.ts`
Add `pasteClipboardAt(worldPos: Vec3): void`:
```ts
pasteClipboardAt(worldPos) {
  const clipboard = componentClipboard;
  if (!clipboard || clipboard.length === 0) return;
  // Find anchor: use first clipboard item's anchorPos as origin
  const anchorOrigin = clipboard[0].anchorPos;
  set((state) => {
    const components = { ...state.components };
    const nodes = { ...state.nodes };
    const pasted: string[] = [];
    for (const tmpl of clipboard) {
      const id = crypto.randomUUID();
      const dx = tmpl.anchorPos[0] - anchorOrigin[0];
      const dz = tmpl.anchorPos[2] - anchorOrigin[2];
      const anchorPos: Vec3 = [worldPos[0] + dx, worldPos[1], worldPos[2] + dz];
      components[id] = {
        id,
        type: tmpl.type,
        anchorPos,
        rotationY: tmpl.rotationY,
        pins: clonePinsForPaste(tmpl, anchorPos, state.nodes),
        props: { ...tmpl.props },
      } as PlacedComponent;
      pasted.push(id);
    }
    const newNodes = runNetAnalysis(state.nodes, state.wires, components);
    return { components, nodes: newNodes, selectedComponentId: pasted[0] ?? null, selectedComponentIds: pasted };
  });
},
```

NOTE: `componentClipboard` is a module-level variable (not in state) — access it directly inside the function body. `clonePinsForPaste` is already defined in the file.

### 2. `components/CanvasContextMenu.tsx`
Find the existing canvas context menu. Add a "Paste here" button above the part tiles:
```tsx
const pasteClipboardAt = useCircuitStore((s) => s.pasteClipboardAt);
const clipboardLength = useCircuitStore((s) => s.clipboardLength);
const canvasMenu = useUIStore((s) => s.canvasMenu);
```

Render a "Paste" button at the top when `clipboardLength > 0`:
```tsx
{clipboardLength > 0 && canvasMenu?.worldPos && (
  <button
    className="w-full text-left text-[12px] text-white/80 hover:bg-white/[0.08] px-2 py-1.5 rounded"
    onClick={() => {
      if (canvasMenu.worldPos) {
        pasteClipboardAt([canvasMenu.worldPos.x, 0, canvasMenu.worldPos.z] as Vec3);
      }
      closeCanvasMenu();
    }}
  >
    Paste here
    <kbd className="ml-1.5 text-[9px] text-white/30">⌘V</kbd>
  </button>
)}
```

### 3. `components/CanvasSearch.tsx`
Add a result count display after the search input:
```tsx
{normalizedQuery && results.length > 0 && (
  <span className="text-[10px] text-white/30 ml-2">
    {results.length} of {allComponents.length}
  </span>
)}
```
Place this inline in the search input row.

## Type Safety Notes
- `worldPos` in `canvasMenu` — check the existing `canvasMenu` type in uiStore; it might be `{ x: number; y: number; worldPos?: { x: number; z: number } }` — use optional chaining
- `[worldPos.x, 0, worldPos.z] as Vec3` — explicit cast required
- `clonePinsForPaste` — already in scope in circuitStore.ts (defined earlier in file)
- `componentClipboard` — module-level `let` variable, accessible in store methods

## Verify
Run `pnpm build` — must pass with zero type errors.
>>>>>>> e2b98b9 (feat: paste-at-cursor + canvas context menu + search result count)
