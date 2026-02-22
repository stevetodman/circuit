# Circuit Sandbox

A browser-based 3D electronics simulator. Place components on a breadboard, draw wires, and watch the circuit come alive — LED meshes glow at live voltages, an oscilloscope traces waveforms in real-time, and an Arduino emulator runs actual `.hex` firmware.

## Features

- **3D breadboard** — 830-hole standard layout with InstancedMesh pins, OrbitControls camera
- **Component library** — Arduino Uno, resistor, LED, capacitor, BJT, 555 timer, battery, motor, tactile switch
- **Wire drawing** — click a pin, click another; CatmullRomCurve3 spline with live arc preview
- **DC simulation** — custom MNA solver (Gaussian elimination + Newton-Raphson diode linearization) running in a WebWorker, feeding voltages into a SharedArrayBuffer at every topology change
- **LED glow** — emissive intensity driven by `V_anode − V_cathode` with no React re-renders
- **Arduino emulation** — upload a `.hex` file; avr8js runs the ATmega328P at 16 MHz, GPIO mapped to circuit nets via SharedArrayBuffer
- **Oscilloscope** — 4-channel, 4096-sample ring buffer per net, click any net to probe it
- **Schematic view** — elkjs auto-layout with IEEE SVG symbols, toggle alongside the 3D view
- **SPICE export** — download a `.cir` netlist compatible with LTspice / KiCad
- **Example circuits** — pre-built blink, voltage divider, RC filter
- **Undo / redo** — full topology history via zundo temporal middleware
- **Properties inspector** — context-sensitive sidebar for component values (resistance, forward voltage, etc.)

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
pnpm dev        # → http://localhost:3000
pnpm build      # production build
pnpm lint
```

SharedArrayBuffer requires COOP/COEP headers — they are set automatically in `next.config.ts`.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `O` | Toggle oscilloscope |
| `S` | Toggle schematic view |
| `R` | Rotate selected component |
| `F` | Zoom to fit |
| `1` / `2` | Camera preset (perspective / top) |
| `Delete` / `Backspace` | Delete selected component or wire |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| `Escape` | Deselect / cancel drag |

## Architecture

Voltage data never touches React state:

```
Workers → SharedArrayBuffer → R3F useFrame → material.emissive
```

This lets simulation run continuously while React renders at 60 fps with no interference. See `CLAUDE.md` for full architecture details.
