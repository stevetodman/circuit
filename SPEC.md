# SPEC: Module-Circuit Linking + Starter Circuits for Modules 5–11

## Goal
Wire up autoLoadId on all 11 module definitions and add missing starter circuits.

## Read First
- `features/modules/definitions.ts` — 11 module definitions
- `features/examples/circuits.ts` — existing circuits + format

## Part 1: Add autoLoadId to all module definitions

Read `features/modules/definitions.ts`. Currently only module 4 (bodyguard) has `autoLoadId`.

Add these autoLoadId values to the matching modules:

```
'hello-electricity'  → autoLoadId: 'battery-only'
'complete-circle'    → autoLoadId: 'battery-resistor'
'first-led'          → autoLoadId: 'battery-led-resistor'
'bodyguard'          → autoLoadId: 'led-resistor'  (already set)
'dimmer'             → autoLoadId: 'pot-dimmer'
'take-control'       → autoLoadId: 'switch-led'
'voltage-sharing'    → autoLoadId: 'voltage-divider-demo'
'memory-cell'        → autoLoadId: 'rc-timing'
'electronic-switch'  → autoLoadId: 'bjt-switch-demo'
'blinker'            → autoLoadId: 'blinker-555-demo'
'arduino-hello'      → autoLoadId: 'arduino-blink'
```

## Part 2: Add missing starter circuits to features/examples/circuits.ts

The file already has: battery-only, battery-resistor, battery-led-resistor, ohms-law-demo, led-resistor.

Add these new circuits using the same pattern as existing ones. Read the file carefully to understand the PlacedComponent format, pin arrays, and node ID scheme.

**Node ID rules:**
- Main grid: `bb-{row}{col}` where rows = a-j, cols = 1-63
- Power rails: `bb-tp-{n}` (top positive), `bb-tn-{n}` (top negative)

**'pot-dimmer'** — Battery + potentiometer + LED (no series resistor — pot handles current limiting)
- Battery at cols 5-6, potentiometer at col 15 (3 pins: a15=pin1, c15=wiper, e15=pin2), LED at col 25

**'switch-led'** — Battery + tactile switch + 220Ω resistor + LED
- Battery at cols 5-6, switch at cols 15-16, resistor at cols 20-21, LED at col 25

**'voltage-divider-demo'** — Battery + two 10kΩ resistors in series + LED at midpoint
- Battery at cols 5-6, R1 at cols 15-16, R2 at cols 20-21, probe point at col 18

**'rc-timing'** — Battery + 10kΩ resistor + 100µF capacitor
- Battery at cols 5-6, resistor at cols 15-16, capacitor at cols 20-21
- These are the components for the scope to show charging curve

**'bjt-switch-demo'** — Battery + NPN BJT + LED + 10kΩ base resistor + 220Ω LED resistor
- Battery at cols 5-6, BJT at col 20 (base=row b, collector=row a, emitter=row c), resistors and LED around it

**'blinker-555-demo'** — Battery + 555 timer + LED + timing resistors + capacitor
- Battery at cols 5-6, timer555 at cols 15-18 (8 pins in 2 rows), LED at col 25

**'arduino-blink'** — Arduino + LED + 220Ω resistor
- Arduino at cols 10-23 (wide component), LED at col 28, resistor at cols 26-27

For each circuit, keep it minimal — just the parts needed, placed in a horizontal line at rows c-e, centered around col 30. You don't need wires for the starter circuit — place just the components so the user can wire them.

Actually, looking at the existing circuits in the file, they DO include wires. Include wires connecting the components. Look at 'battery-led-resistor' as the template for how to write wires.

Run `pnpm build` — must pass with zero errors.
