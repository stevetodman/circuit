# P1.8 — Wire thickness by current

## Overview
Wires carrying more current are visually thicker. This is gated by a new `showCurrentThickness` toggle in uiStore, accessible from the Toolbar (new button). The tube radius maps linearly from 0.018 (min, at 0A) to 0.040 (max, at 1A+).

## Architecture context (Next.js 16, React 18, Three.js/R3F, Zustand)
- `components/canvas/Wire.tsx` — renders each wire as TubeGeometry from CatmullRomCurve3; `useFrame` reads `branchCurrents[idx]` from SimBridge
- `store/uiStore.ts` — UI toggles; already has `persist` middleware with `partialize`
- `components/Toolbar.tsx` — top toolbar with toggle buttons

## Files to modify
1. `store/uiStore.ts`
2. `components/canvas/Wire.tsx`
3. `components/Toolbar.tsx`

---

## 1. `store/uiStore.ts`

**Add to `UIState` interface:**
```ts
showCurrentThickness: boolean;
toggleCurrentThickness: () => void;
```

**Initial value:**
```ts
showCurrentThickness: false,
```

**Action:**
```ts
toggleCurrentThickness: () => set((state) => ({ showCurrentThickness: !state.showCurrentThickness })),
```

**Add `showCurrentThickness` to the persist `partialize`:**
```ts
partialize: (state) => ({
  showDesignators: state.showDesignators,
  showPolarityLabels: state.showPolarityLabels,
  showWireVoltageColors: state.showWireVoltageColors,
  showValueLabels: state.showValueLabels,
  showCurrentLabels: state.showCurrentLabels,
  showCurrentThickness: state.showCurrentThickness,  // ← add this
}),
```

---

## 2. `components/canvas/Wire.tsx`

Read Wire.tsx carefully first. It renders each wire as a tube. Key things to find:
- How it reads `branchCurrents` from SimBridge
- How the TubeGeometry is created (what tube radius it uses)
- The `useFrame` hook

**Goal:** In `useFrame`, when `showCurrentThickness` is true, read `branchCurrents[branchIdx]` (already done for the animation), compute `Math.abs(current)`, map to tube radius, and update the geometry if radius changed by >5%.

The wire has a `meshRef` for the tube. To update the tube radius, we need to rebuild the TubeGeometry. To avoid rebuilding every frame, track the last radius in a ref and only rebuild when it changes by more than 5%.

**Implementation pattern:**
```ts
// At component level (outside useFrame):
const currentThicknessRef = useRef(0.018);  // current radius

// In useFrame:
const showCurrentThickness = useUIStore.getState().showCurrentThickness;
if (showCurrentThickness && branchIdx != null) {
  const amp = Math.abs(branchCurrents[branchIdx] ?? 0);
  const targetRadius = Math.min(0.040, 0.018 + amp * 0.022);  // 0.018 + amp*(0.040-0.018)
  const lastRadius = currentThicknessRef.current;
  if (Math.abs(targetRadius - lastRadius) / lastRadius > 0.05) {  // >5% change
    currentThicknessRef.current = targetRadius;
    if (meshRef.current) {
      meshRef.current.geometry.dispose();
      meshRef.current.geometry = new THREE.TubeGeometry(curve, segments, targetRadius, 6, false);
    }
  }
} else if (!showCurrentThickness && currentThicknessRef.current !== 0.018) {
  // Reset to default radius when toggled off
  currentThicknessRef.current = 0.018;
  if (meshRef.current) {
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = new THREE.TubeGeometry(curve, segments, 0.018, 6, false);
  }
}
```

**Important:** The `curve` variable must be accessible in `useFrame`. Read Wire.tsx to understand its structure — it may rebuild the curve on topology changes using `useMemo` or `useEffect`. Make the curve accessible via a ref.

**Read the actual Wire.tsx file to understand:**
- What the default tube radius is (likely ~0.018-0.020)
- How `curve` is computed
- How `branchIdx` is determined (it's passed as a prop or looked up)
- Make sure `THREE` is imported for `TubeGeometry`

---

## 3. `components/Toolbar.tsx`

Add a new toolbar button for toggling current thickness.

Read `showCurrentThickness` and `toggleCurrentThickness` from uiStore:
```tsx
const showCurrentThickness = useUIStore((s) => s.showCurrentThickness);
const toggleCurrentThickness = useUIStore((s) => s.toggleCurrentThickness);
```

Add a `ToolbarBtn` near the other wire visualization toggles (V Voltage, I Current):
```tsx
<ToolbarBtn
  onClick={toggleCurrentThickness}
  title="Toggle wire thickness by current (T)"
  active={showCurrentThickness}
>
  ~ Width
</ToolbarBtn>
```

---

## Also update KeyboardShortcuts.tsx

Add `T` key shortcut for toggle current thickness:
```ts
if (key === 't') {
  e.preventDefault();
  useUIStore.getState().toggleCurrentThickness();
  return;
}
```

---

## Important notes
- Only update tube geometry when the change exceeds 5% to avoid per-frame garbage
- Always `geometry.dispose()` before replacing to prevent WebGL memory leak
- The `curve` must be a stable ref or computed value accessible in `useFrame`
- `branchCurrents` is a Float32Array from `@/simulation/SimBridge` (`import { branchCurrentView } from '@/simulation/SimBridge'`)
- Default tube radius should match Wire.tsx's existing default

## Build validation
Run `pnpm build` to verify no type errors.
