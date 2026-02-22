# Circuit Sandbox

A browser-based 3D electronics simulator. Place components on a breadboard, draw wires, and watch the circuit come alive — LEDs glow at live voltages, an oscilloscope traces waveforms, and an Arduino emulator runs actual `.hex` firmware.

## Features

- **3D breadboard** — 830-hole standard layout with InstancedMesh pins, OrbitControls camera
- **Component library** — Arduino Uno, resistor, LED, capacitor, BJT (NPN), 555 timer, battery, motor, tactile switch
- **Wire drawing** — click pin A → click pin B; CatmullRomCurve3 spline with live arc preview
- **Simulation** — custom MNA solver (Gaussian elimination + Newton-Raphson) in a WebWorker:
  - Resistors, batteries, LEDs (Shockley diode) — DC operating point
  - Capacitors — backward Euler companion model, 1ms transient tick
  - BJTs — simplified Ebers-Moll NR linearization
  - 555 timer — behavioral oscillator model (frequency from R1/R2/C)
- **LED glow** — emissive intensity driven by net voltage, zero React re-renders
- **Wire animation** — current flow pulse along wires driven by branch current magnitude
- **Arduino emulation** — upload a `.hex` file; avr8js runs ATmega328P at 16 MHz, GPIO mapped to circuit nets
- **Oscilloscope** — 4-channel, 4096-sample ring buffer per net; Y-axis voltage labels; auto-scale
- **Schematic view** — elkjs auto-layout, IEEE SVG symbols (R, LED, C, BJT, 555, Arduino, Motor, Switch)
- **SPICE export** — download `.cir` netlist compatible with LTspice / KiCad
- **Example circuits** — blink, voltage divider, RC filter
- **Undo / redo** — full topology history via zundo temporal middleware
- **Properties inspector** — resistance (E12 quick-select), forward voltage, LED color presets, capacitance, BJT β, 555 timing R/C, clock speed

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| 3D | React Three Fiber + Three.js |
| State | Zustand 5 + zundo (undo/redo) |
| Simulation | Custom MNA solver → WebWorker → SharedArrayBuffer |
| Arduino | avr8js (ATmega328P emulation) |
| Schematic layout | elkjs (ELK layered algorithm) |
| Language | TypeScript, Tailwind CSS v4 |

## Getting Started

```bash
pnpm install
pnpm dev        # → http://localhost:3000 (shifts to 3001/3002 if occupied)
pnpm build      # production build
pnpm lint
```

SharedArrayBuffer requires COOP/COEP headers — set automatically in `next.config.ts`.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `O` | Toggle oscilloscope |
| `S` | Toggle schematic view |
| `R` | Rotate selected / dragged component |
| `F` | Zoom to fit |
| `1` / `2` | Camera preset (perspective / top) |
| `Delete` / `Backspace` | Delete selected component or wire |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `Escape` | Deselect / cancel drag |
| `?` | Show / hide keyboard shortcut reference |

## Architecture

Voltage data never touches React state:

```
Workers → SharedArrayBuffer → R3F useFrame → material.emissive
```

The analog worker runs a DC operating point solve on every topology change. If capacitors or a 555 timer are present, it also starts a 1ms `setInterval` transient loop. The Arduino worker runs the AVR CPU at 16 MHz, reading and writing GPIO states via the same SharedArrayBuffer. The main thread reads voltages at 60 fps with no postMessage overhead.

See `CLAUDE.md` for full architecture details, directory layout, and development patterns.
