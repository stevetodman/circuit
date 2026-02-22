# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000 or 3001 if occupied)
npm run build    # Production build
npm run lint     # ESLint
npm start        # Serve production build
```

No test suite is configured yet.

## Project Overview

**Circuit Sandbox** is a 3D browser-based electronics simulator. Users place components on a 3D breadboard, draw wires between pins, and run real-time SPICE-grade simulation. LED meshes glow, components smoke when overloaded, and an oscilloscope traces live waveforms.

**Stack:** Next.js 16, React 19, React Three Fiber + Three.js, Zustand 5, TypeScript, Tailwind CSS v4
**Planned simulation stack:** ngspice compiled to WebAssembly (analog), avr8js (Arduino MCU emulation)

## Architecture

### Thread Model

```
Main Thread (React + R3F)
  ├── Zustand circuitStore — circuit topology (nodes/wires/components)
  │     On topology change → BFS assigns netIds → posts UPDATE_NETLIST to workers
  ├── R3F Scene → VoltageBridge.useFrame() reads SharedArrayBuffer at 60fps
  │                → updates material.emissive on LED/component meshes
  ├── analog.worker.ts — ngspice WASM; runs at 1kHz; writes voltages to SAB
  └── arduino.worker.ts — avr8js CPU loop; reads/writes digitalStates in SAB
```

Voltage data flows: `Workers → SharedArrayBuffer → R3F useFrame` — never through React state. This keeps simulation at 1 kHz while React renders at 60 fps.

### SharedArrayBuffer Layout (defined in `types/circuit.ts`)

```
[0 .. MAX_NETS*4-1]           Float32Array — net voltages (V)
[MAX_NETS*4 .. MAX_NETS*5-1]  Uint8Array   — digital HIGH/LOW per net
[MAX_NETS*5]                  Float64Array — simulation timestamp
MAX_NETS = 256
```

COOP/COEP headers required for SAB are set in `next.config.ts`.

### Directory Layout

```
app/                    Next.js App Router (single page)
  page.tsx              Root layout: <Sidebar> + dynamic <Scene ssr=false>
  layout.tsx
components/
  canvas/               R3F scene — SSR disabled, Three.js only here
    Scene.tsx           Canvas, lighting, OrbitControls — R3F entry point
    Breadboard.tsx      Static board geometry via InstancedMesh
    Pin.tsx             Interactive pin grid (InstancedMesh, hover/select)
    Wire.tsx            CatmullRomCurve3 spline per wire (planned M3)
    VoltageBridge.tsx   useFrame() SAB reader → material updates (planned M6)
    parts/              Per-component 3D meshes (planned M2+)
      LED.tsx           Emissive driven by voltage
      Resistor.tsx
      Battery.tsx
  sidebar/
    Sidebar.tsx         Component palette + sim status
    ComponentTile.tsx   Individual part button
store/
  circuitStore.ts       Zustand — nodes, components, wires, actions
  netAnalysis.ts        BFS net assignment (planned M4)
simulation/             (planned M5+)
  SimBridge.ts          SAB creation + typed views
  ngspice/
    ngspice.wasm        Pre-compiled wokwi/ngspice-wasm binary
    NgspiceWrapper.ts   WASM class: loadNetlist(), step(), getVoltages()
    NetlistBuilder.ts   Topology → SPICE .cir string
  workers/
    analog.worker.ts    ngspice loop, writes SAB
    arduino.worker.ts   avr8js CPU loop, reads/writes SAB
features/               (planned M8-M10)
  oscilloscope/         4-channel ring-buffer scope panel
  schematic/            elkjs SVG schematic view
  export/               .cir export for LTspice/KiCad
types/
  circuit.ts            Core types + SAB layout constants
```

### Key Patterns

**SSR exclusion** — `Scene` is loaded with `dynamic(..., { ssr: false })` in `app/page.tsx`. All Three.js/R3F code must stay under `components/canvas/` and cannot run server-side.

**Coordinate system** — 1 Three.js unit = 10 mm. `PITCH = 0.254` (2.54 mm standard header pitch). Constants are defined in both `Breadboard.tsx` (rendering) and `circuitStore.ts` (node seeding) — they must stay in sync.

**Breadboard node IDs:**
- Main grid: `bb-{row}{col}` — rows `a–j`, cols `1–63` (e.g. `bb-a1`, `bb-e32`)
- Power rails: `bb-tp-{n}`, `bb-tn-{n}`, `bb-bp-{n}`, `bb-bn-{n}` — n is 1–25

**Performance** — Breadboard holes and pins use `THREE.InstancedMesh` (630 main + 100 rail holes; 730 pins total). Never create individual meshes per hole/pin.

**Snap threshold** — `SNAP_THRESHOLD = GRID_UNIT * 0.68` (~0.173 units) used for component-to-pin snapping.

**Zustand store** (`useCircuitStore`) holds topology only:
- `nodes` — pre-seeded `CircuitNode` records (keyed by node ID, `netId` assigned by BFS)
- `components` — placed `PlacedComponent` records
- `wires` — `Wire` records
- `selectedNodeId`, `wiringMode` — interaction state

Voltage data never enters Zustand.

## Build Milestones

| # | Deliverable | Status |
|---|-------------|--------|
| M1 | 3D breadboard + pin grid + camera + dark sidebar | **Done** |
| M2 | Component placement (drag from sidebar → snap to board) | Planned |
| M3 | Wire drawing (click pin A → pin B → CatmullRomCurve3 spline) | Planned |
| M4 | Net analysis (BFS over wires → assign netIds) | Planned |
| M5 | ngspice WASM Worker + SharedArrayBuffer bridge | Planned |
| M6 | LED emissive driven by voltage data | Planned |
| M7 | Arduino Worker (avr8js + GPIO ↔ net voltage via SAB) | Planned |
| M8 | Oscilloscope panel (4-channel, ring buffer, probe by click) | Planned |
| M9 | .lib import + .cir export | Planned |
| M10 | Schematic view (elkjs auto-layout + cross-highlight with 3D) | Planned |
| M11 | Overload detection: smoke particles + warning when power/current exceeded | Planned |

## ngspice WASM Notes

No npm package maintained. Use **wokwi/ngspice-wasm** (GitHub) — the most battle-tested browser SPICE engine (used in production by Wokwi). Build via Docker, copy `.wasm` binary into `simulation/ngspice/`.

Constraint: XSPICE dynamic modules and dynamically-loaded `.lib` plugin files don't work with WASM builds. Manufacturer `.lib` files can still be used at the netlist parameter level (not as dynamic plugins).

## Parallelization

M2/M3/M4 are independent and should be built in parallel using git worktrees + Codex:

```bash
git worktree add -b m2-placement ../circuit-m2
git worktree add -b m3-wires ../circuit-m3
git worktree add -b m4-nets ../circuit-m4
# Then run codex exec --full-auto in each worktree
```
