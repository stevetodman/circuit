# SPEC: Wire Color Picker

Right-clicking a wire currently deletes it instantly. Change it to open a small color picker popup. Users can pick a new color or click "Delete" to remove.

## Read First
- `components/canvas/Wire.tsx` — look for `onContextMenu` which calls `removeWire(wire.id)` directly. This must be changed to open a wire context menu instead.
- `store/uiStore.ts` — look for `contextMenu` (for components). We'll add a parallel `wireMenu` field.
- `store/circuitStore.ts` — look for `addWire`, `removeWire`. We need to add `setWireColor`.
- `app/page.tsx` — look for where `<ContextMenu />` is rendered. We'll add `<WireContextMenu />` alongside it.

## Part 1: circuitStore.ts — add setWireColor

In the `CircuitStoreState` interface, add:
```ts
setWireColor: (id: string, color: string) => void;
```

In the store implementation (near `removeWire`), add:
```ts
setWireColor(id, color) {
  set((s) => {
    const wire = s.wires[id];
    if (!wire) return s;
    return { wires: { ...s.wires, [id]: { ...wire, color } } };
  });
},
```

## Part 2: uiStore.ts — add wireMenu state

In the `UIState` interface, add:
```ts
wireMenu: { wireId: string; x: number; y: number } | null;
openWireMenu:  (wireId: string, x: number, y: number) => void;
closeWireMenu: () => void;
```

In the initial state: `wireMenu: null`.

Actions:
```ts
openWireMenu:  (wireId, x, y) => set({ wireMenu: { wireId, x, y } }),
closeWireMenu: () => set({ wireMenu: null }),
```

## Part 3: components/WireContextMenu.tsx — new file

Create `components/WireContextMenu.tsx`:

```tsx
'use client';

import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';

const WIRE_COLORS = [
  '#e63946', // red
  '#f4a261', // orange
  '#2a9d8f', // teal
  '#457b9d', // blue
  '#9b5de5', // purple
  '#4ecdc4', // cyan
  '#f7f7f7', // white
  '#a8a8a8', // gray
];

export default function WireContextMenu() {
  const wireMenu     = useUIStore((s) => s.wireMenu);
  const closeWireMenu = useUIStore((s) => s.closeWireMenu);
  const setWireColor = useCircuitStore((s) => s.setWireColor);
  const removeWire   = useCircuitStore((s) => s.removeWire);

  if (!wireMenu) return null;

  const { wireId, x, y } = wireMenu;

  // Clamp to viewport
  const left = Math.min(x, window.innerWidth  - 140);
  const top  = Math.min(y, window.innerHeight - 100);

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={closeWireMenu}
      />
      <div
        className="fixed z-50 bg-[#111113]/95 border border-white/15 rounded-lg shadow-2xl p-2 min-w-[128px]"
        style={{ left, top }}
      >
        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1.5 px-1">Wire color</p>
        <div className="grid grid-cols-4 gap-1 mb-2">
          {WIRE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setWireColor(wireId, color);
                closeWireMenu();
              }}
              className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors"
              style={{ background: color }}
              title={color}
            />
          ))}
        </div>
        <button
          onClick={() => {
            removeWire(wireId);
            closeWireMenu();
          }}
          className="w-full text-[10px] text-red-400/70 hover:text-red-400 text-left px-1 py-0.5 rounded hover:bg-red-500/10 transition-colors"
        >
          Delete wire
        </button>
      </div>
    </>
  );
}
```

## Part 4: Wire.tsx — open wireMenu instead of deleting

Change the `onContextMenu` handler:
```tsx
// Import openWireMenu from uiStore at the top of the component:
const openWireMenu = useUIStore((s) => s.openWireMenu);

// Replace the existing onContextMenu:
const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation();
  openWireMenu(wire.id, e.clientX, e.clientY);
};
```

Note: `ThreeEvent<MouseEvent>` has `clientX` and `clientY` (screen coordinates). Use these directly for the popup position.

## Part 5: app/page.tsx — render WireContextMenu

Import `WireContextMenu` from `@/components/WireContextMenu` and render it alongside `<ContextMenu />`:
```tsx
import WireContextMenu from '@/components/WireContextMenu';
// ...
<WireContextMenu />
```

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const wireMenu = useUIStore(s => s.wireMenu);         // CORRECT
const { wireMenu } = useUIStore(s => ({ ... }));      // WRONG — crash
```

## Important
- Files: `store/circuitStore.ts`, `store/uiStore.ts`, `components/WireContextMenu.tsx` (new), `components/canvas/Wire.tsx`, `app/page.tsx`
- ThreeEvent clientX/clientY are available on the native event — they give screen pixel coordinates for the popup
- The backdrop `onPointerDown` closes the menu when clicking anywhere outside
- Run `pnpm build` — must pass with zero TypeScript errors
