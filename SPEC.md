# P1.4 — Right-click empty canvas → quick-add menu

## Overview
When the user right-clicks on empty space on the 3D canvas (no component/pin hit), show a compact floating "Add component" context menu at the cursor position. The menu shows the 5 most-recently-placed component types plus a text search field. Selecting a type immediately starts dragging that component.

## Architecture context
- This is a Next.js 16 + React 18 + Three.js/R3F project
- `store/uiStore.ts` — Zustand UI store (already has persist wrapper)
- `components/canvas/Scene.tsx` — R3F scene; `SceneInteractions` inner component handles pointer events
- `app/page.tsx` — root page; mounts overlays like Toast, StepCard, etc.
- `store/dragStore.ts` — `startDrag(type)` starts dragging a component
- `components/sidebar/Sidebar.tsx` — `PARTS` array + `PART_CATEGORIES` define all available component types

## Files to create
- `components/CanvasContextMenu.tsx` — new floating menu component

## Files to modify
- `store/uiStore.ts`
- `components/canvas/Scene.tsx`
- `app/page.tsx`

---

## 1. `store/uiStore.ts` changes

Add to `UIState` interface:
```ts
canvasMenu: { x: number; y: number } | null;
recentlyUsedTypes: string[];  // up to 5 component type strings, most-recent first

openCanvasMenu: (x: number, y: number) => void;
closeCanvasMenu: () => void;
addRecentlyUsedType: (type: string) => void;
```

Add initial state:
```ts
canvasMenu: null,
recentlyUsedTypes: [],
```

Add actions:
```ts
openCanvasMenu: (x, y) => set({ canvasMenu: { x, y } }),
closeCanvasMenu: () => set({ canvasMenu: null }),
addRecentlyUsedType: (type) => set((state) => {
  const filtered = state.recentlyUsedTypes.filter((t) => t !== type);
  return { recentlyUsedTypes: [type, ...filtered].slice(0, 5) };
}),
```

