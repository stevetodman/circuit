# SPEC: "Deleted — Ctrl+Z to undo" Toast After Every Delete Action

## Goal
Every deletion action (component delete, wire delete, multi-delete) shows a brief
toast: "Deleted — Ctrl+Z to undo" so users know the action is reversible.

## Current State
- Component delete via keyboard (Delete key): calls `deleteSelected()` in circuitStore — no toast
- Component delete via context menu: calls `removeComponent(id)` — no toast
- Wire delete via WireContextMenu button: calls `removeWire(id)` — no toast
- Wire delete via Delete key (after wire-delete feature): calls `removeWire(id)` — no toast
- Toast system: `useToastStore.getState().addToast(message, severity)`
- Severity `'info'` shows as neutral; use that for undo hints

## Changes Required

### `store/circuitStore.ts`
In the `deleteSelected()` action, after the delete logic, add:
```ts
import { useToastStore } from './toastStore';
// at the end of deleteSelected():
useToastStore.getState().addToast('Deleted — Ctrl+Z to undo', 'info');
```

In the `removeComponent(id)` action, after removing, add the same toast.

In the `removeWire(id)` action, after removing, add:
```ts
useToastStore.getState().addToast('Wire deleted — Ctrl+Z to undo', 'info');
```

### Check if `useToastStore` is already imported in circuitStore.ts
If not, add: `import { useToastStore } from './toastStore';`

## Toast Severity
Use `'info'` (not 'warn' or 'error'). The toast should be brief and non-alarming.

## What NOT to do
- Do NOT change the undo/redo logic
- Do NOT add toasts to addComponent, addWire, or paste operations
- Do NOT show toast for Escape-cancel-wire (that's not a delete)
- Only 1 file: store/circuitStore.ts
