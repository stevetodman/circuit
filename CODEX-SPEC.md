# Codex Agent Spec: Arduino UX + Drag-Snap Rotation Fix

Read ALL relevant files before writing code. Run `npx tsc --noEmit` after every file.

## Files to Read First

- `store/dragStore.ts`
- `store/circuitStore.ts`
- `types/circuit.ts`
- `components/sidebar/ArduinoPanel.tsx`
- `simulation/workers/arduino.worker.ts`
- `constants/breadboard.ts`

---

## Fix 1 — CRITICAL: Drag-snap ignores component rotation

### Problem

`dragStore.ts` computes pin world positions using `pin.offset` directly, without applying `rotationY`. So rotating a component before placing it causes pins to snap to wrong nodes.

### `store/dragStore.ts`

Find where pin world positions are computed. They use `anchorPos + pin.offset`. Apply rotation:

```typescript
import { PIN_TEMPLATES } from '@/types/circuit';

// In the snap/commit logic, apply rotationY to each pin offset:
function rotateOffset(offset: Vec3, rotationY: number): Vec3 {
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    cos * offset[0] + sin * offset[2],
    offset[1],
    -sin * offset[0] + cos * offset[2],
  ];
}
```

When computing `pinWorldPos = anchorPos + pinOffset`, replace `pinOffset` with `rotateOffset(pinOffset, state.rotationY ?? 0)`.

Read `dragStore.ts` fully to understand where rotation state is stored and how pins are committed. The `rotationY` should already be in drag state (it's set via the 'R' key rotate shortcut during drag). If it's not, add it: `rotationY: number` (default 0) and a `rotate()` action that increments by 90.

Also ensure `KeyboardShortcuts.tsx` 'R' during drag rotates the dragged component (not the selected placed component). Currently 'R' calls `rotateComponent(selectedComponentId)` which only works on placed components. Add: if `dragStore.dragging`, call `dragStore.rotate()` instead.

---

## Fix 2 — Arduino worker: ADC feedback (analog voltages → digital reads)

### Problem

`arduino.worker.ts` runs the avr8js CPU but `syncGPIO` only reads PORT pin states (digital output). It never feeds analog net voltages back as digital HIGH/LOW inputs, so `digitalRead()` on a pin always returns 0 if the AVR hasn't set that port bit.

### `simulation/workers/arduino.worker.ts`

In `syncGPIO()`, after writing outputs to SAB, also read input voltages from SAB and set AVR port pins accordingly:

```typescript
// Read analog net voltages from SAB → set AVR digital input pins
for (const [arduinoPin, netIdx] of Object.entries(pinToNetIdx)) {
  const voltage = digitalStateView[netIdx]; // HIGH/LOW byte from analog worker
  // Set the AVR port pin as input with the corresponding state
  const mapping = UNO_PIN_MAP[Number(arduinoPin)];
  if (!mapping || !ports[mapping.port]) continue;
  const port = ports[mapping.port];
  // avr8js: to set an input pin state, use port.setPin(bit, PinState.High/Low)
  const pinState = voltage > 0 ? PinState.High : PinState.Low;
  port.setPin(mapping.bit, pinState);
}
```

Read the current arduino.worker.ts fully before modifying — it may already have partial GPIO sync. Extend it rather than replacing it.

---

## Fix 3 — Arduino panel: PAUSE/RESUME + better upload UX

### `components/sidebar/ArduinoPanel.tsx`

**PAUSE/RESUME:**

Add `paused` state. Add PAUSE and RESUME buttons next to STOP:

```typescript
const [paused, setPaused] = useState(false);

function pause() {
  workerRef.current?.postMessage({ type: 'PAUSE' });
  setPaused(true);
}
function resume() {
  workerRef.current?.postMessage({ type: 'RESUME' });
  setPaused(false);
}
```

Show PAUSE when running and not paused, RESUME when paused.

**Upload UX:**

- Show filename after file selection (use `file.name`)
- Add a status line: "Running sketch: filename.hex" when running
- After upload success, show cycle counter that updates every second (read from a ref that the worker posts back)

### `simulation/workers/arduino.worker.ts`

Handle `PAUSE` and `RESUME` messages: add `let paused = false`. In the tick burst: `if (paused) return;`. On `PAUSE`: `paused = true`. On `RESUME`: `paused = false`.

Post cycle count back periodically:
```typescript
setInterval(() => {
  if (cpu) self.postMessage({ type: 'CYCLE_COUNT', cycles: cpu.cycles });
}, 1000);
```

---

## Verification

```bash
npx tsc --noEmit
pnpm build
```

Manual:
- Rotate a component (R key) then drag-place → pins snap to correct nodes
- Upload blink.hex → PAUSE/RESUME buttons appear and work
- Filename shows after file selection
