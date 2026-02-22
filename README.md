# Circuit Sandbox

A fully in-browser, 3D electronics simulator built on a custom MNA solver, avr8js, React Three Fiber, and SharedArrayBuffer. Place components on a virtual breadboard, draw wires, and watch voltages update in real time — no server, no plugins, no install.

---

## What It Is

Circuit Sandbox is a physics-based circuit simulator that runs entirely in the browser. It uses a hand-written Modified Nodal Analysis (MNA) engine with Newton-Raphson convergence for nonlinear components (diodes, BJTs), Backward Euler integration for capacitors, and a behavioral 555 timer model. Arduino Uno simulation runs at full 16 MHz via avr8js — upload a compiled `.hex` and watch GPIO pins toggle live components.

Simulation data flows through a `SharedArrayBuffer` directly into Three.js `useFrame` loops, keeping the solver completely decoupled from React rendering.

---

## Key Features

- **Real-time MNA simulation** — DC operating point + 1 ms transient tick; updates on every topology change
- **Newton-Raphson nonlinear solver** — Shockley diode model for LEDs, Ebers-Moll for BJTs (60 iterations, 1e-9 tolerance)
- **Capacitor transient integration** — Backward Euler companion model; 1 ms `setInterval` loop activates when capacitors are present
- **555 timer behavioral model** — astable frequency = 1.44 / ((R1 + 2R2) * C); output drives LEDs in real time
- **Arduino Uno simulation** — avr8js ATmega328P at 16 MHz; GPIO state flows through SharedArrayBuffer to the analog world
- **3D interactive breadboard** — standard 63-column, 10-row layout with two power rails; all geometry via InstancedMesh
- **Current-flow wire animation** — pulsing animation on wires derived from live branch currents in the SAB
- **4-channel oscilloscope** — overlay panel with Y-axis voltage labels, auto-scale, and 4096-sample ring buffers per net
- **Schematic view** — ELK-laid-out SVG overlay with IEEE symbols; press `S` to toggle
- **Copy / paste / multi-select** — Ctrl+C/V/A/D; clipboard survives rotation; clears automatically on circuit load
- **SPICE export** — download a `.cir` file covering all 9 component types with model definitions appended
- **Auto-save** — circuit topology persisted to `localStorage` on every change (500 ms debounce)
- **Undo / redo** — 100-step history via zundo; only topology is snapshotted, not UI state
- **Example circuits** — built-in blink, voltage divider, and RC examples loadable from the sidebar
- **Toast notifications** — solver errors and Newton-Raphson non-convergence warnings surface in the UI

---

## Getting Started

```bash
# Prerequisites: Node.js 20+, pnpm
pnpm install
pnpm dev
# Open http://localhost:3000
```

Production build:

```bash
pnpm build
pnpm start
```

> **Note:** SharedArrayBuffer requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`. These headers are set automatically in `next.config.ts`.

---

## Using the Simulator

1. **Place a component** — drag a part from the left sidebar onto the breadboard. It snaps to the nearest pin.
2. **Draw a wire** — click a pin to enter wiring mode, then click a second pin to connect. Press `Escape` to cancel.
3. **Inspect / configure** — click a placed component to open the Properties Inspector. Edit resistance, voltage, capacitance, or BJT gain.
4. **Simulate** — simulation runs automatically. The status dot in the bottom-left shows `running` (green), `error` (red), or `idle`.
5. **Oscilloscope** — press `O` to open. Right-click a pin on the board (or use the sidebar button) to add a net to a channel.
6. **Schematic** — press `S` to overlay an auto-generated IEEE schematic of the current circuit.

---

## Component Palette

| Component | Type | Pins | Electrical model |
|---|---|---|---|
| Resistor | `resistor` | p1, p2 | Linear resistor (R) |
| LED | `led` | anode, cathode | Shockley diode (Is=1e-14, N=1.5) |
| Capacitor | `capacitor` | pos, neg | Backward Euler companion |
| BJT (NPN) | `bjt` | base, collector, emitter | Ebers-Moll NPN (simplified) |
| 555 Timer | `timer555` | vcc, gnd, out, trig | Behavioral: f = 1.44/((R1+2R2)C) |
| Arduino Uno | `arduino` | d0–d13, a0–a5 | avr8js ATmega328P at 16 MHz |
| Battery | `battery` | pos, neg | Ideal DC voltage source |
| DC Motor | `motor` | p1, p2 | Resistor model (10 Ω default) |
| Tactile Switch | `tactileSwitch` | p1, p2 | SPICE SW model (Ron=0.01, Roff=1e9) |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected component or wire |
| `R` | Rotate selected component (or component being dragged) |
| `Ctrl+C` | Copy selected component(s) |
| `Ctrl+V` | Paste clipboard (shifted 5 columns right) |
| `Ctrl+A` | Select all components |
| `Ctrl+D` | Duplicate (copy + paste in one step) |
| `O` | Toggle oscilloscope panel |
| `S` | Toggle schematic view |
| `F` | Zoom to fit |
| `1` | Camera: default 3D perspective |
| `2` | Camera: top-down view |
| `Escape` | Cancel drag / deselect |
| `?` | Open help overlay |

---

## Architecture Overview

```
Main Thread (React + R3F)
  ├── Zustand circuitStore   — topology: nodes, wires, components, undo/redo
  │     topology change → BFS net analysis → SimController posts UPDATE_NETLIST
  ├── R3F Scene              — Three.js (SSR-disabled); all canvas rendering
  │     LED.tsx useFrame()   — reads voltages[netId] from SAB
  │     Wire.tsx useFrame()  — reads branchCurrents[idx] from SAB
  ├── analog.worker.ts       — MNA solver; 1 ms transient tick for C/555
  └── arduino.worker.ts      — avr8js ATmega328P; GPIO ↔ SAB digitalStates
