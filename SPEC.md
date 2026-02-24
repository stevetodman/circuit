# SPEC: P5.d — Medium UI/UX Polish

Three focused improvements. Run `npx tsc --noEmit` and confirm exit 0.

---

## 1 — Empty Canvas Hint

**File:** `components/CanvasOverlay.tsx`

When no components are placed, show a centered hint over the canvas. It should fade in via the existing `toastIn` keyframe and disappear the moment the first component is placed.

### Changes

1. Add `dragging` from dragStore to detect active drag:
   ```ts
   import { useDragStore } from '@/store/dragStore';
   // ...
   const dragging = useDragStore((s) => s.dragging);
   ```

2. Change the return to a React fragment so the hint and the zoom controls are siblings:
   ```tsx
   return (
     <>
       {componentCount === 0 && !dragging && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div
             className="text-center select-none"
             style={{ animation: 'toastIn 0.5s ease-out both', animationDelay: '0.3s', opacity: 0 }}
           >
             <div className="text-[40px] mb-3 text-white/10">←</div>
             <p className="text-white/22 text-[13px] font-medium tracking-wide">
               Drag a component from the panel
             </p>
             <p className="text-white/12 text-[11px] mt-1.5">
               Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/[0.06] border border-white/[0.1] font-mono">?</kbd> for keyboard shortcuts
             </p>
           </div>
         </div>
       )}
       <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
         {/* ...existing componentCount badge and zoom/screenshot buttons... */}
       </div>
     </>
   );
   ```

3. Move the existing content (componentCount badge + zoom button group) inside the `<div className="absolute bottom-4 right-4 ...">` wrapper in the fragment — it's identical to what's currently returned but now nested inside the fragment structure.

---

## 2 — Sidebar Tab Crossfade

**Files:** `app/globals.css`, `components/sidebar/Sidebar.tsx`

### globals.css

Append a new keyframe for the tab transition (opacity-only, no movement — avoids janky shift):
```css
@keyframes tabIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.tab-enter {
  animation: tabIn 0.12s ease-out both;
}
```

### Sidebar.tsx

Find the tab content wrapper div (around line 440). It currently looks like:
```tsx
<div
  className={`flex-1 min-h-0 overflow-y-auto py-2 ${spotlightTarget === 'sidebar-parts' ? 'ring-1 ring-[#7c6fff]/25' : ''}`}
>
  {tab === 'parts' ? (
    ...
  ) : tab === 'learn' ? (
    ...
  ) : (
    ...
  )}
</div>
```

Add `key={tab}` and `tab-enter` to trigger a re-mount + fade on each tab switch:
```tsx
<div
  key={tab}
  className={`tab-enter flex-1 min-h-0 overflow-y-auto py-2 ${spotlightTarget === 'sidebar-parts' ? 'ring-1 ring-[#7c6fff]/25' : ''}`}
>
```

**Only change:** add `key={tab}` prop and prepend `tab-enter ` to the className. No other changes to the content.

---

## 3 — Single-Selection Ring Pulse

**File:** `components/canvas/parts/ComponentRenderer.tsx`

Add a persistent violet ring below the selected component that pulses in `useFrame`. This is analogous to the existing `multiSelected` purple box, but for single selection (`selected && !multiSelected`).

### Add ref

After the existing `multiSelectRingRef` declaration:
```ts
const selectedRingRef = useRef<THREE.MeshStandardMaterial>(null);
```

### Extend useFrame

Inside the existing `useFrame` callback, after the `multiSelectRingRef` block:
```ts
if (selectedRingRef.current) {
  if (selected && !multiSelected) {
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
    selectedRingRef.current.emissiveIntensity = 0.2 + pulse * 0.3;
    selectedRingRef.current.opacity = 0.18 + pulse * 0.18;
  } else {
    selectedRingRef.current.emissiveIntensity = 0;
    selectedRingRef.current.opacity = 0;
  }
}
```

### Add ring mesh to JSX

Inside the returned `<group>`, after the `{multiSelected && ...}` block (near the end, before `</group>`):
```tsx
{/* Single-selection ring — always mounted, animated by useFrame */}
<mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
  <ringGeometry args={[0.13, 0.18, 28]} />
  <meshStandardMaterial
    ref={selectedRingRef}
    color="#7c6fff"
    emissive="#7c6fff"
    emissiveIntensity={0}
    transparent
    opacity={0}
    depthWrite={false}
    toneMapped={false}
  />
</mesh>
```

The ring is flat on the ground plane (rotated -90° on X), radius ~1.3–1.8 cm, violet to match the accent colour. Always mounted so refs are stable; invisible when not selected.

---

## Type-check

```bash
npx tsc --noEmit
```
Exit 0 required. No console.log, no TODOs.

## Files modified

- `components/CanvasOverlay.tsx`
- `app/globals.css`
- `components/sidebar/Sidebar.tsx`
- `components/canvas/parts/ComponentRenderer.tsx`
