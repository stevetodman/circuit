# SPEC: 555 Timer Monostable Mode + Improved Behavioral Model

## Goal
The 555 timer currently only computes astable (oscillator) frequency. Add monostable
(one-shot) mode so a trigger pulse produces a timed output pulse.
Also improve the astable model to use the proper SR-latch threshold logic.
Run `pnpm build` to verify — must pass with zero errors.

---

## Background: 555 Timer Modes

### Astable (current)
- Pins: VCC(8), GND(1), OUT(3), TRIG(2)=THRESH(6), DISCH(7), R1 between VCC and DISCH,
  R2 between DISCH and TRIG/THRESH, C between TRIG and GND, CTRL(5) optional.
- Frequency: `f = 1.44 / ((R1 + 2*R2) * C)`
- Duty cycle: `D = (R1 + R2) / (R1 + 2*R2)`
- Current: behavioral toggle when capacitor crosses 1/3 VCC (TRIG) or 2/3 VCC (THRESH)

### Monostable (new)
- TRIG pin (2) is normally HIGH (above 1/3 VCC)
- When TRIG is pulled LOW momentarily, output goes HIGH for time T = 1.1 * R * C
- After time T, output returns LOW and stays there until next trigger
- R is between VCC and THRESH(6), C is between THRESH and GND

---

## Mode Detection

Detect mode from the circuit topology in `simulation/workers/analog.worker.ts`:

The 555 component has pins: `vcc`, `gnd`, `out`, `trig`, `thresh`, `disch`, `ctrl`, `reset`.

**Astable detection** (current behavior, keep):
- TRIG and THRESH are connected to the same net (netId of trig == netId of thresh)
- DISCH is connected between R1 and R2

**Monostable detection**:
- TRIG net is different from THRESH net
- OR: use a heuristic — if a component connected to TRIG net is a voltage source/signal
  that can go low (i.e., not the same RC network as THRESH)

**Simplest approach**: Check if `netIds.trig === netIds.thresh`.
- If same → astable mode (current behavior)
- If different → monostable mode

---

## Implementation in `simulation/workers/analog.worker.ts`

### Current 555 code location
Find the 555 timer handling block — it reads component props (R1, R2, capacitance),
computes frequency, and drives the output net via digitalStates or voltageView.

### Changes needed

**1. Read TRIG voltage from SAB**
```typescript
const trigNetIdx = netIds.trig;
const trigVoltage = voltageView[trigNetIdx] ?? 0;
const vcc = voltageView[netIds.vcc] ?? 5;
const trigThreshold = vcc / 3;
```

**2. Monostable state machine**
Add per-555-component state (keyed by component ID):
```typescript
const monoState: Map<string, {
  outputHigh: boolean,
  pulseEndTime: number,   // simTimeMs when output should go low
  wasTriggered: boolean,  // to detect falling edge
}> = new Map();
```

Each transient tick (1ms interval):
```typescript
if (isMonostable) {
  const state = monoState.get(id) ?? { outputHigh: false, pulseEndTime: 0, wasTriggered: false };
  const T_ms = 1100 * R * C;  // 1.1 * R * C in milliseconds

  // Falling edge detection on TRIG
  const trigLow = trigVoltage < trigThreshold;
  if (trigLow && !state.wasTriggered && !state.outputHigh) {
    // Rising edge of trigger (TRIG went low) — start pulse
    state.outputHigh = true;
    state.pulseEndTime = simTimeMs + T_ms;
  }

  // Check if pulse time expired
  if (state.outputHigh && simTimeMs >= state.pulseEndTime) {
    state.outputHigh = false;
  }

  state.wasTriggered = trigLow;
  monoState.set(id, state);

  // Write output
  const outNetIdx = netIds.out;
  voltageView[outNetIdx] = state.outputHigh ? vcc : 0;
  digitalStateView[outNetIdx] = state.outputHigh ? 1 : 0;
}
```

**3. Improved astable model**
Replace the simple frequency-based toggle with threshold-based logic:
```typescript
if (isAstable) {
  // Read capacitor voltage from the trig/thresh net
  const capVoltage = voltageView[netIds.trig] ?? 0;
  const upperThresh = vcc * 2 / 3;
  const lowerThresh = vcc / 3;

  const state = astableState.get(id) ?? { outputHigh: true };

  if (state.outputHigh && capVoltage >= upperThresh) {
    state.outputHigh = false;
  } else if (!state.outputHigh && capVoltage <= lowerThresh) {
    state.outputHigh = true;
  }

  astableState.set(id, state);
  voltageView[netIds.out] = state.outputHigh ? vcc : 0;
  digitalStateView[netIds.out] = state.outputHigh ? 1 : 0;
}
```

Note: The capacitor voltage is already being solved by the MNA transient solver (backward Euler).
The 555 just reads it and switches output accordingly. This is correct behavioral modeling.

**4. Props for monostable**
The monostable 555 uses:
- `props.r1` — timing resistor (Ω), use existing r1 field
- `props.capacitance` — timing capacitor (µF), use existing field

No new props needed.

---

## PropertiesInspector

In `components/sidebar/PropertiesInspector.tsx`:
- The timer555 fields already exist: `r1`, `r2`, `capacitance`
- Add a mode indicator (read-only display) if you can detect the mode from props,
  but this is optional — skip if it requires significant changes

---

## Example Circuit (add to circuits.ts)

Add a monostable 555 example: "555 One-Shot Timer"
- VCC(9V) → 555 VCC
- 555 GND → GND
- 555 TRIG connected to a switch (normally open = HIGH via pull-up)
- 555 THRESH and CTRL to GND through cap (10µF)
- R between VCC and THRESH (100kΩ) → T = 1.1 * 100k * 10µF = 1.1s
- 555 OUT → LED → GND

In `features/examples/circuits.ts`, add entry `'555-monostable'` following the same pattern
as existing examples.

---

## Verification
1. `pnpm build` must pass
2. Astable example (blink) should continue to work correctly
3. In monostable mode, OUT should pulse HIGH for ~T=1.1*R*C seconds after TRIG falls low
4. No TypeScript errors
