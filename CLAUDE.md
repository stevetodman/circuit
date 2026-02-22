# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
pnpm dev          # dev server → http://localhost:3001 (3000 often occupied)
pnpm build        # production build (runs tsc + Next.js bundler)
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only
```

No test suite. Verify changes by running `pnpm build` and checking the browser.

## Architecture

### Thread Model

```
Main Thread (React + R3F)
  ├── Zustand circuitStore   — topology only (nodes/wires/components)
  │     On topology change → BFS assigns netIds → SimController posts UPDATE_NETLIST
  ├── R3F Scene              — Three.js; all canvas code lives here (SSR disabled)
  │     LED.tsx useFrame()   — reads voltages[netId] from SAB → sets emissiveIntensity
  │     Wire.tsx useFrame()  — reads branchCurrents[idx] from SAB → current flow pulse
  ├── analog.worker.ts       — MNA solver; runs on every UPDATE_NETLIST; writes SAB
  └── arduino.worker.ts      — avr8js CPU loop at 16 MHz; GPIO ↔ SAB digitalStates
```

**Voltage data flows:** `Workers → SharedArrayBuffer → R3F useFrame` — never through React state. Simulation is decoupled from rendering entirely.

### SharedArrayBuffer Layout (`types/circuit.ts`)

```
[0 .. MAX_NETS*4-1]              Float32Array  — net voltages (V)
[MAX_NETS*4 .. MAX_NETS*5-1]     Uint8Array    — digital HIGH/LOW per net
[MAX_NETS*5 .. MAX_NETS*5+MAX_BRANCHES*4-1]  Float32Array  — branch currents (A)
[end-8]                          Float64Array  — simulation timestamp
MAX_NETS = 256, MAX_BRANCHES = 256
```

`SimBridge.ts` exports module-level typed arrays. On mount, `SimController` calls `init(sab)` to replace them with SAB-backed views. Workers receive the SAB via postMessage and create their own typed views.

### Simulation Engine

Custom MNA (Modified Nodal Analysis) solver in `simulation/mna/MNASolver.ts`:
- Builds G·x = b matrix from `NetlistElement[]`
- Gaussian elimination with partial pivoting
- Newton-Raphson loop (60 iter, 1e-9 tol) for Shockley diode model
- Runs synchronously in `analog.worker.ts` on every topology change
- ngspice WASM was considered but not implemented — current MNA solver handles resistors, voltage sources, and diodes (LED)

## Directory Layout

```
app/
  page.tsx              Root: <SimController> <KeyboardShortcuts> <Sidebar> <Scene>
                        + <Oscilloscope> + <SchematicView> overlays
  layout.tsx
components/
  canvas/               All Three.js/R3F — loaded with ssr:false
    Scene.tsx           Canvas, lighting, OrbitControls, zoom-to-fit
    Breadboard.tsx      Static board geometry (InstancedMesh)
    Pin.tsx             Interactive pin grid (InstancedMesh, hover/select/net highlight)
    Wire.tsx            CatmullRomCurve3 per wire + current flow animation
    WireLayer.tsx       Renders all wires from circuitStore
    WirePreview.tsx     Live arc preview while drawing a wire
    DragManager.tsx     Component drag-to-place with pin snap
    parts/
      ComponentRenderer.tsx  Wrapper group handles rotation; dispatches to part
      LED.tsx                Emissive glow from SAB voltages
      Resistor.tsx
      Battery.tsx
  sidebar/
    Sidebar.tsx         Left panel: part palette + inspector + panels + status
    ComponentTile.tsx   Individual draggable part button
    PropertiesInspector.tsx  Context-sensitive value editor (resistance, Vf, etc.)
    ArduinoPanel.tsx    Hex upload + serial monitor (shown when Arduino selected)
    ExportPanel.tsx     SPICE .cir download
    ScopeButton.tsx     Open oscilloscope shortcut
    StatusBar.tsx       Sim status dot + mode chip + hovered pin display
  KeyboardShortcuts.tsx Global keyboard handler (mount once in page.tsx)
  SimController.tsx     Worker lifecycle + SAB init + topology → UPDATE_NETLIST
constants/
  breadboard.ts         PITCH, COLS, ROWS, BOARD_TOP_Y, SNAP_THRESHOLD (single source)
