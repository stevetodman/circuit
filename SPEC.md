# SPEC: Canvas PNG Screenshot Export

## Goal
Add a camera/screenshot button to CanvasOverlay that downloads the current 3D canvas as a PNG.

## Key Facts
- The R3F `<Canvas>` element renders to a `<canvas>` HTML element
- `canvas.toDataURL('image/png')` gives the PNG data URL
- WebGL canvases have `preserveDrawingBuffer: false` by default — reading pixels after render yields blank
- Must enable `preserveDrawingBuffer: true` at Canvas creation time
- `Scene.tsx` is where `<Canvas>` is created
- `CanvasOverlay.tsx` has the zoom +/−/fit buttons — add camera button there
- CanvasOverlay is a plain React component (not inside R3F), so no useThree

## Changes Required

### `components/canvas/Scene.tsx`
Find the `<Canvas>` JSX element and add the `gl` prop:
```tsx
<Canvas gl={{ preserveDrawingBuffer: true }} ...>
```

### `components/CanvasOverlay.tsx`
1. Add a screenshot button above the zoom cluster (or below with a separator)
2. On click, find the canvas element and download it:

```tsx
function handleScreenshot() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'circuit.png';
  a.click();
}
```

3. Button uses same `btnClass` as existing zoom buttons
4. Use a camera SVG icon or the unicode character 📷 — but prefer a simple SVG like:
```tsx
<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
  <path d="M6 1L5 3H2a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1h-3L10 1H6zm2 3a3 3 0 110 6 3 3 0 010-6z"/>
</svg>
```
5. Add a `<div className="h-px bg-white/10" />` separator between screenshot and zoom buttons

## What NOT to do
- Do NOT add to sidebar or toolbar
- Do NOT use R3F hooks in CanvasOverlay (not inside Canvas context)
- Do NOT use useThree — just query `document.querySelector('canvas')`
- Only 2 files: Scene.tsx and CanvasOverlay.tsx
