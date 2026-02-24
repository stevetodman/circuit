# SPEC: Simulation Diagnostics (p11.a)

## Goal
Surface three specific simulation pain points that cause beginners to get stuck with no recovery path:
1. Floating pin holes highlighted orange on the canvas when a health warning is active
2. NR non-convergence toast replaced with an actionable tips panel (NrFailTips.tsx)
3. Extend Pin.tsx color logic with `floatingNodeIds` from uiStore

## Acceptance Criteria
1. When circuitHealthWarning contains "Floating", floating pin holes pulse orange on breadboard
2. SIM_NR_FAIL no longer fires a toast — instead shows a dismissible tips panel
3. Tips panel lists 5 common causes with plain-English fixes
4. Tips panel has ✕ dismiss button; re-shows on next NR_FAIL
5. pnpm build passes with zero type errors

## Implementation

### 1. `store/uiStore.ts`

Add to the UIState interface and initial state:
```ts
// In interface:
floatingNodeIds: string[];
setFloatingNodeIds: (ids: string[]) => void;
nrFailTipsVisible: boolean;
setNrFailTipsVisible: (v: boolean) => void;
```
Init values: `floatingNodeIds: []`, `nrFailTipsVisible: false`

Actions:
```ts
setFloatingNodeIds: (ids) => set({ floatingNodeIds: ids }),
setNrFailTipsVisible: (v) => set({ nrFailTipsVisible: v }),
```

### 2. `components/SimController.tsx`

Find the existing block that detects floating pins (around line 372–386 where `hasFloatingPin` is computed and `setCircuitHealthWarning` is called with the floating warning). AFTER that block, add:

```ts
// Collect IDs of floating component pin nodes for visual highlighting
const floatingIds: string[] = [];
for (const component of componentList) {
  for (const pin of component.pins) {
    const node = nodesMap[pin.nodeId];
    if (node && node.netId == null) {
      floatingIds.push(node.id);
    }
  }
}
useUIStore.getState().setFloatingNodeIds(floatingIds);
```

In the else branch where `setCircuitHealthWarning(null)` is called (when no warning), also add:
```ts
useUIStore.getState().setFloatingNodeIds([]);
```

In the `SIM_NR_FAIL` handler (around line 218), change it to:
```ts
} else if (type === 'SIM_NR_FAIL') {
  useUIStore.getState().setSimStatus('warn');
  useUIStore.getState().setNrFailTipsVisible(true);
  // Do NOT call addToast here — NrFailTips panel replaces the toast
}
```

### 3. `components/canvas/Pin.tsx`

Add at the top with other color constants:
```ts
const COLOR_FLOATING = new THREE.Color('#ff8c00'); // amber-orange for floating pins
```

Import floatingNodeIds:
```tsx
const floatingNodeIds = useUIStore((s) => s.floatingNodeIds);
```

In the useEffect that assigns per-instance colors (the one with `nodeList.forEach`), add the floating check BEFORE the idle fallback and ONLY when not in wiring mode:
```ts
if (!wiringMode && floatingNodeIds.includes(node.id)) {
  col = COLOR_FLOATING;
} else if (snapTargetNodeIds.includes(node.id)) {
  col = COLOR_SNAP_TARGET;
} else if (node.id === hoveredNodeId) {
  // ... rest of existing logic
```

Add `floatingNodeIds` to the useEffect dependency array.

### 4. `components/NrFailTips.tsx` (NEW FILE)

```tsx
'use client';
import { useUIStore } from '@/store/uiStore';

const TIPS = [
  'Reversed diode or LED — check the + (anode) and − (cathode) labels',
  'LED without a current-limiting resistor — add a 220Ω–1kΩ resistor in series',
  'Missing ground connection — connect the − battery terminal to the GND rail',
  'Very large resistance (>1MΩ) next to very small resistance (<1Ω) can cause instability',
  'Directly shorted power rails — do not wire + and − rails together',
];

export default function NrFailTips() {
  const visible = useUIStore((s) => s.nrFailTipsVisible);
  const setNrFailTipsVisible = useUIStore((s) => s.setNrFailTipsVisible);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 w-80 bg-[#1e1a10] border border-amber-500/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-4 py-3"
      style={{ animation: 'toastIn 0.15s ease-out both' }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold text-amber-400">⚠ Simulation may be inaccurate</p>
        <button
          onClick={() => setNrFailTipsVisible(false)}
          className="text-white/30 hover:text-white/60 text-[13px] leading-none ml-2"
        >
          ✕
        </button>
      </div>
      <p className="text-[10px] text-white/50 mb-2">Common causes to check:</p>
      <ul className="space-y-1">
        {TIPS.map((tip, i) => (
          <li key={i} className="text-[10px] text-white/60 flex gap-1.5">
            <span className="text-amber-500/70 shrink-0">·</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. `app/page.tsx`

Import and render alongside other overlays:
```tsx
import NrFailTips from '@/components/NrFailTips';
// In JSX:
<NrFailTips />
```

## Type Safety Notes
- floatingNodeIds is string[] — use .includes(node.id) safely
- nodesMap[pin.nodeId] may be undefined — check before accessing .netId
- Add floatingNodeIds to Pin.tsx useEffect dependency array

## Verify
Run `pnpm build` — must pass with zero type errors.
