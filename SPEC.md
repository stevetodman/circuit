# SPEC: Oscilloscope Channel Stats (Vpp/Vmin/Vmax)

## Goal
Show Vpp, Vmin, Vmax, and approximate frequency stats for each active
oscilloscope channel, displayed in a compact row below the channel label.

## Current State
- `features/oscilloscope/Oscilloscope.tsx` has 4 channels rendered as color-coded labels
- `features/oscilloscope/scopeBuffer.ts` exports `getSamples(netId)` → ordered Float32Array
- The RAF loop already draws waveforms to the canvas
- Channel labels show live voltage (polled from `voltages[netId]`)
- No stats (Vpp, Vmin, Vmax, freq) are shown anywhere

## Change Required

### `features/oscilloscope/Oscilloscope.tsx`

Add a `computeStats` helper function near the top of the file:

```ts
function computeStats(samples: Float32Array, sampleRateHz = 1000): {
  vmin: number; vmax: number; vpp: number; freqHz: number | null
} {
  if (samples.length === 0) return { vmin: 0, vmax: 0, vpp: 0, freqHz: null };
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] < min) min = samples[i];
    if (samples[i] > max) max = samples[i];
  }
  // Zero-crossing frequency estimate
  const mid = (min + max) / 2;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < mid) !== (samples[i] < mid)) crossings++;
  }
  const freqHz = crossings > 1 ? (crossings / 2) * (sampleRateHz / samples.length) : null;
  return { vmin: min, vmax: max, vpp: max - min, freqHz };
}
```

In the channel label rendering (the RAF loop that updates channel label text),
after updating the live voltage text, also compute stats on the current samples
and render them below each channel color chip.

The stats should be rendered as plain React state (not canvas-drawn), updating
every 500ms via a `setInterval` in a `useEffect`. Store stats in a
`useState<Record<number, { vmin: number; vmax: number; vpp: number; freqHz: number | null }>>({})`.

```tsx
useEffect(() => {
  const id = setInterval(() => {
    const next: typeof statsMap = {};
    for (const ch of channels) {
      const s = getSamples(ch.netId);
      next[ch.netId] = computeStats(s);
    }
    setStatsMap(next);
  }, 500);
  return () => clearInterval(id);
}, [channels]);
```

In the JSX for each channel (the colored label row), add a sub-row below:
```tsx
{stats && stats.vpp > 0.01 && (
  <span className="text-[8px] font-mono text-white/35 ml-1">
    {stats.vpp.toFixed(2)}Vpp
    {stats.freqHz != null && ` ${stats.freqHz >= 1000
      ? `${(stats.freqHz/1000).toFixed(1)}kHz`
      : `${stats.freqHz.toFixed(0)}Hz`}`}
  </span>
)}
```

Only show the stats row if `vpp > 0.01` (non-trivial signal).
Keep the existing live voltage polling in the RAF loop unchanged.

## What NOT to do
- Do NOT modify scopeBuffer.ts
- Do NOT draw stats on the canvas — render them as React JSX beside the channel labels
- Do NOT change the canvas drawing code
- Only 1 file needs changes: Oscilloscope.tsx
