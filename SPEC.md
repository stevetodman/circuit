# SPEC: Fullscreen Toggle

## Goal
Add fullscreen support: F11 key + a button in CanvasOverlay toggles browser fullscreen mode.

## Key Facts
- Browser fullscreen API: `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`
- `document.fullscreenElement` is non-null when fullscreen is active
- The F11 key's default browser behaviour (native fullscreen) can be overridden with `e.preventDefault()`
- `CanvasOverlay.tsx` has the zoom +/−/fit buttons — add fullscreen button there
- `KeyboardShortcuts.tsx` handles all keyboard shortcuts

## Changes Required

### `components/CanvasOverlay.tsx`
1. Add `useState(false)` for `isFullscreen`
2. Add a `useEffect` that listens to `document.fullscreenchange` and syncs state:
```tsx
useEffect(() => {
  const handler = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}, []);
```
3. Add a toggle function:
```tsx
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}
```
4. Add a button below the zoom cluster (with separator `<div className="h-px bg-white/10" />`):
   - When not fullscreen: use ⛶ or a simple expand SVG icon, title="Fullscreen (F11)"
   - When fullscreen: use ⛶ or compress SVG icon, title="Exit fullscreen (F11)"
   - Same `btnClass` as zoom buttons

### `components/KeyboardShortcuts.tsx`
Add F11 handler (after the zoom handlers):
```tsx
if (e.key === 'F11') {
  e.preventDefault();
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
  return;
}
```
Note: use `e.key === 'F11'` (not `key.toLowerCase()`), and do NOT add to isInputFocused guard list.

### `components/HelpOverlay.tsx`
Add to the View section:
```ts
['F11', 'Toggle fullscreen'],
```

## What NOT to do
- Do NOT add to uiStore — fullscreen state is purely local to CanvasOverlay
- Do NOT use document.body.requestFullscreen() — use documentElement
- 3 files: CanvasOverlay.tsx, KeyboardShortcuts.tsx, HelpOverlay.tsx
