# Circuit Sandbox

A fully in-browser 3D electronics simulator. Place components on a virtual breadboard, draw wires, and watch voltages update in real time — no server, no plugins, no install.

**[Live demo →](https://stevetodman.com/circuit)**

---

## What It Is

Circuit Sandbox is a physics-based circuit simulator that runs entirely in the browser. It uses a hand-written Modified Nodal Analysis (MNA) engine with Newton-Raphson convergence for nonlinear components, Backward Euler integration for capacitors, and a behavioral 555 timer model. Arduino Uno simulation runs at full 16 MHz via avr8js — upload a compiled `.hex` and watch GPIO pins drive live components.

Simulation data flows through a `SharedArrayBuffer` directly into Three.js `useFrame` loops, keeping the solver fully decoupled from React rendering.

---

## Features

**Simulation**
- Custom MNA solver — DC operating point + 1 ms transient tick, updates on every topology change
- Newton-Raphson nonlinear solver — Shockley diode model (LEDs), Ebers-Moll (BJTs); ±2 V per-step voltage clamping prevents divergence
- Gmin regularisation (1e-9 S) prevents singular matrices from floating nodes
- Capacitor integration via Backward Euler companion model
- 555 timer behavioral model — astable frequency = 1.44 / ((R1 + 2R2) · C)
- Arduino Uno — avr8js ATmega328P at 16 MHz; `analogRead()` feeds SAB net voltages; `analogWrite()` computes PWM duty-cycle from TCCR/OCR registers
- Simulation pause/resume; 1×/2×/5×/10× speed multiplier
- Overload detection — highlights components exceeding rated current

**Editing**
- 3D interactive breadboard — 63-column × 10-row + dual power rails; all geometry via InstancedMesh
- 14 component types with 3D models and IEEE schematic symbols
- Drag-to-place with pin snap, R to rotate; right-click context menu (delete/rotate/duplicate/properties)
- Multi-select: box-drag or Shift+click; Ctrl+C/V/A/D copy/paste/select-all/duplicate
- Undo/redo (100-step history via zundo)
- Per-wire color picker via right-click

**Visualisation**
- Wire voltage colouring — live colour mapped from SAB voltages; toggle with V
- Wire current labels (µA/mA/A) on demand; toggle with I
- Designator labels (R1, C2…) in 3D; toggle with L
- Polarity labels (+/−) on all polarised components; toggle with P
- Component value labels (Ω, µF, V…); toggle with W
- 4-channel oscilloscope — Y-axis labels, auto-scale, Vpp/Vmin/Vmax/freq stats per channel, adjustable time window
- Schematic view — ELK-laid-out SVG overlay with IEEE symbols; press S

**UX**
- Guided learning system — 11 step-by-step modules with spotlight hints and progress tracking
- 11 example circuits loadable from sidebar
- SPICE `.cir` export (all 14 component types with model definitions)
- JSON save/load; shareable URL (deflate-raw base64 encoded circuit state)
- Auto-save to `localStorage` on every change (500 ms debounce)
- Collapsible sidebar (B key or › button); parts filter by category (passive/active/power/IC)
- Serial monitor for Arduino sketch output
- Canvas screenshot — one-click PNG download of the 3D scene (preserveDrawingBuffer enabled)
- Fullscreen mode (F11 or overlay button)
- Wiring validation — self-wire and same-net guards with descriptive toasts
- Delete undo hint — every deletion shows "Deleted — Ctrl+Z to undo"

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

> **Note:** `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless`. These headers are set automatically in `next.config.ts`.

---

## Component Palette

| Component | Electrical model |
|---|---|
| Resistor | Linear (R) |
| LED | Shockley diode (Is=1e-14, N=1.5) |
| Capacitor | Backward Euler companion |
| Diode | Shockley diode (1N4148) |
| BJT NPN | Ebers-Moll NPN (simplified) |
| MOSFET N | Threshold model (Vt=2 V) |
| Op-Amp | Ideal voltage-controlled source |
| Inductor | Backward Euler companion |
| Potentiometer | Dual resistor (R·wiper + R·(1−wiper)) |
| 555 Timer | Behavioral: f = 1.44 / ((R1+2R2)·C) |
| Arduino Uno | avr8js ATmega328P at 16 MHz |
| Battery | Ideal DC voltage source |
| DC Motor | Resistor model (10 Ω default) |
| Tactile Switch | SW model (Ron=0.01 Ω, Roff=1 GΩ) |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `R` | Rotate selected / dragged component |
| `Delete` / `Backspace` | Delete selected |
| `Tab` / `Shift+Tab` | Cycle selection forward / backward through placed components |
| `Escape` | Close open overlay (scope/schematic/help), then deselect / cancel |
| `F11` | Toggle fullscreen |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C/V/A/D` | Copy / Paste / Select all / Duplicate |
| `Shift+click` | Add/remove from multi-selection |
| `Space` | Pause / resume simulation |
| `A` | Open Arduino panel |
| `O` | Toggle oscilloscope |
| `S` | Toggle schematic view |
| `L` | Toggle designator labels |
| `I` | Toggle wire current labels |
| `P` | Toggle polarity labels |
| `V` | Toggle wire voltage colours |
| `W` | Toggle component value labels |
| `B` | Show / hide sidebar |
| `F` | Zoom to fit |
| `+` / `-` | Zoom in / out |
| `1` / `2` | Camera: perspective / top-down |
| `?` | Show / hide help |

---

## Architecture

```
Main Thread (React + R3F)
  ├── circuitStore (Zustand + zundo)  — topology: nodes, wires, components
  │     topology change → BFS net analysis → SimController → UPDATE_NETLIST
  ├── R3F Scene (SSR-disabled)        — Three.js rendering
  │     LED/Wire useFrame()           — reads voltages/currents from SAB
  ├── analog.worker.ts                — MNA solver; 1 ms transient tick
  └── arduino.worker.ts               — avr8js ATmega328P; GPIO ↔ SAB
```

**Data path:** `Workers → SharedArrayBuffer → R3F useFrame` — voltage and current data never touch React state.

**SAB layout** (2312 bytes):

```
[0 .. 1023]    Float32[256]  — net voltages (V)
[1024 .. 1279] Uint8[256]    — digital HIGH/LOW per net
[1280 .. 2303] Float32[256]  — branch currents (A)
[2304 .. 2311] Float64[1]    — simulation timestamp (seconds)
```

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| 3D | React Three Fiber 9, Three.js 0.183 |
| State | Zustand 5 + zundo 2 |
| Simulation | Custom MNA solver (TypeScript WebWorker) |
| MCU | avr8js 0.21 (ATmega328P) |
| Schematic layout | elkjs 0.11 (ELK layered algorithm) |
| Concurrency | SharedArrayBuffer + WebWorkers |

---

## Development

```bash
pnpm dev          # dev server with hot reload
pnpm build        # production build (tsc + Turbopack)
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only
```

No automated test suite. Verify with `pnpm build` + manual browser smoke test.

### Adding a New Component Type

1. Add to `ComponentType` in `types/circuit.ts` and define `PIN_TEMPLATES[newType]`
2. Add `NetlistElement` case in `simulation/mna/NetlistBuilder.ts`
3. Add solver case in `simulation/mna/MNASolver.ts` (if nonlinear)
4. Add 3D mesh under `components/canvas/parts/`
5. Add SVG symbol in `features/schematic/symbols/index.tsx` + update `SYMBOL_SIZES`
6. Add matching dimensions in `COMPONENT_SIZES` in `features/schematic/SchematicLayout.ts`
7. Add SPICE export handling in `features/export/exportNetlist.ts`
8. Add tile to sidebar palette in `components/sidebar/Sidebar.tsx`

For full architecture details see [CLAUDE.md](./CLAUDE.md).

---

## License

MIT
