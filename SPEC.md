# SPEC: Shift+Click Multi-Select

## Goal
Shift+click on a component adds it to (or removes it from) the current
multi-selection without clearing the existing selection.

## Current State
- `circuitStore` has `selectedComponentIds: string[]`
- `circuitStore` has `toggleSelectedComponent(id: string)` which adds/removes from the array
- `Ctrl/Cmd+click` already calls `toggleSelectedComponent` in `ComponentRenderer.tsx`
- Shift+click currently does nothing special (falls through to normal select)
- The HelpOverlay documents `Ctrl/Cmd+click` but NOT Shift+click

## Change Required

### `components/canvas/parts/ComponentRenderer.tsx`
Read the file to understand the existing onClick handler that handles Ctrl+click.
Find the `onClick` / `handleClick` function that dispatches to the store.
The existing pattern should look like:
```tsx
if (event.nativeEvent.metaKey || event.nativeEvent.ctrlKey) {
  toggleSelectedComponent(componentId);
  return;
}
```
Add a parallel Shift+click branch BEFORE the default click handler:
```tsx
if (event.nativeEvent.shiftKey) {
  toggleSelectedComponent(componentId);
  return;
}
```
Import `toggleSelectedComponent` from `useCircuitStore` the same way `selectComponent` is imported.

### `components/HelpOverlay.tsx`
Update the Multi-select row in the Navigation section to also mention Shift:
Find the row that says `'Ctrl/Cmd+click component'` and change it to:
`'Ctrl/Cmd or Shift + click'`

## What NOT to do
- Do NOT touch circuitStore — toggleSelectedComponent already exists
- Do NOT change drag behavior — only click events
- Do NOT touch Box-select logic
- Only 2 files need changes: ComponentRenderer.tsx and HelpOverlay.tsx
