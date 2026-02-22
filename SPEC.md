# SPEC: P0.2 Drag Affordance + P0.3 Load Guard + F2.4 Cancel Feedback

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.

## Problems to Fix

### P0.2 — Drag Affordance on Palette Tiles
ComponentTile buttons show no drag cursor. Users don't know they're draggable.

### P0.3 — Load Guard
`ExampleLoader.tsx` uses `window.confirm()` which is a bare browser dialog.
Also: `circuitStore.ts` has a `loadFromJSON` method. There should also be a guard
when loading from examples if the board isn't empty.

### F2.4 — Cancel Feedback During Drag
When a component is being dragged (dragStore.dragging === true), there is no
visual indication that pressing Escape will cancel the placement. A subtle hint
near the canvas would help. The best place is the StatusBar's mode row.

## Files to Change

### `components/sidebar/ComponentTile.tsx`
Read this file first. On the tile's `<button>` element:
- Add `cursor-grab active:cursor-grabbing` CSS classes
- If the button already has an `onClick` handler that calls `startDrag(...)`,
  also add a `title` attribute: `title="Drag to place, or click to begin placement"`
- Add `draggable={false}` to prevent accidental HTML5 drag behavior

### `components/sidebar/Sidebar.tsx`
The Wire tile calls `addToast(...)` on click. Leave that as is.

### `features/examples/ExampleLoader.tsx`
Replace the `window.confirm(...)` call with a two-step inline confirm:

```
When user selects an example AND hasContent is true:
1. Set a local state `pendingIndex` instead of loading immediately
2. Show a small inline warning div BELOW the select:
   "This will replace your current circuit."
   with two buttons: [Cancel] [Load anyway]
3. On "Load anyway" → proceed with loading and clear pendingIndex
4. On "Cancel" → clear pendingIndex and reset selectedIndex to ''
5. If hasContent is false → load immediately as before
```

The inline warning should use classes like:
```
mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300
```
Buttons:
- Cancel: `px-2 py-1 rounded text-[10px] text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10`
- Load anyway: `px-2 py-1 rounded text-[10px] text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 font-semibold`

### `components/sidebar/StatusBar.tsx`
In the mode chip row, when `dragging` is true, add a subtle hint after the ModeChip:
```tsx
{dragging && (
  <span className="text-[9px] text-white/30 font-mono ml-1">Esc to cancel</span>
)}
```
`dragging` is already computed in StatusBar via `useDragStore((s) => s.dragging)`.

## Rules
- Do NOT use window.confirm, window.alert, or window.prompt anywhere
- Do NOT change any simulation or store logic
- Run `pnpm build` at the end and fix any TypeScript errors
