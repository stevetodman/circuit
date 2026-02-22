# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
pnpm dev          # dev server → http://localhost:3000 (shifts to 3001/3002 if occupied)
pnpm build        # production build (tsc + Next.js Turbopack)
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only
```

No test suite. Verify changes with `pnpm build` and manual browser smoke test.

## Architecture

### Thread Model

```
Main Thread (React + R3F)
  ├── Zustand circuitStore   — topology only (nodes/wires/components)
  │     On topology change → BFS assigns netIds → SimController posts UPDATE_NETLIST
  ├── R3F Scene              — Three.js; all canvas code lives here (SSR disabled)
  │     LED.tsx useFrame()   — reads voltages[netId] from SAB → sets emissiveIntensity
  │     Wire.tsx useFrame()  — reads branchCurrents[idx] from SAB → current flow pulse
  ├── analog.worker.ts       — MNA solver; on UPDATE_NETLIST runs DC solve then starts
  │                             1ms setInterval transient loop for capacitors/555 timer
  └── arduino.worker.ts      — avr8js CPU loop at 16 MHz; GPIO ↔ SAB digitalStates
```

**Voltage data flows:** `Workers → SharedArrayBuffer → R3F useFrame` — never through React state. Simulation is decoupled from rendering entirely.

### SharedArrayBuffer Layout (`types/circuit.ts`)

```
[0 .. MAX_NETS*4-1]                        Float32Array  — net voltages (V)
[MAX_NETS*4 .. MAX_NETS*5-1]               Uint8Array    — digital HIGH/LOW per net
[MAX_NETS*5 .. MAX_NETS*5+MAX_BRANCHES*4-1] Float32Array — branch currents (A)
[end-8]                                    Float64Array  — simulation timestamp
MAX_NETS = 256, MAX_BRANCHES = 256
```

`SimBridge.ts` exports module-level typed arrays. On mount, `SimController` calls `init(sab)` to replace them with SAB-backed views. Workers receive the SAB via postMessage and create their own typed views.

### Simulation Engine

Custom MNA (Modified Nodal Analysis) solver in `simulation/mna/MNASolver.ts`:
- Builds G·x = b matrix from `NetlistElement[]`
- Gaussian elimination with partial pivoting
- Newton-Raphson loop (60 iter, 1e-9 tol) for diodes (Shockley) and BJTs (Ebers-Moll)
- Backward Euler companion model for capacitors (when `dt` is provided)
- `analog.worker.ts` runs a 1ms `setInterval` transient tick when capacitors are present
- 555 timer handled behaviorally in the worker (not MNA): frequency = 1.44 / ((R1+2R2)·C)

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
    WirePreview.tsx     Live arc preview while drawing a wire (geometry disposed on unmount)
    DragManager.tsx     Component drag-to-place with pin snap + rotation
    parts/
      ComponentRenderer.tsx  Wrapper group handles rotation; dispatches to part
      LED.tsx                Emissive glow from SAB voltages
      Resistor.tsx
      Battery.tsx
  sidebar/
    Sidebar.tsx         Left panel: part palette + inspector + panels + status
    ComponentTile.tsx   Individual draggable part button
    PropertiesInspector.tsx  Context-sensitive editor + E12 resistor presets + LED presets
    ArduinoPanel.tsx    Hex upload + serial monitor + PAUSE/RESUME + cycle counter
    ExportPanel.tsx     SPICE .cir download
    ScopeButton.tsx     Open oscilloscope shortcut
    StatusBar.tsx       Sim status dot + mode chip + hovered pin display
  HelpOverlay.tsx       ? key modal — full keyboard shortcut reference
  KeyboardShortcuts.tsx Global keyboard handler (mount once in page.tsx)
  SimController.tsx     Worker lifecycle + SAB init + topology → UPDATE_NETLIST
constants/
  breadboard.ts         PITCH, COLS, ROWS, BOARD_TOP_Y, SNAP_THRESHOLD (single source of truth)
features/
  oscilloscope/
    Oscilloscope.tsx    4-channel overlay panel with Y-axis voltage labels + auto-scale
    scopeBuffer.ts      Float32Array[4096] ring buffer per net
  schematic/
    SchematicView.tsx   SVG overlay (toggled with S key)
    SchematicLayout.ts  elkjs ELK layered layout: netlist → {x,y,w,h} per component + cache
    symbols/index.tsx   IEEE SVG symbols: R, LED, C, BJT, 555, Arduino, Motor, Switch
  examples/
    circuits.ts         Pre-built example circuits (blink, voltage divider, RC)
    ExampleLoader.tsx   Dropdown to load examples
  export/
    exportNetlist.ts    Circuit topology → SPICE .cir string
simulation/
  SimBridge.ts          Module-level SAB-backed typed arrays + init(sab)
  mna/
    MNASolver.ts        Gaussian elimination MNA DC/transient solver
    NetlistBuilder.ts   PlacedComponent[] → NetlistElement[]
  workers/
    analog.worker.ts    UPDATE_NETLIST → DC solve → optional transient loop → SAB writes
    arduino.worker.ts   avr8js ATmega328P at 16 MHz, GPIO ↔ SAB digitalStates
store/
  circuitStore.ts       Zustand + zundo: nodes, components, wires, undo/redo
  uiStore.ts            Non-topology UI: hoveredNodeId, simStatus, sab, showHelp, zoom/camera
  scopeStore.ts         Oscilloscope channels + open/close
  schematicStore.ts     Schematic open/close
  dragStore.ts          Active drag: type, position, rotationY, snap
  netAnalysis.ts        BFS net assignment: wires + component pins → netId per node
types/
  circuit.ts            Core types + SAB layout constants (MAX_NETS, SAB_TOTAL_BYTES)
```

