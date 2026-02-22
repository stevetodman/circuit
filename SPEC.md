# SPEC: Additional Example Circuits

## Goal
Add 4 new example circuits to `features/examples/circuits.ts`.
All examples must be self-contained, buildable, and simulate correctly.
Run `pnpm build` to verify — must pass with zero errors.

---

## Study the existing code first

Read `features/examples/circuits.ts` in full before writing anything.
Pay attention to:
- How `topNodeId(col, row)` is used (row 1–5 = top half, row 6–10 = bottom half)
- How `CENTER_COL` is used (typically 32)
- How components and wires are defined
- The export structure at the bottom

Also read `store/circuitStore.ts` to understand `PlacedComponent` shape and valid component types.

---

## Example 1: BJT Common-Emitter Switch

Name: `'bjt-switch'`
Description: "NPN transistor as a digital switch — base resistor controls LED via collector"

Circuit:
- VCC (9V) battery: top terminal to top rail
- Base resistor (10kΩ): from top rail col ~20 to base pin of NPN
- NPN BJT (2N2222 or generic):
  - Base: connected to base resistor
  - Collector: connected to LED anode (through 470Ω collector resistor from VCC)
  - Emitter: connected to GND
- Collector resistor (470Ω): between VCC rail and collector
- LED: collector → LED anode, LED cathode → GND
- GND rail connected to bottom of battery

This demonstrates: transistor as a switch, base current controls collector current.

## Example 2: RC Low-Pass Filter

Name: `'rc-filter'`
Description: "RC low-pass filter — capacitor smooths voltage changes"

Circuit:
- VCC battery (5V) left side
- Resistor (10kΩ) in series from VCC
- Capacitor (100µF) from resistor output to GND
- The output node (junction of R and C) is the filtered output

This demonstrates: how capacitors resist voltage changes, RC time constant.

## Example 3: H-Bridge Motor Driver

Name: `'h-bridge'`
Description: "H-bridge motor control — two switches control motor direction"

Circuit:
- VCC (9V) battery
- Two tactile switches (top switches of H-bridge): S1 from VCC to motor+, S2 from VCC to motor-
- Two more switches or wire connections (bottom): motor+ to GND, motor- to GND
- Motor in center

Note: Since we only have one motor component, simplify to a half-H-bridge:
- Switch S1: VCC → Motor+
- Motor+ → Motor terminal A
- Motor terminal B → GND via second switch S2
- When S1 closed and S2 closed: motor runs

## Example 4: Voltage Divider with Potentiometer

Name: `'pot-voltage-divider'`
Description: "Potentiometer as adjustable voltage divider — wiper picks off variable voltage"

Circuit:
- VCC (5V) battery
- Potentiometer: terminal A to VCC, terminal B to GND, wiper = 0.5 (midpoint = 2.5V)
- LED + 220Ω resistor from wiper to GND (to visualize the wiper voltage)

This is similar to pot-dimmer but framed as a teaching circuit about voltage dividers.

---

## Code Pattern

Follow this exact pattern from existing examples:

```typescript
export const MY_EXAMPLE: ExampleCircuit = {
  id: 'my-example',
  name: 'My Example',
  description: 'What this teaches',
  components: [
    {
      id: 'c1',
      type: 'battery',
      props: { voltage: 9 },
      nodes: { positive: topNodeId(CENTER_COL - 10, 1), negative: topNodeId(CENTER_COL - 10, 2) },
    },
    // ...
  ],
  wires: [
    { id: 'w1', from: topNodeId(X1, Y1), to: topNodeId(X2, Y2) },
    // ...
  ],
};
```

Add each new example to the `EXAMPLE_CIRCUITS` array at the bottom of the file.

---

## ExampleLoader.tsx

In `features/examples/ExampleLoader.tsx`:
- The new examples should automatically appear in the dropdown since they're added to EXAMPLE_CIRCUITS
- No changes needed here unless the dropdown needs grouping

---

## Implementation Notes

- Read the file first — understand the node ID system before writing any code
- Keep circuits simple and educational — they're for beginners
- Make sure all wire connections form valid paths (from valid nodeId to valid nodeId)
- Do NOT add new component types — use only existing types
- Run `pnpm build` — fix all TypeScript errors
- Valid component types: battery, resistor, led, capacitor, diode, bjt, mosfet, switch,
  potentiometer, motor, timer555, inductor, arduino, schottky, zener
