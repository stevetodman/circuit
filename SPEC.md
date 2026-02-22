# SPEC: F3.1 Larger Pin Hit Targets

## Context
Circuit Sandbox — React Three Fiber (R3F) / Three.js.
Run `pnpm build` to verify. No test suite.

Key file: `components/canvas/Pin.tsx`

## Problem
The pin geometry is `<cylinderGeometry args={[0.052, 0.052, 0.008, 10]} />` —
a tiny 0.104 unit diameter disk. This is barely clickable, especially on
high-DPI screens. The PITCH constant is 0.254 (2.54 mm), so the hit radius
is ~20% of pin spacing. Users frequently miss-click.

## Solution
Add an invisible hit-test cylinder behind each visible pin disk.
The hit cylinder should be:
- Radius: 0.10 (nearly fills the 0.127 half-pitch gap)
- Height: 0.04 (flat, just above the board)
- Transparent / invisible (opacity 0, or just skip material color)
- Same pointer events as the visible disk

The R3F `instancedMesh` uses a single geometry for all instances, so we need
two separate `instancedMesh` elements: one visible (existing), one invisible
hit-test layer.

## Implementation

### `components/canvas/Pin.tsx`

**Step 1**: Keep the existing visible `instancedMesh` exactly as is (the metallic disk).

**Step 2**: Add a second `instancedMesh` for hit testing only, with:
- Same `ref`, `args`, `count` as the visible mesh (actually, use a NEW ref)
- `<cylinderGeometry args={[0.10, 0.10, 0.04, 10]} />`
- `<meshBasicMaterial transparent opacity={0} depthWrite={false} />`
- Move all pointer event handlers (`onPointerMove`, `onPointerOut`, `onClick`)
  from the visible mesh to this invisible hit-test mesh
- The visible mesh should have no pointer events (remove `onPointerMove`, `onPointerOut`, `onClick`)
- The hit mesh needs its OWN `useEffect` to set instance matrices (same positions as visible mesh)
  BUT it can share the same `nodeList` and the same matrix computation — just duplicate the effect

**Step 3**: Add `renderOrder={1}` to the hit mesh (lower than visible at renderOrder=2)
so it sits just below and doesn't occlude component geometry.

**Step 4**: The hit mesh ref (`hitMeshRef`) must also have instance matrices updated
whenever `nodeList` changes, using the same dummy Object3D approach.

## Important
- Do NOT change pin colors or visual appearance
- Do NOT change store interaction logic
- The `count` for the hit mesh must equal `count` for the visible mesh (same `nodeList.length`)
- Since instancedMesh args includes count, and count can be 0, guard: if count === 0 return null
- Run `pnpm build` and fix all TypeScript errors
