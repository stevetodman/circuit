# P1.6 — Component Lock

## Overview
Let users lock individual components so they cannot be accidentally moved or deleted. Locked components show a small "🔒" text badge near them in 3D. The right-click context menu has a "Lock / Unlock" toggle item.

## Architecture context (Next.js 16, React 18, Three.js/R3F, Zustand)
- `types/circuit.ts` — defines `PlacedComponent` type
- `store/circuitStore.ts` — Zustand store with `removeComponent`, `moveComponent` (if any), `deleteSelected`; also has `setProperty`
- `components/ContextMenu.tsx` — right-click context menu; two components: `ContextMenu` (for components) and `WireContextMenu` (named export for wires)
- `components/canvas/parts/ComponentRenderer.tsx` — renders each component; handles position + rotation; renders a `<group>` with `userData.componentId`

## Files to modify
1. `types/circuit.ts`
2. `store/circuitStore.ts`
3. `components/ContextMenu.tsx`
4. `components/canvas/parts/ComponentRenderer.tsx`

---

## 1. `types/circuit.ts`

Add `locked?: boolean` to `PlacedComponent`:

```ts
export interface PlacedComponent {
  id: string;
  type: ComponentType;
  anchorPos: Vec3;
  rotationY: number;
  pins: PinConnection[];
  props: Record<string, number | string>;
  locked?: boolean;  // ← add this
}
```

---

## 2. `store/circuitStore.ts`

**Add `toggleComponentLock(id: string): void` to the `CircuitState` interface** and implement it:

```ts
toggleComponentLock(id: string) {
  set((state) => {
    const comp = state.components[id];
    if (!comp) return state;
    return {
      components: {
        ...state.components,
        [id]: { ...comp, locked: !comp.locked },
      },
    };
  });
},
```

**Guard `removeComponent(id)`** — if the component is locked, show a toast and return early:
```ts
removeComponent(id) {
  const comp = get().components[id];
  if (comp?.locked) {
    useToastStore.getState().addToast('Component is locked — unlock to delete', 'warn');
    return;
  }
  // ... existing removal logic
},
```

**Guard `deleteSelected()`** — filter out locked components from deletion:
```ts
deleteSelected() {
  // existing code that collects ids to delete
  // Before deletion, filter: const safeIds = ids.filter(id => !get().components[id]?.locked);
  // If any were skipped, show a toast about locked components
},
```

Also guard `rotateComponent` — if the component is locked, no-op:
```ts
rotateComponent(componentId) {
  if (get().components[componentId]?.locked) return;
  // ... existing rotation logic
},
```

---

## 3. `components/ContextMenu.tsx`

Read the file first to understand its structure.

The context menu renders items for: Rotate, Duplicate, Delete, Properties.

Add a "Lock / Unlock" button item. Read the component's `locked` field from `circuitStore` and display "🔒 Lock" or "🔓 Unlock" accordingly. On click, call `toggleComponentLock(componentId)` and close the menu.

```tsx
// At top of ContextMenu component, add:
const toggleComponentLock = useCircuitStore((s) => s.toggleComponentLock);
const components = useCircuitStore((s) => s.components);

// In the JSX, add a menu item:
const isLocked = contextMenu ? (components[contextMenu.componentId]?.locked ?? false) : false;

<button onClick={() => { toggleComponentLock(contextMenu.componentId); closeContextMenu(); }}>
  {isLocked ? '🔓 Unlock' : '🔒 Lock'}
</button>
```

Style it consistently with other menu items in the context menu.

---

## 4. `components/canvas/parts/ComponentRenderer.tsx`

Read the file to understand its structure. It renders a `<group>` for each component.

**Import `Text` from `@react-three/drei`** (check if already imported).

**Add a lock badge:** When `component.locked` is true, render a `<Text>` overlay showing "🔒" floating above the component. The text should be small (fontSize ~0.12) positioned at `[0, 0.3, 0]` in local space (above the component anchor).

The `ComponentRenderer` component receives props including `componentId`. Look up the component from the store to check its `locked` flag:

```tsx
const locked = useCircuitStore((s) => s.components[componentId]?.locked ?? false);
```

**Prevent drag for locked components:** If the component is locked, `onClick` handler should not call `selectComponent` for move purposes. More precisely, the DragManager and `rotateComponent` are already guarded at the store level, but for `ComponentRenderer` itself, you can add a visual-only lock indicator.

Actually the locking is primarily enforced at store level. Just add the visual badge:
```tsx
{locked && (
  <Text
    position={[0, 0.30, 0]}
    fontSize={0.12}
    color="#ffcc44"
    anchorX="center"
    anchorY="middle"
    depthOffset={-1}
  >
    🔒
  </Text>
)}
```

---

## Important notes
- `locked` is optional (`?`) so existing circuits without the field work fine (undefined = unlocked)
- The undo/redo system (zundo temporal) will track lock state changes since we use `set()` in the store
- Do NOT prevent `selectComponent` — the user should still be able to select and inspect a locked component; just can't delete/rotate it
- `Text` from `@react-three/drei` is already used in other part files (e.g. Battery.tsx for polarity labels)

## Build validation
Run `pnpm build` to verify no type errors.