features/
  oscilloscope/
    Oscilloscope.tsx    4-channel overlay panel
    scopeBuffer.ts      Float32Array[4096] ring buffer per net
  schematic/
    SchematicView.tsx   SVG overlay (toggled with S key)
    SchematicLayout.ts  elkjs ELK layered layout: netlist → {x,y,w,h} per component
    symbols/index.tsx   IEEE SVG symbols: R, LED, C, BJT, 555, Arduino
  examples/
    circuits.ts         Pre-built example circuits (blink, voltage divider, RC)
    ExampleLoader.tsx   Dropdown to load examples
  export/
    exportNetlist.ts    Circuit topology → SPICE .cir string
simulation/
  SimBridge.ts          Module-level SAB-backed typed arrays + init(sab)
  mna/
    MNASolver.ts        Gaussian elimination MNA DC solver
    NetlistBuilder.ts   PlacedComponent[] → NetlistElement[]
  workers/
    analog.worker.ts    Receives UPDATE_NETLIST, runs MNA, writes voltages to SAB
    arduino.worker.ts   avr8js ATmega328P at 16 MHz, GPIO ↔ SAB digitalStates
store/
  circuitStore.ts       Zustand + zundo: nodes, components, wires, undo/redo
  uiStore.ts            Non-topology UI state: hoveredNodeId, simStatus, zoom requests
  scopeStore.ts         Oscilloscope channels + open/close
  schematicStore.ts     Schematic open/close
  dragStore.ts          Active drag state (type, position, snap)
  netAnalysis.ts        BFS net assignment: wires + pins → netId per node
types/
  circuit.ts            Core types + SAB layout constants (MAX_NETS, SAB_TOTAL_BYTES)
```

## Key Patterns

**SSR exclusion** — `Scene` is `dynamic(..., { ssr: false })`. All Three.js/R3F imports must stay under `components/canvas/`. Never import Three.js outside this boundary.

**Coordinate system** — 1 Three.js unit = 10 mm. `PITCH = 0.254` (2.54 mm standard). All breadboard constants come from `constants/breadboard.ts` — do not hardcode pitch anywhere else.

**Breadboard node IDs:**
- Main grid: `bb-{row}{col}` — rows `a–j`, cols `1–63` (e.g. `bb-a1`, `bb-e32`)
- Power rails: `bb-tp-{n}`, `bb-tn-{n}`, `bb-bp-{n}`, `bb-bn-{n}` — n = 1–25

**ComponentRenderer rotation** — wrapper `<group position={anchorPos} rotation={[0, rotYRad, 0]}>` holds position + rotation. All child part components receive `anchorPos={[0,0,0]}` (local origin).

**InstancedMesh colors** — Pin.tsx uses `instancedMesh.setColorAt(idx, color)` + `instanceColor.needsUpdate = true`. Never create per-instance meshes.

**Net highlighting** — hovered pin's netId → all peers colored blue (`COLOR_NET_PEER`); selected start pin's netId → peers teal (`COLOR_NET_ACTIVE`).

**ElkJS browser build** — import from `elkjs/lib/elk.bundled.js` (not bare `elkjs`) to avoid the `web-worker` Node.js dependency being pulled into the browser bundle.

**SAB headers** — `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` are set in `next.config.ts`. Required for `SharedArrayBuffer` in all browsers.

## Stores at a Glance

| Store | What it holds | Undo/redo |
|---|---|---|
| `circuitStore` | nodes, components, wires, selectedIds, wiringMode | Yes (zundo) |
| `uiStore` | hoveredNodeId, simStatus, zoom/camera requests | No |
| `scopeStore` | oscilloscope open, channels (netId + color) | No |
| `schematicStore` | schematic overlay open | No |
| `dragStore` | active drag type + position | No |

## Known Limitations / Future Work

- MNA solver handles resistors, voltage sources, and diodes only. BJT/555/capacitor/motor are placed but not simulated (open circuit).
- Arduino serial output goes to the ArduinoPanel monitor only (not wired to a virtual USB device).
- Schematic view is read-only — no manual editing of positions.
- No transient simulation (capacitors treated as open circuit in DC solver).
- No overload/smoke detection yet (planned).

## Parallelization

For new features, use git worktrees + Codex CLI:

```bash
git worktree add -b feature-name ../circuit-feature
cd ../circuit-feature
codex exec --full-auto "your spec here"
# merge back when done
git -C ../circuit merge feature-name
git worktree remove ../circuit-feature --force
git branch -d feature-name
```
