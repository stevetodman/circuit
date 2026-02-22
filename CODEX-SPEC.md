# Codex Agent Spec: UI Polish

Read ALL relevant files before writing code. Run `npx tsc --noEmit` after every file.

## Files to Read First

- `features/oscilloscope/Oscilloscope.tsx`
- `features/oscilloscope/scopeBuffer.ts`
- `components/sidebar/StatusBar.tsx`
- `components/sidebar/PropertiesInspector.tsx`
- `components/canvas/WirePreview.tsx`
- `components/KeyboardShortcuts.tsx`
- `store/uiStore.ts`
- `store/circuitStore.ts`

---

## Fix 1 — Oscilloscope Y-axis voltage labels

### `features/oscilloscope/Oscilloscope.tsx`

The canvas renders waveforms but no Y-axis labels. Add voltage labels at regular intervals.

In the canvas draw function, after drawing the grid, render Y-axis text:

```typescript
// Y-axis labels (left side)
const voltageRange = maxV - minV;
const labelCount = 5;
ctx.fillStyle = '#888';
ctx.font = '10px monospace';
ctx.textAlign = 'right';
for (let i = 0; i <= labelCount; i++) {
  const v = minV + (voltageRange * i) / labelCount;
  const y = height - (height * i) / labelCount;
  ctx.fillText(`${v.toFixed(1)}V`, 38, y + 3);
}
```

Also add a time axis at the bottom showing sample count or estimated time:

```typescript
// X-axis: show "4096 samples" label or estimated duration
ctx.textAlign = 'center';
ctx.fillText(`← ${BUFFER_SIZE} samples →`, width / 2, height - 2);
```

---

## Fix 2 — Floating net warning in StatusBar

### `components/sidebar/StatusBar.tsx`

Currently shows sim status dot (idle/running/error). The `simStatus === 'error'` case now includes a `simError` string that says "Floating net — circuit has unconnected nodes" (set by SimController when solver returns singular=true).

Make the error state more visible:

```typescript
{simStatus === 'error' && (
  <span className="text-[10px] text-red-400 truncate max-w-[140px]" title={simError ?? ''}>
    {simError ?? 'Sim error'}
  </span>
)}
```

Read `store/uiStore.ts` to see how `simError` is exposed. Make sure `StatusBar` subscribes to `simError` from `useUIStore`.

---

## Fix 3 — Keyboard shortcut help panel (? key)

### `components/KeyboardShortcuts.tsx`

Add `?` key handler: toggle a help overlay. Add `showHelp: boolean` to `uiStore.ts` with `toggleHelp()` action.

In the handler:
```typescript
if (key === '?') {
  e.preventDefault();
  useUIStore.getState().toggleHelp();
  return;
}
```

### Create `components/HelpOverlay.tsx`

A centered modal overlay listing all keyboard shortcuts. Style to match the dark sidebar theme (`#111113` background, `border-white/[0.08]`):

```tsx
'use client';
import { useUIStore } from '@/store/uiStore';

const SHORTCUTS = [
  ['O', 'Toggle oscilloscope'],
  ['S', 'Toggle schematic view'],
  ['R', 'Rotate selected / dragged component'],
  ['F', 'Zoom to fit'],
  ['1 / 2', 'Camera preset (perspective / top)'],
  ['Delete / Backspace', 'Delete selected'],
  ['Ctrl/Cmd+Z', 'Undo'],
  ['Ctrl/Cmd+Shift+Z', 'Redo'],
  ['Escape', 'Deselect / cancel'],
  ['?', 'Show / hide this panel'],
];

export default function HelpOverlay() {
  const { showHelp, toggleHelp } = useUIStore((s) => ({ showHelp: s.showHelp, toggleHelp: s.toggleHelp }));
  if (!showHelp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={toggleHelp}
    >
      <div
        className="rounded-lg border border-white/[0.12] bg-[#111113] p-6 min-w-[320px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 text-sm font-semibold">Keyboard Shortcuts</span>
          <button onClick={toggleHelp} className="text-white/40 hover:text-white/80 text-lg leading-none">×</button>
        </div>
        <table className="w-full text-xs">
          <tbody>
            {SHORTCUTS.map(([key, desc]) => (
              <tr key={key} className="border-b border-white/[0.05]">
                <td className="py-1.5 pr-4 font-mono text-white/60 whitespace-nowrap">{key}</td>
                <td className="py-1.5 text-white/40">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### `store/uiStore.ts`

Add `showHelp: boolean` (init: `false`) and `toggleHelp: () => void`.

### `app/page.tsx`

Import and mount `<HelpOverlay />` inside the root div (alongside `<KeyboardShortcuts />`).

---

## Fix 4 — Resistor E12 value quick-select

### `components/sidebar/PropertiesInspector.tsx`

Below the resistance NumberInput, add E12 quick-select buttons for common values:

```tsx
const E12_VALUES = [100, 220, 470, 1000, 2200, 4700, 10000, 22000, 47000];

// Render below the resistance input:
<div className="flex flex-wrap gap-1 mt-1">
  {E12_VALUES.map((v) => (
    <button
      key={v}
      className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
      onClick={() => setProperty(selectedId, 'resistance', v)}
    >
      {v >= 1000 ? `${v/1000}k` : `${v}`}
    </button>
  ))}
</div>
```

Only show for `component.type === 'resistor'`.

---

## Fix 5 — LED color+Vf presets

### `components/sidebar/PropertiesInspector.tsx`

Add LED color presets below the color picker:

```tsx
const LED_PRESETS = [
  { label: 'Red',    color: '#ff3333', vf: 2.0 },
  { label: 'Green',  color: '#33cc33', vf: 2.1 },
  { label: 'Blue',   color: '#3366ff', vf: 3.4 },
  { label: 'Yellow', color: '#ffcc00', vf: 2.1 },
  { label: 'White',  color: '#ffffff', vf: 3.2 },
  { label: 'IR',     color: '#660066', vf: 1.6 },
];

// For LED components, show preset buttons:
{comp.type === 'led' && (
  <div className="flex flex-wrap gap-1 mt-1">
    {LED_PRESETS.map(({ label, color, vf }) => (
      <button
        key={label}
        className="text-[9px] px-1.5 py-0.5 rounded font-mono border border-white/10"
        style={{ background: color + '33', color }}
        onClick={() => {
          setProperty(comp.id, 'color', color);
          setProperty(comp.id, 'forwardVoltage', vf);
        }}
      >
        {label}
      </button>
    ))}
  </div>
)}
```

---

## Fix 6 — WirePreview geometry leak on unmount

### `components/canvas/WirePreview.tsx`

Add a cleanup `useEffect` that disposes the current geometry when the component unmounts:

```typescript
const geomRef = useRef<THREE.TubeGeometry | null>(null);

useEffect(() => {
  return () => {
    geomRef.current?.dispose();
  };
}, []);
```

Read the current `WirePreview.tsx` fully — ensure `geomRef` is already declared or add it. Also dispose the old geometry before replacing in the `useFrame` callback.

---

## Verification

```bash
npx tsc --noEmit
pnpm build
```

Manual:
- Press `?` → help panel appears, click outside to close
- Oscilloscope Y-axis shows voltage labels
- Resistor inspector shows E12 buttons
- LED inspector shows color preset buttons
- Floating net error shown in status bar
