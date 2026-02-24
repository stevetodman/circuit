# P1.9 — Box select count badge + multi-select highlight

## Overview
Two improvements to the multi-select experience:
1. While dragging a box select, show a live count badge "N selected" inside the selection rect
2. Components in `selectedComponentIds` (multi-select) pulse with a blue/violet emissive ring, distinguishing them visually from single-selected (orange highlight)

## Architecture context
- `components/canvas/Scene.tsx` — has `BoxSelectOverlay` function component that renders the dashed rect; `selectedComponentIds` passed to `ComponentRenderer` via `selected` prop
- `components/canvas/parts/ComponentRenderer.tsx` — wraps all part renders; has `selected` prop; has `useFrame` with overload pulse pattern

## Files to modify
1. `components/canvas/Scene.tsx`
2. `components/canvas/parts/ComponentRenderer.tsx`

---

## 1. `components/canvas/Scene.tsx`

### BoxSelectOverlay — add count badge

The `BoxSelectOverlay` function currently renders only the dashed rect. Modify it to also read `selectedComponentIds` from circuitStore and show a count badge.

**Read both from stores:**
```tsx
function BoxSelectOverlay() {
  const boxSelectRect = useUIStore((state) => state.boxSelectRect);
  const selectedCount = useCircuitStore((s) => s.selectedComponentIds.length);
  if (!boxSelectRect) return null;
  // ... existing rect rendering ...
  // Add count badge:
  return (
    <div className="fixed pointer-events-none z-20" style={{ left, top, width, height, border, background }}>
      {selectedCount > 0 && (
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/80 text-white leading-none">
          {selectedCount}
        </div>
      )}
    </div>
  );
}
```

**Important:** Already imports `useCircuitStore` at the top of Scene.tsx — just add the selector.

### ComponentRenderer — pass `multiSelected` prop

In the `components.map(...)` render, currently:
```tsx
selected={selectedComponentId === component.id || selectedComponentIds.includes(component.id)}
```

Change to also pass a `multiSelected` prop:
```tsx
selected={selectedComponentId === component.id || selectedComponentIds.includes(component.id)}
multiSelected={selectedComponentIds.includes(component.id) && selectedComponentId !== component.id}
```

---

## 2. `components/canvas/parts/ComponentRenderer.tsx`

### Add `multiSelected` prop and pulsing ring

**Add to `ComponentRendererProps` interface:**
```ts
multiSelected?: boolean;
```

**Add pulsing highlight ring in `useFrame`:**

The component already has a `useFrame` with an `overloadMaterialRef` for the overload pulse. Add a similar ref for multi-select. Use a `<mesh>` (scaled slightly larger than the component bounding box) with a pulsing emissive `meshStandardMaterial` in blue/violet.

**Implementation pattern:**
```tsx
// At component level:
const multiSelectRingRef = useRef<THREE.MeshStandardMaterial>(null);

// In useFrame (add to existing useFrame callback):
if (multiSelectRingRef.current) {
  if (multiSelected) {
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5);
    multiSelectRingRef.current.emissiveIntensity = 0.3 + pulse * 0.5;
    multiSelectRingRef.current.opacity = 0.25 + pulse * 0.25;
  } else {
    multiSelectRingRef.current.emissiveIntensity = 0;
    multiSelectRingRef.current.opacity = 0;
  }
}

// In JSX, add a slightly-enlarged box around the component when multiSelected:
{multiSelected && (
  <mesh>
    <boxGeometry args={[0.8, 0.3, 0.8]} />
    <meshStandardMaterial
      ref={multiSelectRingRef}
      color="#7b5cf0"
      emissive="#7b5cf0"
      emissiveIntensity={0.5}
      transparent
      opacity={0.3}
      depthWrite={false}
    />
  </mesh>
)}
```

**Read the file carefully** to understand the existing `useFrame` and where to place the ring JSX (inside the `<group>` wrapper).

---

## Build validation
Run `pnpm build` to verify no type errors.
