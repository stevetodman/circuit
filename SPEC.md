# P7.a — Click-to-Place Mode

## Goal
Let users click a part in the sidebar to "arm" it, then click a spot on the breadboard canvas to place it — no cross-screen dragging required. One click to arm, one click to place.

## Acceptance Criteria
1. Clicking a ComponentTile (instead of dragging) arms click-to-place mode for that type
2. While armed: cursor over canvas is a `crosshair`, a floating badge near the cursor shows the component type (e.g. "Resistor — click to place")
3. Clicking on the canvas (on the board plane) places the component at the nearest pin hole (same snap logic as drag-drop)
4. `Escape` cancels click-to-place mode
5. `R` key during click-to-place rotates the pending component (same as during drag)
6. Dragging from ComponentTile still works exactly as before (unchanged behaviour)
7. After placement the mode is cleared — user must click tile again to place another
8. Works alongside the existing drag mode — they are mutually exclusive
9. `pnpm build` must pass; no TypeScript errors

## Files to Modify

### `store/uiStore.ts`
Add to UIState interface:
```ts
clickToPlaceType: ComponentType | null;
clickToPlaceRotation: number;
setClickToPlace: (type: ComponentType | null) => void;
rotateClickToPlace: () => void;
```
Add to initial state:
```ts
clickToPlaceType: null,
clickToPlaceRotation: 0,
```
Add actions:
```ts
setClickToPlace: (type) => set((s) => ({
  clickToPlaceType: type,
  clickToPlaceRotation: type == null ? 0 : s.clickToPlaceRotation,
})),
rotateClickToPlace: () => set((s) => ({ clickToPlaceRotation: (s.clickToPlaceRotation + 90) % 360 })),
```

### `components/sidebar/ComponentTile.tsx`
Add `onClick` prop (in addition to existing `onAdd`):
```tsx
onClick?: () => void;
```
If `onClick` is provided, call it on the tile's `onClick` event.
If neither `onAdd` nor `onClick` is provided, fall back to existing behaviour.

Actually simpler: the existing tile fires `onAdd` which starts a drag. Instead, we'll handle click-to-place in `Sidebar.tsx` by passing a special `onClick` that calls `setClickToPlace`.

Since ComponentTile already has draggable behaviour, we need to distinguish a click (no movement) from a drag start. Use a `pointerdown`/`pointermove`/`pointerup` pattern on the tile — if pointer moves <5px before up, treat as a click → arm click-to-place mode. If it moves >5px, start drag as before.

Add to ComponentTile:
```tsx
const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
const moved = useRef(false);

onPointerDown={(e) => {
  pointerDownPos.current = { x: e.clientX, y: e.clientY };
  moved.current = false;
}}
onPointerMove={(e) => {
  if (pointerDownPos.current) {
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    if (Math.sqrt(dx*dx + dy*dy) > 5) moved.current = true;
  }
}}
onPointerUp={(e) => {
  if (pointerDownPos.current && !moved.current) {
    // Click (not drag) — arm click-to-place
    props.onClickToPlace?.();
  }
  pointerDownPos.current = null;
}}
```
Add optional prop `onClickToPlace?: () => void`.

### `components/sidebar/Sidebar.tsx`
When rendering each `<ComponentTile>`, pass:
```tsx
onClickToPlace={() => {
  useUIStore.getState().setClickToPlace(type);
  // Also cancel any active drag
  useDragStore.getState().cancel();
}}
```

### `components/canvas/DragManager.tsx`
Add click-to-place handling. In the main `useEffect` for pointer events:

