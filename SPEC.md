# SPEC: Motor Back-EMF Model + Tactile Switch Open/Close

## Goal
Make the motor and tactile switch components electrically meaningful in the MNA simulation.
Do NOT break any existing functionality. Run `pnpm build` to verify — must pass with zero errors.

---

## 1. Tactile Switch — Open/Close Model

### Current state
Switch is stamped as a fixed low-value resistor (~0.1 Ω) regardless of open/closed state.

### Desired behavior
- When switch is **closed** (clicked ON): stamp as a very low resistance (0.001 Ω) — essentially a short
- When switch is **open** (default, clicked OFF): stamp as a very high resistance (1e9 Ω) — essentially open circuit
- The switch `props.closed` boolean already exists and is toggled on click in the canvas

### Files to change
**`simulation/mna/NetlistBuilder.ts`**
- Find the `case 'switch':` block
- Read `props.closed` (default false = open)
- Stamp `R = props.closed ? 0.001 : 1e9` instead of current hardcoded value

**`features/export/exportNetlist.ts`**
- Update the switch SPICE export to use the same logic:
  - Closed: `R<n> <nodeA> <nodeB> 0.001`
  - Open: `R<n> <nodeA> <nodeB> 1e9`

---

## 2. Motor — DC Motor with Back-EMF

### Current state
Motor is stamped as a resistor (~100 Ω). No dynamic behavior.

### Desired behavior
Model a DC motor as: series resistance (Ra) + back-EMF voltage source.
- **Winding resistance**: Ra = `props.resistance ?? 10` (Ω) — default 10 Ω
- **Back-EMF constant**: Ke = 0.01 V·s/rad — fixed, no need for a prop
- **Motor current**: I = (V_applied - V_backemf) / Ra
- **Angular velocity**: ω = I / Ke (rad/s), clamped to ≥ 0
- **Back-EMF voltage**: V_backemf = Ke × ω

This is a nonlinear element — solve iteratively with Newton-Raphson or use a companion model:
At each DC step, given previous ω_prev, stamp:
- Series resistor Ra between netA and netB
- Voltage source V_backemf in series (or equivalently: modify RHS b vector)

**Simpler companion model (recommended):**
Since the MNA solver does NR already, treat the motor as a linear element each iteration:
1. Compute `V_applied = voltages[netA] - voltages[netB]` from previous solution
2. `I_motor = V_applied / (Ra + 1e-6)` (use total series R)
3. `ω = max(0, I_motor / Ke)`
4. `V_bemf = Ke * ω`
5. Stamp as resistor Ra with a series voltage source V_bemf:
   - Add controlled voltage source stamp to MNA b vector

Actually, simplest correct approach: stamp motor as a Thevenin equivalent:
- R_thevenin = Ra
- V_thevenin = V_bemf (from previous iteration)
- Use standard voltage source + resistor stamps

For the first iteration (no previous state), use V_bemf = 0.

### Files to change

**`simulation/mna/MNASolver.ts`** or **`simulation/mna/NetlistBuilder.ts`**:
- Find motor case, change from pure R stamp to R + V_source stamp
- Keep a module-level `motorState: Map<string, { omega: number }>` in the solver or worker
- Update omega each transient tick

**`simulation/workers/analog.worker.ts`**:
- In the transient loop, after each MNA solve, update motor state for next iteration
- Write motor speed (normalized 0–1) to a visible location if possible

**`features/schematic/symbols/index.tsx`**:
- Improve MotorSymbol: currently a circle with 'M'. Make it look like:
  - Circle with 'M' label (keep)
  - Two terminal leads extending left and right from the circle
  - Terminal dots at both ends
  - Value label below showing resistance (e.g. "10Ω")

**`features/schematic/SchematicView.tsx`**:
- Add motor to the value label function: `case 'motor': return \`Ra=${props.resistance ?? 10}Ω\``

**`features/export/exportNetlist.ts`**:
- Update motor SPICE: export as `R<n>_Ra <a> <mid> {Ra}` + `V<n>_bemf <mid> <b> 0` (0V placeholder since SPICE won't simulate the back-EMF dynamically)

### PropertiesInspector
**`components/sidebar/PropertiesInspector.tsx`**:
- Add motor fields:
  ```
  { kind: 'number', key: 'resistance', label: 'Winding R', default: 10, min: 0.1, max: 1000, step: 0.1, unit: 'Ω' }
  ```

---

## Implementation Notes

- Do NOT change the 3D mesh/visuals for either component — only simulation and schematic symbol
- Do NOT add new dependencies
- Keep all changes minimal and focused
- After implementing, run `pnpm build` — must succeed with zero TypeScript errors
- The switch open/close is the priority — simpler and more impactful for beginners
