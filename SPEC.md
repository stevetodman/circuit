# SPEC: Oscilloscope Time Window Control

Add a time window selector to the oscilloscope so users can zoom in/out on
the waveform time axis. Currently all 4096 samples are shown with no
indication of how much real time they represent.

Samples come in at DT_MS = 1ms each, so 4096 samples = ~4.1 seconds.

## Read First
- `features/oscilloscope/Oscilloscope.tsx` — find the RAF draw loop, the
  `getSamples` call, and the x-axis drawing code. Look for `xStep` and where
  samples are mapped to pixels.
- `features/oscilloscope/scopeBuffer.ts` — `SCOPE_SAMPLES = 4096`, `getSamples(netId)`
  returns Float32Array of ordered samples (oldest → newest).
- The oscilloscope already has `frozen` state and an "Auto" button —
  add the time-window buttons in the same header row.

## Implementation

### Step 1: State

Add a local state to the `Oscilloscope` component:
```tsx
const [timeWindow, setTimeWindow] = useState<number>(1000); // ms
```

The `timeWindow` options are `50`, `200`, `1000`, `4000` (ms).
These correspond to last 50, 200, 1000, or 4000 samples (1 sample = 1ms).

### Step 2: Time-window buttons in the header

In the header row where `Auto` and `⏸/▶` buttons are, add 4 buttons:

```tsx
{[50, 200, 1000, 4000].map((ms) => (
  <button
    key={ms}
    type="button"
    onClick={() => setTimeWindow(ms)}
    className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
      timeWindow === ms
        ? 'bg-violet-500/25 text-violet-300'
        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
    }`}
  >
    {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
  </button>
))}
```

Place this group BEFORE the "Auto" button.

### Step 3: Limit displayed samples in the draw loop

In the RAF `useEffect` that draws the canvas, after calling `getSamples(channel.netId)`,
slice to the last `timeWindow` samples:

```tsx
const rawSamples = getSamples(channel.netId);
const samples = rawSamples.length > timeWindow
  ? rawSamples.subarray(rawSamples.length - timeWindow)
  : rawSamples;
```

Also apply the same slicing where samples are used for the auto-scale min/max pass
(there's a separate loop that reads all channels' samples to compute yMin/yMax).

The `xStep` calculation already uses `samples.length`, so it will automatically
adjust to the displayed count.

### Step 4: X-axis time label

Below the waveform plot (outside the canvas), add a small text label showing
the time span and scale:
```tsx
<div className="text-[9px] font-mono text-white/25 text-center mt-0.5">
  {timeWindow < 1000 ? `${timeWindow}ms` : `${timeWindow / 1000}s`} window
  · {(timeWindow / 10).toFixed(0)}ms/div
</div>
```

Place this just below the `<canvas>` element.

### Step 5: Pass timeWindow to frozen check

The `frozen` feature freezes the canvas. The time window should still be changeable
when frozen (it will take effect when unfrozen). No changes needed for frozen logic.

## Important Notes
- Only touch `features/oscilloscope/Oscilloscope.tsx`
- `timeWindow` is local React state — NOT in any store
- The `subarray` method returns a view without copying, which is efficient
- `getSamples` is called inside the RAF loop that already depends on `channelsRef`
  and `frozenRef` — make sure `timeWindow` is also captured in the RAF via a ref
  so it always reads the latest value:
  ```tsx
  const timeWindowRef = useRef(timeWindow);
  useEffect(() => { timeWindowRef.current = timeWindow; }, [timeWindow]);
  ```
  Then in the RAF loop, use `timeWindowRef.current`.
- Run `pnpm build` — must pass with zero TypeScript errors
