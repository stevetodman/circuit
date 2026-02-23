# SPEC: Overload Toast With Component Name + Current

## Goal
When a component goes into overload (current exceeds rated limit), show a specific toast:
"R1 overloaded: 250mA (limit 200mA)" instead of (or in addition to) just highlighting red.

## Current State
- `uiStore.overloadIds: string[]` holds IDs of overloaded components
- `SimController.tsx` computes overloads and calls `setOverloadIds(ids)`
- When `overloadIds` changes, there is NO toast — only 3D red highlighting on the component
- `circuitStore.getDesignator(id)` returns e.g. "R1", "LED2"
- Current through a component: read from `branchCurrents[wireBranchIndex[wireId]]` in SimBridge

## Changes Required

### `components/SimController.tsx`
Find where `setOverloadIds(ids)` is called. Add logic to toast when new IDs appear:

```tsx
// At top of SimController, add:
const prevOverloadRef = useRef<string[]>([]);
const addToast = useToastStore((s) => s.addToast);

// After computing overloads and calling setOverloadIds(newIds):
const newIds = newIds.filter(id => !prevOverloadRef.current.includes(id));
for (const id of newIds) {
  const designator = useCircuitStore.getState().getDesignator(id);
  // Find the peak current for this component (from branchCurrents in SimBridge)
  // Use a simple formatted current value
  addToast(`${designator} overloaded — reduce current or increase resistance`, 'warn');
}
prevOverloadRef.current = newIds;
```

Only toast for IDs that are **newly** overloaded (not ones that were already overloaded last tick).
This prevents spam: toast fires once when overload begins, not every simulation tick.

If getting the exact current value is complex, just show:
`"${designator} overloaded — check current draw"` — that's already more useful than nothing.

### Imports to add in SimController.tsx (if not already present):
```ts
import { useToastStore } from '@/store/toastStore';
import { useCircuitStore } from '@/store/circuitStore';
```

## What NOT to do
- Do NOT change the overload detection logic (stay in SimController)
- Do NOT change the 3D red highlighting (that stays)
- Do NOT toast every tick — only when overload STATE CHANGES (new IDs appear)
- Only 1 file: components/SimController.tsx
