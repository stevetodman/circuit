# SPEC: Delete Key Removes Wire When Wire Menu Is Open

## Goal
When the wire right-click context menu (WireContextMenu) is open, pressing Delete or Backspace
should delete that wire — same UX pattern as component deletion.

## Current State
- `uiStore.wireMenu` holds `{ wireId, x, y } | null` when wire menu is open
- `uiStore.closeWireMenu()` closes the menu
- `circuitStore.removeWire(wireId)` deletes a wire
- `KeyboardShortcuts.tsx` handles Delete/Backspace for component deletion:
  ```tsx
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (useCircuitStore.getState().selectedNodeId) {
      selectNode(null); // cancel wire
    } else {
      deleteSelected(); // delete component
    }
    return;
  }
  ```
- The wireMenu check is NOT in this block

## Changes Required

### `components/KeyboardShortcuts.tsx`
Extend the existing Delete/Backspace handler to also handle an open wire menu.
Add the wireMenu check FIRST (highest priority):

```tsx
if (e.key === 'Delete' || e.key === 'Backspace') {
  e.preventDefault();
  const wireMenu = useUIStore.getState().wireMenu;
  if (wireMenu) {
    useCircuitStore.getState().removeWire(wireMenu.wireId);
    useUIStore.getState().closeWireMenu();
    return;
  }
  if (useCircuitStore.getState().selectedNodeId) {
    selectNode(null);
  } else {
    deleteSelected();
  }
  return;
}
```

No new imports needed — `useUIStore` and `useCircuitStore` are already imported.

## What NOT to do
- Do NOT touch WireContextMenu component itself
- Do NOT modify circuitStore or uiStore
- Only 1 file: components/KeyboardShortcuts.tsx