Also add `recentlyUsedTypes` and `canvasMenu` to the persist `partialize` — add `recentlyUsedTypes` only (canvasMenu should NOT be persisted since it's session state):
The existing `partialize` in uiStore looks like:
```ts
partialize: (state) => ({
  showDesignators: state.showDesignators,
  showPolarityLabels: state.showPolarityLabels,
  showWireVoltageColors: state.showWireVoltageColors,
  showValueLabels: state.showValueLabels,
  showCurrentLabels: state.showCurrentLabels,
}),
```
Add `recentlyUsedTypes: state.recentlyUsedTypes` to that object.

---

## 2. `components/canvas/Scene.tsx` changes

In `SceneInteractions`, detect right-click on empty canvas and open canvasMenu:

Add import: `import { useDragStore } from '@/store/dragStore';` (already imported)

In the `useEffect` that registers pointer events, add a `contextmenu` handler:
```ts
const onContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  // Only open canvas menu if no component/pin was hit
  const componentId = findComponentAtPointer(event.clientX, event.clientY);
  if (!componentId) {
    useUIStore.getState().openCanvasMenu(event.clientX, event.clientY);
  }
};
gl.domElement.addEventListener('contextmenu', onContextMenu);
// cleanup: gl.domElement.removeEventListener('contextmenu', onContextMenu);
```

Also add `openCanvasMenu` to the `useEffect` dependency array.

The `SceneInteractions` component needs to import `openCanvasMenu` from uiStore:
```ts
const openCanvasMenu = useUIStore((state) => state.openCanvasMenu);
```

---

## 3. `components/CanvasContextMenu.tsx` — NEW FILE

```tsx
'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDragStore } from '@/store/dragStore';
import type { ComponentType } from '@/types/circuit';

// All available component types with labels (copied from Sidebar PARTS list)
const ALL_PARTS: { type: ComponentType; label: string }[] = [
  { type: 'battery', label: 'Battery' },
  { type: 'resistor', label: 'Resistor' },
  { type: 'led', label: 'LED' },
  { type: 'capacitor', label: 'Capacitor' },
  { type: 'bjt', label: 'NPN Transistor' },
  { type: 'timer555', label: '555 Timer' },
  { type: 'motor', label: 'Motor' },
  { type: 'tactileSwitch', label: 'Tactile Switch' },
  { type: 'diode', label: 'Diode' },
  { type: 'zener', label: 'Zener Diode' },
  { type: 'schottky', label: 'Schottky Diode' },
  { type: 'pnp', label: 'PNP Transistor' },
  { type: 'mosfet', label: 'MOSFET' },
  { type: 'opamp', label: 'Op-Amp' },
  { type: 'inductor', label: 'Inductor' },
  { type: 'potentiometer', label: 'Potentiometer' },
  { type: 'arduino', label: 'Arduino Uno' },
];

export default function CanvasContextMenu() {
  const canvasMenu = useUIStore((s) => s.canvasMenu);
  const closeCanvasMenu = useUIStore((s) => s.closeCanvasMenu);
  const recentlyUsedTypes = useUIStore((s) => s.recentlyUsedTypes);
  const addRecentlyUsedType = useUIStore((s) => s.addRecentlyUsedType);
  const startDrag = useDragStore((s) => s.startDrag);
  const [query, setQuery] = useState('');

  if (!canvasMenu) return null;

  const handleSelect = (type: ComponentType) => {
    addRecentlyUsedType(type);
    closeCanvasMenu();
    startDrag(type);
  };

  // Build display list: recents first (as a section), then filtered search results
  const recentParts = recentlyUsedTypes
    .map((t) => ALL_PARTS.find((p) => p.type === t))
    .filter(Boolean) as typeof ALL_PARTS;

  const searchResults = query.trim()
    ? ALL_PARTS.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Viewport clamp so menu doesn't go off-screen
  const left = Math.min(canvasMenu.x, window.innerWidth - 200);
  const top = Math.min(canvasMenu.y, window.innerHeight - 320);

  return (
    <>
      {/* Dismiss backdrop */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={closeCanvasMenu}
        onContextMenu={(e) => { e.preventDefault(); closeCanvasMenu(); }}
      />
      <div
        className="fixed z-50 bg-[#111113]/95 border border-white/[0.12] rounded-xl shadow-2xl
                   backdrop-blur-sm w-48 py-1 overflow-hidden"
        style={{ left, top }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 px-3 pt-1 pb-1">
          Add Component
        </p>

        {/* Search */}
        <div className="px-2 pb-1">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeCanvasMenu(); }}
            placeholder="Search…"
            className="w-full bg-white/[0.07] text-white/80 text-[11px] rounded px-2 py-1
                       border border-white/[0.1] placeholder-white/25 focus:outline-none
                       focus:border-[#7c6fff]/50"
          />
        </div>

        <div className="max-h-56 overflow-y-auto">
          {query.trim() ? (
            searchResults.length > 0 ? (
              searchResults.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onPointerDown={(e) => { e.stopPropagation(); handleSelect(p.type); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  {p.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[11px] text-white/30">No results</p>
            )
          ) : (
            <>
              {recentParts.length > 0 && (
                <>
                  <p className="text-[9px] uppercase tracking-widest text-white/20 px-3 pt-1 pb-0.5">Recent</p>
                  {recentParts.map((p) => (
                    <button
                      key={p.type}
                      type="button"
                      onPointerDown={(e) => { e.stopPropagation(); handleSelect(p.type); }}
                      className="w-full text-left px-3 py-1.5 text-[12px] text-white/75 hover:bg-white/[0.08] hover:text-white transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="h-px bg-white/[0.06] mx-2 my-1" />
                </>
              )}
              {recentParts.length === 0 && (
                <p className="px-3 py-2 text-[11px] text-white/30">Type to search for a part…</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
```

---

## 4. `app/page.tsx` changes

Import and mount `CanvasContextMenu` at the root level (same as Toast, StepCard, etc.):

```tsx
import CanvasContextMenu from '@/components/CanvasContextMenu';
// ...
// In the JSX, add alongside other overlays:
<CanvasContextMenu />
```

Also: when a component is placed via drag (in `dragStore.commit()`), call `addRecentlyUsedType`. 
Actually, it's simpler to call it in `CanvasContextMenu.handleSelect`. Also call `addRecentlyUsedType` from `ComponentTile`'s `onAdd` in Sidebar so sidebar drags also update recents.

Actually, for simplicity, just update `addRecentlyUsedType` in `CanvasContextMenu.handleSelect` and also in `dragStore.commit()`. 

In `store/dragStore.ts`, at the end of `commit()` before the final `set(...)`:
```ts
// Track recently used type
if (state.type) {
  useUIStore.getState().addRecentlyUsedType(state.type);
}
```
This ensures sidebar drags also update the recents list.

---

## Important notes
- Right-clicking a component should still open the existing component context menu (ContextMenu.tsx). The canvas menu only opens when clicking empty space (no component/pin hit).
- The existing `onContextMenu={(e) => e.preventDefault()}` on the Scene wrapper div is fine — we're overriding at the canvas element level in `SceneInteractions`.
- Use `pointer-events-none` / `pointer-events-auto` carefully to not block canvas interaction.
- The menu should close on Escape key (handled in the search input's onKeyDown).
- Close the menu after selecting a component type.

## Build validation
Run `pnpm build` at the end to verify no type errors.