After the existing `pointerup` handler, add a separate `pointerup` handler that checks `clickToPlaceType`:
```ts
// Click-to-place: if click-to-place mode is active and user clicks canvas (not a component)
// This runs BEFORE the drag handler — if dragging is active, skip
const handleClickToPlace = (e: PointerEvent) => {
  const { clickToPlaceType, clickToPlaceRotation } = useUIStore.getState();
  if (!clickToPlaceType) return;
  if (useDragStore.getState().dragging) return;
  
  const pos = clientToBoardPos(e.clientX, e.clientY);
  if (!pos) {
    useUIStore.getState().setClickToPlace(null);
    return;
  }
  
  // Use dragStore.startDrag + updatePos + commit pattern but with clickToPlaceRotation
  // OR: inline the snap+commit logic here
  const rotationY = clickToPlaceRotation;
  const nodes = useCircuitStore.getState().nodes;
  const pinTemplates = PIN_TEMPLATES[clickToPlaceType] ?? [];
  let snappedAnchor: Vec3 = [...pos];
  const pins: PinConnection[] = [];
  
  for (const pinDef of pinTemplates) {
    const pinOffset = rotateOffset(pinDef.offset, rotationY);
    const pinWorld: Vec3 = [snappedAnchor[0]+pinOffset[0], snappedAnchor[1]+pinOffset[1], snappedAnchor[2]+pinOffset[2]];
    let bestNodeId: string | null = null; let bestWorldPos: Vec3 | null = null; let bestDist = Infinity;
    for (const node of Object.values(nodes)) {
      const d = distanceTo(pinWorld, node.worldPos);
      if (d < bestDist) { bestDist = d; bestNodeId = node.id; bestWorldPos = node.worldPos; }
    }
    if (bestNodeId) pins.push({ name: pinDef.name, nodeId: bestNodeId });
    if (bestDist < SNAP_THRESHOLD && bestWorldPos) {
      snappedAnchor = [bestWorldPos[0]-pinOffset[0], bestWorldPos[1]-pinOffset[1], bestWorldPos[2]-pinOffset[2]];
    }
  }
  
  useCircuitStore.getState().addComponent(clickToPlaceType, snappedAnchor, pins, rotationY);
  useUIStore.getState().addRecentlyUsedType(clickToPlaceType);
  useUIStore.getState().setClickToPlace(null); // clear after placement
};

gl.domElement.addEventListener('pointerup', handleClickToPlace);
// cleanup
```

Also update the cursor effect:
```ts
const { dragging } = useDragStore.getState();
const { clickToPlaceType } = useUIStore.getState();
gl.domElement.style.cursor = dragging ? 'grabbing' : clickToPlaceType ? 'crosshair' : 'default';
```

### `components/KeyboardShortcuts.tsx`
In the `R` key handler, also handle click-to-place rotation:
```ts
if (key === 'r') {
  if (dragging) { e.preventDefault(); rotateDrag(); return; }
  if (useUIStore.getState().clickToPlaceType) { 
    e.preventDefault(); 
    useUIStore.getState().rotateClickToPlace(); 
    return; 
  }
  if (selectedComponentId) { e.preventDefault(); rotateComponent(selectedComponentId); }
  return;
}
```
In the `Escape` handler, cancel click-to-place:
```ts
if (useUIStore.getState().clickToPlaceType) {
  useUIStore.getState().setClickToPlace(null);
  return;
}
```
Add this before the `if (dragging)` check.

Also add `Ctrl+N` for new circuit:
```ts
if (meta && key === 'n') {
  e.preventDefault();
  // Trigger new circuit — same as clicking "New Circuit" in ExportPanel
  // circuitStore.newCircuit() but we need the confirm step — just toast a hint
  // Actually: directly trigger it since keyboard users expect it to work
  useCircuitStore.getState().newCircuit();
  useToastStore.getState().addToast('New circuit — Ctrl+Z to restore', 'info');
  return;
}
```
Import `useToastStore` at the top of KeyboardShortcuts.tsx.

### `app/page.tsx`
Add a floating badge when click-to-place is active. In the JSX, add:
```tsx
const clickToPlaceType = useUIStore(s => s.clickToPlaceType);
// ...
{clickToPlaceType && (
  <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    style={{ animation: 'toastIn 0.2s ease-out both' }}>
    <div className="bg-[#18181c]/90 border border-[#7c6fff]/40 rounded-lg px-3 py-1.5 text-[12px] text-[#b8b0ff]">
      Click breadboard to place <span className="font-semibold capitalize">{clickToPlaceType}</span>
      <span className="text-white/40 ml-2">· R to rotate · Esc to cancel</span>
    </div>
  </div>
)}
```

## Important: Import `ComponentType` in uiStore
uiStore.ts must import `ComponentType` from `@/types/circuit` for the new field.

## Notes
- The snap logic in DragManager is duplicated from dragStore.commit() — that's fine for now
- `pnpm build` must pass
