# SPEC: Canvas Overlay Toolbar (Zoom Controls + Component Counter)

Add a floating overlay in the bottom-right corner of the 3D canvas with:
1. Zoom In / Zoom Out / Fit buttons (for users who don't know scroll-to-zoom)
2. A component count badge (e.g. "4 parts")

This is a React overlay on top of the R3F canvas, NOT a Three.js object.

## Read First
- `app/page.tsx` — where `<Scene>` is rendered; this is where the overlay goes
- `store/uiStore.ts` — look for `requestZoomToFit`, `requestZoomIn`, `requestZoomOut` actions
- `components/canvas/Scene.tsx` — see how zoom-to-fit is consumed (OrbitControls ref)
- `store/circuitStore.ts` — components field to count placed parts

## What to build

### Part 1: Add zoom actions to uiStore
In `store/uiStore.ts`, add two new request fields alongside `zoomToFitRequested`:
```ts
zoomInRequested: number;      // increment to trigger
zoomOutRequested: number;     // increment to trigger
requestZoomIn: () => void;
requestZoomOut: () => void;
```
Initial values: `zoomInRequested: 0, zoomOutRequested: 0`
Actions: `requestZoomIn: () => set(s => ({ zoomInRequested: s.zoomInRequested + 1 }))` etc.

### Part 2: Handle zoom in Scene.tsx
In `Scene.tsx`, the OrbitControls ref is already used for zoom-to-fit. Add similar effects:
```tsx
const zoomInRequested = useUIStore(s => s.zoomInRequested);
const zoomOutRequested = useUIStore(s => s.zoomOutRequested);

useEffect(() => {
  if (!controlsRef.current) return;
  // dollyIn: reduce distance by 20%
  const cam = controlsRef.current.object as THREE.PerspectiveCamera;
  cam.position.lerp(controlsRef.current.target, 0.2);
  cam.updateProjectionMatrix();
}, [zoomInRequested]);

useEffect(() => {
  if (!controlsRef.current) return;
  // dollyOut: increase distance by 25%
  const cam = controlsRef.current.object as THREE.PerspectiveCamera;
  const dir = cam.position.clone().sub(controlsRef.current.target);
  cam.position.copy(controlsRef.current.target).addScaledVector(dir, 1.25);
  cam.updateProjectionMatrix();
}, [zoomOutRequested]);
```

### Part 3: Create `components/CanvasOverlay.tsx`
A new React component (no R3F, pure HTML/CSS) rendered as an overlay on the canvas.

```tsx
'use client';
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';

export default function CanvasOverlay() {
  const requestZoomIn = useUIStore(s => s.requestZoomIn);
  const requestZoomOut = useUIStore(s => s.requestZoomOut);
  const requestZoomToFit = useUIStore(s => s.requestZoomToFit);
  const componentCount = useCircuitStore(s => Object.keys(s.components).length);

  const btnClass = "w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors text-sm select-none";

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
      {componentCount > 0 && (
        <div className="text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded-full pointer-events-none">
          {componentCount} part{componentCount !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex flex-col bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden pointer-events-auto">
        <button onClick={requestZoomIn} className={btnClass} title="Zoom in">+</button>
        <div className="h-px bg-white/10" />
        <button onClick={requestZoomToFit} className={btnClass} title="Zoom to fit (F)">⊡</button>
        <div className="h-px bg-white/10" />
        <button onClick={requestZoomOut} className={btnClass} title="Zoom out">−</button>
      </div>
    </div>
  );
}
```

### Part 4: Mount in app/page.tsx
In `app/page.tsx`, import and render `<CanvasOverlay />` inside the same `relative` wrapper as `<Scene>`:
- The canvas wrapper div should already have `relative` positioning
- Add `<CanvasOverlay />` as a sibling to `<Scene>`, positioned after it

## Zustand selector pattern (CRITICAL)
Always use individual selectors — NEVER inline objects:
```tsx
const requestZoomIn = useUIStore(s => s.requestZoomIn);   // CORRECT
const { requestZoomIn } = useUIStore(s => ({ ... }));      // WRONG
```

## Important
- New files: `components/CanvasOverlay.tsx`
- Modified files: `store/uiStore.ts`, `components/canvas/Scene.tsx`, `app/page.tsx`
- CanvasOverlay is a normal React component — do NOT put it inside R3F Canvas
- Use `pointer-events-none` on the container and `pointer-events-auto` only on interactive elements
- Run `pnpm build` — must pass with zero TypeScript errors
