# SPEC: Reversed-Polarity Detector (p12.a)

## Goal
Detect when a diode, LED, Zener, or Schottky diode is connected backwards during live simulation and show a targeted component-level warning — the #1 reason beginner circuits don't work.

## Acceptance Criteria
1. When a diode/LED/Schottky/Zener has cathode voltage > anode voltage by more than 0.3V (during a circuit with active power), that component is flagged
2. An amber pulsing sphere (same pattern as overload sphere but amber, positioned differently) appears above the component in the 3D view
3. The health warning message becomes specific: "D1 may be reversed — longer leg (anode +) should connect toward higher voltage"
4. Reversed components are cleared when polarity becomes correct
5. `pnpm build` passes with zero type errors

## Implementation

### 1. `store/uiStore.ts`

Add to the `UIState` interface:
```ts
reversedComponentIds: string[];
setReversedComponentIds: (ids: string[]) => void;
```

Add to initial state:
```ts
reversedComponentIds: [],
```

Add action:
```ts
setReversedComponentIds: (ids) => set({ reversedComponentIds: ids }),
```

### 2. `components/SimController.tsx`

In `runCircuitHealthCheck`, add a new check **as the first check** (before the existing `// 1) No current flowing` check). This ensures a specific polarity message takes precedence over the generic "no current" message.

```ts
// 0) Reversed polarity for diodes / LEDs
const polarTypes = ['led', 'diode', 'zener', 'schottky'] as const;
const reversedIds: string[] = [];
if (componentList.some((c) => c.type === 'battery')) {
  for (const comp of componentList) {
    if (!polarTypes.includes(comp.type as typeof polarTypes[number])) continue;
    const anodePin = comp.pins.find((p) => p.name === 'anode');
    const cathodePin = comp.pins.find((p) => p.name === 'cathode');
    if (!anodePin || !cathodePin) continue;
    const anodeNetId = nodesMap[anodePin.nodeId]?.netId;
    const cathodeNetId = nodesMap[cathodePin.nodeId]?.netId;
    if (anodeNetId == null || cathodeNetId == null) continue;
    const anodeV = voltages[anodeNetId] ?? 0;
    const cathodeV = voltages[cathodeNetId] ?? 0;
    if (cathodeV - anodeV > 0.3) {
      reversedIds.push(comp.id);
    }
  }
}
useUIStore.getState().setReversedComponentIds(reversedIds);
if (reversedIds.length > 0 && !warning) {
  const state = useCircuitStore.getState();
  const designator = state.getDesignator(reversedIds[0]);
  warning = `${designator} may be reversed — longer leg (anode +) should connect toward higher voltage`;
}
```

Also clear `reversedComponentIds` in the else branch where components are cleared:
```ts
useUIStore.getState().setReversedComponentIds([]);
```
(Add this next to the existing `setFloatingNodeIds([])` call in the cleanup branch at the bottom of SimController — around where `setCircuitHealthWarning(null)` and `setFloatingNodeIds([])` are already called on topology change.)

### 3. `components/canvas/parts/ComponentRenderer.tsx`

Add to store reads at the top of the component function:
```ts
const reversedComponentIds = useUIStore((state) => state.reversedComponentIds);
const isReversed = reversedComponentIds.includes(componentId);
```

Add a ref for the reversed material:
```ts
const reversedMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
```

In the `useFrame` callback, add animation for the reversed sphere (same pattern as overload):
```ts
if (reversedMaterialRef.current) {
  if (!isReversed) {
    reversedMaterialRef.current.emissiveIntensity = 0;
  } else {
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5);
    reversedMaterialRef.current.emissiveIntensity = 0.3 + pulse * 0.5;
  }
}
```

Add the amber reversed sphere in JSX, positioned slightly differently from the red overload sphere (lower and offset so they don't overlap):
```tsx
{isReversed && (
  <mesh position={[0, 0.28, 0.08]}>
    <sphereGeometry args={[0.14, 16, 12]} />
    <meshStandardMaterial
      ref={reversedMaterialRef}
      color="#ff8c00"
      emissive="#ff8c00"
      emissiveIntensity={0}
      transparent
      opacity={0.45}
      depthWrite={false}
      toneMapped={false}
    />
  </mesh>
)}
```

Place this just after the `{isOverloaded && ...}` block.

## Type Safety Notes
- `polarTypes` includes `'led' | 'diode' | 'zener' | 'schottky'` — use `as const` and `includes` type guard
- `voltages[anodeNetId]` may be 0 or undefined if SAB not yet initialized — use `?? 0`
- `reversedIds` is `string[]` matching the pattern of `overloadIds`
- The new check runs even when `warning` is already set (we still collect `reversedIds` for visuals), but only SET the warning if `!warning`

## Verify
Run `pnpm build` — must pass with zero type errors.
