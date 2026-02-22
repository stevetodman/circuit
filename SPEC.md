# SPEC: Wire Right-Click Context Menu

## Goal
Add a right-click context menu on wires that lets users delete a wire or
change its color.

## Current State
- `store/uiStore.ts` already has `wireMenu: { wireId, x, y } | null` state
- `store/uiStore.ts` already has `openWireMenu(wireId, x, y)` and `closeWireMenu()` actions
- `components/canvas/Wire.tsx` renders CatmullRomCurve3 tubes with click handling
- `components/ContextMenu.tsx` handles component right-click — nothing handles wire right-click
- Wire color is stored in `circuitStore.wires[id].color`
- No UI exists to delete or recolor individual wires

## Changes Required

### `components/canvas/Wire.tsx`
Read the file to understand the existing mesh/click structure.
Add `onContextMenu` to the tube mesh (the same object that handles `onClick`):
```tsx
onContextMenu={(e) => {
  e.stopPropagation();
  openWireMenu(wire.id, e.clientX ?? e.nativeEvent.clientX, e.clientY ?? e.nativeEvent.clientY);
}}
```
Import `useUIStore` and destructure `openWireMenu` from it using individual selectors.

### `components/ContextMenu.tsx`
Read the file. It currently renders the component context menu.
Add a second export (or a second branch at the bottom) for wire menu:
```tsx
export function WireContextMenu() {
  const wireMenu = useUIStore((s) => s.wireMenu);
  const closeWireMenu = useUIStore((s) => s.closeWireMenu);
  const updateWireColor = useCircuitStore((s) => s.updateWireColor);
  const removeWire = useCircuitStore((s) => s.removeWire);

  if (!wireMenu) return null;

  const WIRE_COLORS = ['#cc3333','#3399ff','#33cc66','#ffaa00','#cc66ff','#ffffff','#aaaaaa'];

  return (
    <div
      className="fixed z-50 bg-[#18181c] border border-white/[0.12] rounded-lg shadow-2xl py-1.5 min-w-[160px]"
      style={{ left: wireMenu.x, top: wireMenu.y }}
      onMouseLeave={closeWireMenu}
    >
      <div className="px-3 py-1 flex flex-wrap gap-1.5">
        {WIRE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { updateWireColor(wireMenu.wireId, c); closeWireMenu(); }}
            className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <div className="h-px bg-white/[0.08] mx-2 my-1" />
      <button
        onClick={() => { removeWire(wireMenu.wireId); closeWireMenu(); }}
        className="w-full px-3 py-1.5 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
      >
        Delete wire
      </button>
    </div>
  );
}
```

### `store/circuitStore.ts`
Read the file to understand the existing wire/component store actions.
Add `updateWireColor(id: string, color: string): void` action:
```ts
updateWireColor(id, color) {
  set((state) => ({
    wires: { ...state.wires, [id]: { ...state.wires[id], color } },
  }));
},
```
Add it to the interface and implementation. `removeWire` should already exist —
if not, add it similarly. Do NOT wrap in temporal (undo) — wire color/delete
changes are intentionally outside undo history.

### `app/page.tsx`
Import and render `<WireContextMenu />` alongside the existing `<ContextMenu />`.

## What NOT to do
- Do NOT remove or change the existing component ContextMenu
- Do NOT add undo support for wire color changes
- Keep the WireContextMenu as a separate named export from ContextMenu.tsx
