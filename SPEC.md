# SPEC: Tab Key Cycles Component Selection

## Goal
Tab / Shift+Tab cycles keyboard selection through all placed components.

## Current State
- `circuitStore.components` is `Record<string, PlacedComponent>`
- `circuitStore.selectedComponentId: string | null`
- `circuitStore.selectComponent(id)` sets selectedComponentId
- `KeyboardShortcuts.tsx` has no Tab handler
- `isInputFocused()` guard is already applied to all key handlers

## Changes Required

### `components/KeyboardShortcuts.tsx`
1. Add selector: `const components = useCircuitStore((s) => s.components);`
2. Add to dependency array: `components`
3. In the keydown handler, BEFORE the meta-key checks, add:

```tsx
if (key === 'tab') {
  e.preventDefault();
  const ids = Object.keys(components).sort();
  if (ids.length === 0) return;
  const current = useCircuitStore.getState().selectedComponentId;
  const idx = current ? ids.indexOf(current) : -1;
  const next = e.shiftKey
    ? ids[(idx - 1 + ids.length) % ids.length]
    : ids[(idx + 1) % ids.length];
  useCircuitStore.getState().selectComponent(next);
  return;
}
```

### `components/HelpOverlay.tsx`
Add to the Navigation section rows array:
```ts
['Tab / Shift+Tab', 'Cycle component selection'],
```

## What NOT to do
- Do NOT modify circuitStore — selectComponent already exists
- Do NOT modify uiStore
- Only 2 files: KeyboardShortcuts.tsx and HelpOverlay.tsx
