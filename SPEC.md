# SPEC: P3.a — Oscilloscope Upgrades

Implement four oscilloscope improvements in `features/oscilloscope/Oscilloscope.tsx` and related files.
Run `npx tsc --noEmit` before finishing to confirm zero TypeScript errors.

---

## P3.1 — Dual Measurement Cursors

### Goal
Add two draggable vertical cursor lines on the oscilloscope canvas. When both are placed, show:
- **ΔT** = |t2 − t1| in ms
- **ΔV** = |v2 − v1| measured on the first active channel at each cursor x
- **freq** = 1/ΔT

### Implementation

**State / refs to add inside the Oscilloscope component:**

```ts
const cursor1Ref = useRef<number | null>(null);  // sample-fraction 0..1
const cursor2Ref = useRef<number | null>(null);
const [cursorsReadout, setCursorsReadout] = useState<{ dt: number; dv: number; freq: number } | null>(null);
```

**Rendering in the canvas draw loop (inside the existing RAF draw function):**
- If cursor1Ref.current !== null, draw a vertical dashed line in rgba(255,255,100,0.85) at the appropriate canvas x
- If cursor2Ref.current !== null, draw a vertical dashed line in rgba(100,200,255,0.85) at the appropriate canvas x
- After drawing both: compute dtMs = |cursor2 - cursor1| * timeWindowMs; interpolate first channel voltage at each cursor; compute dv; call setCursorsReadout({ dt: dtMs, dv, freq: dtMs > 0 ? 1000/dtMs : 0 })

**Mouse interaction:**
- Left-click on canvas: place cursor 1 at that x-fraction. If shift-click or right-click: place cursor 2.
- While dragging (mousedown + move): move the nearest cursor.
- Add a small "× cursors" button (only visible when at least one cursor is set) that resets both to null.

**Readout display:**
- Below the existing cursorReadout line, show a second line when both cursors are placed:
  `C1→C2: ΔT=3.2ms  ΔV=1.45V  f=312Hz`
- Display it in the same readout area (the floating div/span that shows cursor voltage).

---

## P3.2 — Trigger Level + Edge

### Goal
Add a trigger control: level (volts) + edge (rising/falling). When enabled, only display a stable snapshot — capture one time-window of samples after the signal crosses the trigger level on the specified edge.

### Implementation

**State to add:**
```ts
const [triggerEnabled, setTriggerEnabled] = useState(false);
const [triggerLevel, setTriggerLevel] = useState(0);
const [triggerEdge, setTriggerEdge] = useState<'rising' | 'falling'>('rising');
const triggerCaptureRef = useRef<Map<number, Float32Array> | null>(null); // netId → captured buffer
const prevTriggerVoltRef = useRef<number | null>(null);
```

**Logic in the RAF render loop (or in the buffer sampling effect):**
When triggerEnabled and triggerCaptureRef.current is null (not yet captured):
1. Read the current voltage of channel 0's netId from voltages SAB
2. Compare with prevTriggerVoltRef.current using triggerEdge:
   - rising: prev < triggerLevel && curr >= triggerLevel → fire
   - falling: prev > triggerLevel && curr <= triggerLevel → fire
3. On fire: for each active channel, snapshot getSamples(ch.netId) into a new Float32Array and store in triggerCaptureRef.current
4. Update prevTriggerVoltRef.current = curr each tick

When triggerEnabled and triggerCaptureRef.current is not null:
- The draw loop uses the captured buffers instead of the live ring buffer (pass the captured map to the draw function or check inside draw)
- Add a "Re-arm" button that sets triggerCaptureRef.current = null to capture next trigger event

**UI controls (add to the oscilloscope controls bar):**
- A small "Trig" toggle button same style as existing "Freeze" button
- When trigger is ON, show inline:
  - A number input for trigger level (range -15 to 15, step 0.1)
  - A ↑/↓ toggle for rising/falling edge
  - A horizontal dashed line on the canvas at the trigger level in rgba(255,180,50,0.7)
  - A "Re-arm" button to clear the captured snapshot

---

## P3.3 — User-Selectable Channel Colors

### Goal
Clicking a channel's color swatch opens a 7-color picker. The chosen color is saved in scopeStore.

### Add to `store/scopeStore.ts`

Add action:
```ts
updateChannelColor: (netId: number, color: string) => void;
```
Implementation:
```ts
updateChannelColor: (netId, color) =>
  set((s) => ({
    channels: s.channels.map((ch) => ch.netId === netId ? { ...ch, color } : ch),
  })),
```

### UI in `Oscilloscope.tsx`

**7 preset colors:**
```ts
const PICKER_COLORS = ['#56c2ff', '#ffd166', '#9b5de5', '#06d6a0', '#ff6b6b', '#ff9f1c', '#ffffff'];
```

**State:**
```ts
const [pickingColorForNetId, setPickingColorForNetId] = useState<number | null>(null);
```

In each channel label row, the existing colored indicator should become a `<button>` that sets `pickingColorForNetId = ch.netId`.
When `pickingColorForNetId === ch.netId`, render a small absolute-positioned div with 7 colored circles (16px diameter, 4px gap). Clicking a circle calls `updateChannelColor(netId, color)` and closes picker. Clicking elsewhere closes it.

---

## P3.4 — Export CSV

### Goal
Add a "↓ CSV" button to the oscilloscope header. Downloads scope buffer as `scope-capture.csv` with columns: `time_ms,ch1_V,ch2_V,...`

### Function to add in `Oscilloscope.tsx`

```ts
function downloadScopeCSV(channels: Array<{ netId: number; color: string; label?: string }>, timeWindowMs: number) {
  const cols = channels.map((ch) => getSamples(ch.netId));
  const sampleCount = Math.max(...cols.map((c) => c?.length ?? 0));
  if (sampleCount === 0) return;

  const header = ['time_ms', ...channels.map((_, i) => `ch${i + 1}_V`)].join(',');
  const rows: string[] = [header];
  for (let i = 0; i < sampleCount; i++) {
    const t = ((i / sampleCount) * timeWindowMs).toFixed(3);
    const vals = cols.map((c) => (c && i < c.length ? c[i].toFixed(4) : '0'));
    rows.push([t, ...vals].join(','));
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scope-capture.csv';
  a.click();
  URL.revokeObjectURL(url);
}
```

`getSamples` is imported from `@/features/oscilloscope/scopeBuffer`.
Add an "↓ CSV" button in the oscilloscope header, enabled when channels.length > 0.

---

## Files to Modify

- `features/oscilloscope/Oscilloscope.tsx` — all four features
- `store/scopeStore.ts` — add updateChannelColor (P3.3)

## Type-check

```bash
npx tsc --noEmit
```
Fix all errors. Do not leave console.log or TODO comments.
