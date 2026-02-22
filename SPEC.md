# SPEC: More Example Circuits

Add 5 new pre-built example circuits to the ExampleLoader gallery.
These cover components not yet shown in the 12 existing examples.

## Read First
- `features/examples/circuits.ts` — read the ENTIRE file to understand the
  ExampleCircuit type, node helper functions (topNodeId, bottomNodeId, mainNodeId, etc.),
  and the exact format of existing circuits. Use 'bjt-switch-demo' and 'blinker-555-demo'
  as templates for multi-component circuits with wires.

## What to Add

Append 5 new entries to the `EXAMPLE_CIRCUITS` array in `features/examples/circuits.ts`.
Do NOT modify any existing entries.

**Pin name reference** (verified from NetlistBuilder.ts):
- battery: `pos`, `neg`
- resistor: `p1`, `p2`
- led: `anode`, `cathode`
- capacitor: `pos`, `neg`
- diode: `anode`, `cathode`
- mosfet: `gate`, `drain`, `source`
- npn BJT: `base`, `collector`, `emitter`
- switch: `p1`, `p2`

**Node ID helpers** (already defined in circuits.ts, use these):
- `mainNodeId(col, row)` — main grid, row 0=a … row 4=e, row 5=f … row 9=j
- OR use the string format `bb-{row}{col}` where row is a letter a-j

---

### 1. `mosfet-led` — MOSFET Switch

**Name:** `MOSFET Switch`
**Description:** `N-channel MOSFET controlled by a voltage divider gates an LED`

Layout (cols 20–42, rows c/d/e):
- 9V Battery: pos→bb-c20, neg→bb-c22
- 10kΩ R1 (gate voltage divider top): p1→bb-c25, p2→bb-c27
- 10kΩ R2 (gate voltage divider bottom): p1→bb-c27, p2→bb-e27 (ground)
- MOSFET (N-channel): gate→bb-c27, drain→bb-c35, source→bb-e35 (ground)
- 220Ω R3 (LED current limiting): p1→bb-c32, p2→bb-c35
- LED: anode→bb-c30, cathode→bb-c32
- Wires to connect battery pos→LED, battery neg→ground rail, divider bottom→ground, source→ground

Keep it simple — place components in a sensible layout that shows the MOSFET gating current to the LED.
Read an existing 4–5 component example to understand how wires are structured.

---

### 2. `diode-demo` — Diode Polarity Demo

**Name:** `Diode Forward Bias`
**Description:** `Diode allows current in one direction only — shows 0.7V forward voltage drop`

Layout (cols 25–35):
- 9V Battery: pos→col 25, neg→col 27
- 1kΩ resistor: between battery pos and diode anode (col 25–28)
- Diode (1N4148): anode→col 28, cathode→col 30 (connect cathode back to battery neg via wire)
- Simple closed loop: battery → resistor → diode → back to battery

This shows the diode conducting with the ~0.7V forward voltage drop. Simple 3-component loop.

---

### 3. `capacitor-charge` — Capacitor Charging Curve

**Name:** `RC Charge / Discharge`
**Description:** `470µF capacitor charges through 10kΩ — watch the voltage curve on the oscilloscope`

Layout (cols 25–40):
- 9V Battery: pos and neg terminals
- 10kΩ resistor in series
- 470µF (0.000470 F) capacitor

Use value `0.000470` for capacitor (470µF in farads).

Connect battery pos → resistor → capacitor pos → battery neg (simple RC series loop).
This gives a τ = R·C = 10000 × 0.000470 = 4.7 seconds — nice slow charge visible on scope.

---

### 4. `parallel-leds` — Two LEDs in Parallel

**Name:** `Parallel LEDs`
**Description:** `Two LEDs with individual resistors in parallel — both glow at same brightness`

Layout (cols 20–45):
- 9V Battery
- Red LED + 220Ω resistor (one branch)
- Green LED (or second LED with `color: '#22cc44'`) + 220Ω resistor (second branch)
- Both branches connected in parallel between battery pos and neg

LED color property: `color: '#ff3333'` for red, `color: '#22cc44'` for green.
Check an existing LED component in circuits.ts to see the `props` field format.

---

### 5. `voltage-divider-leds` — Voltage Divider with Two LEDs

**Name:** `Voltage Divider + 2 LEDs`
**Description:** `Voltage divider feeds two LEDs at different brightness levels`

Layout (cols 22–48):
- 9V Battery
- R1 (1kΩ) from battery pos to midpoint
- R2 (4.7kΩ) from midpoint to battery neg
- LED1 + 100Ω from battery pos (full voltage)
- LED2 + 100Ω from midpoint (divided voltage, dimmer)

Midpoint voltage = 9 × (4700/(1000+4700)) ≈ 7.5V, so LED2 will be slightly dimmer.
Shows Thevenin + LED load interplay.

---

## Important Notes

- Read the existing circuit format carefully before writing — the wire format uses `{ id, fromNodeId, toNodeId, color }` and node IDs use the exact helper functions from the top of the file
- Use unique IDs for all components and wires: prefix with the circuit ID (e.g., `mosfet-led-battery`, `mosfet-led-r1`)
- Component `type` values: `'battery'`, `'resistor'`, `'led'`, `'capacitor'`, `'diode'`, `'mosfet'`
- The `rotationY` field is 0 (default orientation) unless rotated
- Both `nodes` (flat map) and `components` (map) and `wires` (map) must be consistent
- For LEDs: include a `props: { color: '#ff3333' }` field for red
- Run `pnpm build` — must pass with zero TypeScript errors
