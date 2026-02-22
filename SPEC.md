# SPEC: Oscilloscope PNG Export

Add a "Save PNG" button to the oscilloscope panel that downloads the current
waveform view as a PNG image. Students can use this to document their experiments.

## Read First
- `features/oscilloscope/Oscilloscope.tsx` — find `canvasRef`, the header button
  row (where Auto, freeze buttons are), and the canvas element.
- The canvas already renders the full waveform — we just need `canvas.toDataURL()`
  and trigger a download link.

## Implementation

### Step 1: Add download function

Inside the `Oscilloscope` component (not in a sub-component), add a callback:

```tsx
const handleExportPNG = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'oscilloscope.png';
  a.click();
}, []);
```

### Step 2: Add button to header

In the oscilloscope header (the flex row with Auto, ⏸/▶, and channel + buttons),
add a "↓" or "⤓" download button at the far right, after the existing buttons:

```tsx
<button
  type="button"
  onClick={handleExportPNG}
  title="Save waveform as PNG"
  className="w-7 h-7 rounded flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/10 transition-colors text-[13px]"
>
  ↓
</button>
```

Read the file to find the exact header button pattern and copy it.

### Step 3: Canvas background for export

The canvas currently has a transparent background (or uses CSS for the dark background).
To ensure the PNG has a dark background (not transparent), modify the draw loop:

At the very start of the canvas draw function (before drawing anything else), add:
```tsx
ctx.fillStyle = '#0d0d0f';
ctx.fillRect(0, 0, canvas.width, canvas.height);
```

This ensures the exported PNG has a dark background matching the UI.
Check if this line already exists — if so, don't add it again.

## Important
- Only touch `features/oscilloscope/Oscilloscope.tsx`
- The download happens immediately on click — no confirmation needed
- `canvas.toDataURL()` returns a data URL; creating and clicking an `<a>` element
  is the standard browser download trick
- The downloaded filename should be `oscilloscope.png`
- When `frozen` is true, the canvas still holds the last frame — the export works
  in both frozen and live states
- Run `pnpm build` — must pass with zero TypeScript errors
