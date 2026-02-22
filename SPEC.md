# SPEC: Keyboard Zoom Shortcuts (+/−)

## Goal
Add `+`/`=` and `-` keyboard shortcuts for incremental zoom in/out.

## Current State
- `uiStore` already has `zoomInRequested` and `zoomOutRequested` counters
- `uiStore` already has `requestZoomIn()` and `requestZoomOut()` actions
- `Scene.tsx` already listens to these counters and moves the camera
- `CanvasOverlay.tsx` already calls `requestZoomIn`/`requestZoomOut` via buttons
- `KeyboardShortcuts.tsx` has `F` for zoom-to-fit but NO +/- keys

## Change Required

### `components/KeyboardShortcuts.tsx`
Add two new key handlers in the existing `handleKeyDown` function, after the `F` zoom-to-fit block:

```tsx
// Zoom in/out
if (key === '+' || key === '=') {
  e.preventDefault();
  requestZoomIn();
  return;
}
if (key === '-') {
  e.preventDefault();
  requestZoomOut();
  return;
}
```

`requestZoomIn` and `requestZoomOut` are already imported from `useUIStore` (via `useUIStore.getState()`).
Pattern to follow: look at how `requestZoomToFit` is called in the file and do the same.

### `components/HelpOverlay.tsx`
Add `['+/−', 'Zoom in / out']` row to the Navigation section rows array.

## What NOT to do
- Do NOT touch uiStore — requestZoomIn/requestZoomOut already exist
- Do NOT touch Scene.tsx — it already handles these counters
- Do NOT touch CanvasOverlay — it already has zoom buttons
- Only 2 files need changes: KeyboardShortcuts.tsx and HelpOverlay.tsx