```

**Data path:** `Workers → SharedArrayBuffer → R3F useFrame` — voltage and current data never touch React state. The solver and renderer are fully independent.

**SharedArrayBuffer layout** (2312 bytes total):

```
[0 .. 1023]    Float32Array[256]  — net voltages (V)
[1024 .. 1279] Uint8Array[256]    — digital HIGH/LOW per net
[1280 .. 2303] Float32Array[256]  — branch currents (A)
[2304 .. 2311] Float64Array[1]    — simulation timestamp (seconds)
```

For full architecture documentation, see [CLAUDE.md](./CLAUDE.md).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| 3D rendering | React Three Fiber 9, Three.js 0.183 |
| State | Zustand 5 + zundo 2 (undo/redo middleware) |
| Simulation | Custom MNA solver (TypeScript WebWorker) |
| MCU emulation | avr8js 0.21 (ATmega328P at 16 MHz) |
| Schematic layout | elkjs 0.11 (ELK layered algorithm) |
| Concurrency | SharedArrayBuffer + WebWorkers |
| Build | Turbopack, TypeScript 5 |

---

## Project Structure

```
app/              Next.js app routes + layouts
components/
  canvas/         All Three.js/R3F code (SSR-excluded)
  sidebar/        Left panel: palette, inspector, Arduino panel, export
features/
  oscilloscope/   4-channel scope overlay + ring buffers
  schematic/      SVG overlay + ELK layout + IEEE symbols
  examples/       Pre-built example circuits
  export/         SPICE .cir exporter
simulation/
  mna/            MNASolver.ts, NetlistBuilder.ts
  workers/        analog.worker.ts, arduino.worker.ts
  SimBridge.ts    SAB-backed typed array views
store/            Zustand stores (circuit, ui, scope, schematic, drag, toast)
constants/        breadboard.ts — single source of truth for all geometry constants
types/            circuit.ts — core types + SAB layout constants
```

---

## Development

```bash
pnpm dev          # dev server with hot reload
pnpm build        # full production build (tsc + Turbopack)
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only (no emit)
```

There is no automated test suite. Verify changes with `pnpm build` followed by a manual browser smoke test. Pay particular attention to:

- Simulation still converges after topology changes
- Undo/redo does not corrupt net IDs
- Copy/paste preserves component properties and pin assignments
- Oscilloscope channels clear correctly when removed

### Adding a New Component Type

1. Add the type to `ComponentType` in `types/circuit.ts`
2. Define `PIN_TEMPLATES[newType]` in `types/circuit.ts`
3. Add a `NetlistElement` case in `simulation/mna/NetlistBuilder.ts`
4. Add a solver case in `simulation/mna/MNASolver.ts` (if needed)
5. Add a 3D mesh under `components/canvas/parts/`
6. Add an SVG symbol in `features/schematic/symbols/index.tsx` and update `SYMBOL_SIZES`
7. Add matching dimensions to `COMPONENT_SIZES` in `features/schematic/SchematicLayout.ts`
8. Add SPICE export handling in `features/export/exportNetlist.ts`
9. Add the component tile to the sidebar palette in `components/sidebar/Sidebar.tsx`

### Parallelizing Large Features

Use git worktrees and Codex CLI for features touching many files:

```bash
git worktree add -b my-feature ../circuit-my-feature
cd ../circuit-my-feature
codex exec --full-auto "implement X: ..."
cd ../circuit
git merge my-feature
git worktree remove ../circuit-my-feature --force
git branch -d my-feature
```

---

## Screenshots

_(Add screenshots here showing the breadboard view, oscilloscope, and schematic overlay.)_

---

## License

MIT
