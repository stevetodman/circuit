# SPEC: Wiring Validation Toasts

## Goal
Show a helpful toast when the user attempts an invalid wire connection:
1. Clicking the same pin twice (self-wire)
2. Wiring two pins that are already on the same net (redundant wire)

## Current State
- Wiring flow: user clicks pin A → `selectNode(pinA.nodeId)` → clicks pin B → `addWire(fromId, toId)`
- `addWire` is in `circuitStore.ts`
- `addWire` currently adds the wire with no validation
- Toast system: `useToastStore` with `addToast(message, severity)`
- `toastStore` is at `store/toastStore.ts`

## Changes Required

### `store/circuitStore.ts` — in the `addWire` action
Add validation before creating the wire:

```ts
addWire(fromId, toId, color?) {
  // Self-wire guard
  if (fromId === toId) {
    useToastStore.getState().addToast("Can't connect a pin to itself", 'warn');
    return;
  }
  // Same-net guard
  const fromNode = get().nodes[fromId];
  const toNode = get().nodes[toId];
  if (fromNode?.netId != null && fromNode.netId === toNode?.netId) {
    useToastStore.getState().addToast('Those pins are already connected', 'warn');
    return;
  }
  // ... existing wire creation logic
}
```

### `components/KeyboardShortcuts.tsx` — no change needed

## Import needed in circuitStore.ts
```ts
import { useToastStore } from './toastStore';
```
Check if this import already exists before adding it.

## What NOT to do
- Do NOT modify the wiring UI components (Pin.tsx, Scene.tsx)
- Do NOT add a modal or dialog — just a toast
- Only 1 file needs changes: store/circuitStore.ts
- Severity should be 'warn' not 'error' (it's user guidance, not a crash)