## Key Patterns

**SSR exclusion** — `Scene` is `dynamic(..., { ssr: false })`. All Three.js/R3F imports must stay under `components/canvas/`. Never import Three.js outside this boundary.

**Coordinate system** — 1 Three.js unit = 10 mm. `PITCH = 0.254` (2.54 mm standard). All breadboard constants come from `constants/breadboard.ts` — never hardcode pitch elsewhere.

**Breadboard node IDs:**
- Main grid: `bb-{row}{col}` — rows `a–j`, cols `1–63` (e.g. `bb-a1`, `bb-e32`)
- Power rails: `bb-tp-{n}`, `bb-tn-{n}`, `bb-bp-{n}`, `bb-bn-{n}` — n = 1–25

**Net analysis** — `runNetAnalysis(nodes, wires, components)` takes all three arguments. BFS traces wires and implicit breadboard column connections, then visits any isolated component pin nodes. Always pass all three args or pin nodes get `netId: null` and the simulator skips them.

**ComponentRenderer rotation** — wrapper `<group position={anchorPos} rotation={[0, rotYRad, 0]}>` holds position + rotation. All child part components receive `anchorPos={[0,0,0]}` (local origin).

**Drag snap + rotation** — `dragStore` holds `rotationY` (0/90/180/270). `R` key calls `rotate()`. Pin snap applies `rotateOffset(pinDef.offset, rotationY)` before computing world position.

**InstancedMesh colors** — Pin.tsx uses `instancedMesh.setColorAt(idx, color)` + `instanceColor.needsUpdate = true`. Never create per-instance meshes.

**ElkJS browser build** — import from `elkjs/lib/elk.bundled.js` (not bare `elkjs`) to avoid the `web-worker` Node.js dependency being pulled into the browser bundle.

**SAB headers** — `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: credentialless` are set in `next.config.ts`. Required for `SharedArrayBuffer` in all browsers.

## Stores at a Glance

| Store | What it holds | Undo/redo |
|---|---|---|
| `circuitStore` | nodes, components, wires, selectedIds, wiringMode | Yes (zundo) |
| `uiStore` | hoveredNodeId, simStatus, sab, showHelp, zoom/camera requests | No |
| `scopeStore` | oscilloscope open, channels (netId + color) | No |
| `schematicStore` | schematic overlay open | No |
| `dragStore` | active drag type, position, rotationY | No |

## Known Limitations / Future Work

- BJT simulation uses simplified Ebers-Moll (no Early effect, no temperature model).
- Capacitors use backward Euler (first-order accuracy); no RK4 or variable timestep.
- 555 timer is a behavioral model (frequency only) — no threshold/comparator detail.
- Motor and tactile switch are placed but electrically modelled as resistors only.
- Arduino ADC reads SAB digital states; analog input feedback not yet implemented.
- Schematic view is read-only — no manual drag of component positions.
- No overload/smoke detection (planned).

## Parallelization

For new features, use git worktrees + Codex CLI:

```bash
git worktree add -b feature-name ../circuit-feature
# Write a SPEC.md in the worktree directory, then:
cat ../circuit-feature/SPEC.md | codex exec --full-auto
# Merge back when done
git merge feature-name
git worktree remove ../circuit-feature --force
git branch -d feature-name
```

**Codex invocation rules:**
- Pipe the spec via stdin: `cat SPEC.md | codex exec --full-auto` — do NOT use `--worktree` flag (invalid)
- `cd` into the worktree directory before running codex
- For small/focused changes (≤3 files), implement directly — worktree overhead not worth it
