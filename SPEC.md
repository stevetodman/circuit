# SPEC: Escape Key Closes Open Overlays

## Goal
When no drag or wiring is active, pressing Escape should close any open overlay panel
(oscilloscope, schematic, help) before deselecting components.

## Current State
- Escape handler in `KeyboardShortcuts.tsx` (bottom of handler):
  ```tsx
  if (e.key === 'Escape') {
    closeContextMenu();
    clearBoxSelect();
    if (dragging) { cancelDrag(); return; }
    const wiringActive = useCircuitStore.getState().selectedNodeId;
    selectNode(null);
    if (!wiringActive) selectComponent(null);
  }
  ```
- Overlays:
  - Oscilloscope: `useScopeStore.getState().open` + `useScopeStore.getState().toggle()`
  - Schematic: `useSchematicStore.getState().open` + `useSchematicStore.getState().toggle()`
  - Help: `useUIStore.getState().showHelp` + `useUIStore.getState().toggleHelp()`
  - Wire menu: `useUIStore.getState().wireMenu` + `useUIStore.getState().closeWireMenu()`

## Changes Required

### `components/KeyboardShortcuts.tsx`
Add imports at top:
```tsx
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
```
(check if already imported — scopeStore is imported for the O key handler, schematicStore for S key)

Modify the Escape block to close overlays in priority order:
```tsx
if (e.key === 'Escape') {
  closeContextMenu();
  clearBoxSelect();
  // Close wire menu first
  if (useUIStore.getState().wireMenu) {
    useUIStore.getState().closeWireMenu();
    return;
  }
  // Cancel active drag
  if (dragging) { cancelDrag(); return; }
  // Close overlays (in priority order: scope > schematic > help)
  if (useScopeStore.getState().open) { useScopeStore.getState().toggle(); return; }
  if (useSchematicStore.getState().open) { useSchematicStore.getState().toggle(); return; }
  if (useUIStore.getState().showHelp) { useUIStore.getState().toggleHelp(); return; }
  // Cancel wiring / deselect
  const wiringActive = useCircuitStore.getState().selectedNodeId;
  selectNode(null);
  if (!wiringActive) selectComponent(null);
}
```

## What NOT to do
- Do NOT change the existing logic for dragging/wiring/deselect — only ADD overlay closing before it
- Do NOT modify any store
- Only 1 file: components/KeyboardShortcuts.tsx
