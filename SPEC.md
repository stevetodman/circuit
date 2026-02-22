# SPEC: Oscilloscope UX — Pin-click "Add to Scope"

Right now adding a net to the oscilloscope requires: open scope → click + → know the net ID number.
This is confusing. Fix it: add an "Add to Scope" button next to each pin in the PropertiesInspector.

## Read First
- `components/sidebar/PropertiesInspector.tsx` — understand pin display, live readings, component selection
- `store/scopeStore.ts` — addChannel(netId, color), channels[], removeChannel
- `features/oscilloscope/Oscilloscope.tsx` — understand channel display, colors

## Part 1: "Add to Scope" button per pin in PropertiesInspector

In `components/sidebar/PropertiesInspector.tsx`, find where pins are displayed (the live V/I readings section).

For each pin that has a valid `netId` (not null), add a small "📊" button beside it:
```tsx
<button
  type="button"
  onClick={() => {
    const SCOPE_COLORS = ['#7c6fff', '#4ecdc4', '#ff6b6b', '#ffd93d'];
    const usedCount = useScopeStore.getState().channels.length;
    useScopeStore.getState().addChannel(netId, SCOPE_COLORS[usedCount % SCOPE_COLORS.length]);
  }}
  title="Add to oscilloscope"
  className="ml-1 text-[10px] opacity-40 hover:opacity-90 transition-opacity"
>
  📊
</button>
```

Import `useScopeStore` from `@/store/scopeStore`.

Check if this pin's netId is already in scope; if so, show a filled/active style instead:
```tsx
const channels = useScopeStore((s) => s.channels);
const isInScope = channels.some((ch) => ch.netId === netId);
// Style: isInScope → opacity-90 text-[#7c6fff], else → opacity-35 hover:opacity-80
```

Read `PropertiesInspector.tsx` fully to find the exact pin listing section and integrate naturally.
The pins section shows live voltage readings — the add-to-scope button belongs right there.

## Part 2: Show channel voltage in scope header

In `features/oscilloscope/Oscilloscope.tsx`, each channel row shows a color swatch and net ID.

Read the file. Find the channel row rendering. Import `voltages` from `@/simulation/SimBridge`.
Add live voltage text next to each channel row using a `useRef` + direct DOM update in the existing
animation/RAF loop. Find where the canvas draws and add:

```tsx
// Simple approach: show voltage in the channel label as static React state
// Add a state: const [liveV, setLiveV] = useState<number[]>([]);
// In the existing requestAnimationFrame loop (or useEffect), update liveV
// Then render: <span>{liveV[i] !== undefined ? `${liveV[i].toFixed(2)}V` : ''}</span>
```

Look at the existing code — it may already have a RAF loop for drawing. Add the voltage readout there.

## Part 3: "Clear all channels" button in oscilloscope

In `store/scopeStore.ts`, add `clearChannels: () => void`:
```ts
clearChannels: () => set({ channels: [] }),
```
Also clear the ring buffers — look at how `removeChannel` clears its buffer, do the same for all.

In `features/oscilloscope/Oscilloscope.tsx`, add a small "✕ all" button in the scope header.
Read the file to find the header and add it next to the close button.

## Important notes
- Import `useScopeStore` with individual selectors (NOT inline objects) to avoid React 18 crashes
- `PropertiesInspector.tsx` uses `voltageView` (Float32Array from SimBridge) — the scopeStore uses `netId`
- Max 4 scope channels already enforced by scopeStore — when `channels.length >= 4`, disable add button
- The `addChannel` action already exists in scopeStore — just call it with the right netId + color

Run `pnpm build` — must pass with zero errors.
