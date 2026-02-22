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
[end-8]                                    Float64Array  — simulation timestamp (seconds)
MAX_NETS = 256, MAX_BRANCHES = 256
```

`SimBridge.ts` exports module-level typed arrays. On mount, `SimController` calls `init(sab)` to replace them with SAB-backed views. Workers receive the SAB via postMessage and create their own typed views.

The SAB timestamp at `[end-8]` is written in **seconds** (not milliseconds). The worker maintains a cumulative `simTimeMs` counter that is divided by 1000 before writing to avoid wall-clock drift under CPU load.

### Simulation Engine

Custom MNA (Modified Nodal Analysis) solver in `simulation/mna/MNASolver.ts`:
- Builds G·x = b matrix from `NetlistElement[]`
- Gaussian elimination with partial pivoting
- Newton-Raphson loop (60 iter, 1e-9 tol) for diodes (Shockley) and BJTs (Ebers-Moll); voltage-clamped ±2V per step
- Backward Euler companion model for capacitors (when `dt` is provided)
- Gmin (1e-9 S) added to every node diagonal to prevent singular matrices from floating nodes
- `analog.worker.ts` runs a 1ms `setInterval` transient tick when capacitors are present
- 555 timer handled behaviorally in the worker (not MNA): frequency = 1.44 / ((R1+2R2)·C)
- Non-convergence of Newton-Raphson emits `SIM_WARN` to main thread (displayed as toast)

## Directory Layout

```
app/
  page.tsx              Root: <SimController> <Toast> <HelpOverlay> <KeyboardShortcuts>
                        <Sidebar> <Scene> + <CanvasOverlay> + <Oscilloscope> + <SchematicView>
  layout.tsx            Sets viewport meta (width=device-width, viewportFit=cover)
components/
  canvas/               All Three.js/R3F — loaded with ssr:false
    Scene.tsx           Canvas, lighting, OrbitControls, zoom-to-fit + zoom in/out
    Breadboard.tsx      Static board geometry (InstancedMesh)
    BreadboardLabels.tsx  Floating 3D Text labels: a–j row letters + column numbers
    Pin.tsx             Interactive pin grid (InstancedMesh, hover/select/net highlight)
    Wire.tsx            CatmullRomCurve3 per wire + current flow animation + voltage colouring
    WireLayer.tsx       Renders all wires from circuitStore
    WirePreview.tsx     Live arc preview while drawing a wire (geometry disposed on unmount)
    DragManager.tsx     Component drag-to-place with pin snap + rotation
    parts/
      ComponentRenderer.tsx  Wrapper group handles rotation; dispatches to part
      LED.tsx                Emissive glow from SAB voltages + polarity labels
      Resistor.tsx
      Battery.tsx            Polarity labels (+/−)
      Capacitor.tsx          Polarity labels (+/−)
      Diode.tsx              Polarity labels (anode +, cathode −)
  CanvasOverlay.tsx     Floating bottom-right overlay: zoom +/−/fit buttons + component counter
  Toolbar.tsx           Top toolbar: undo/redo, delete, copy/paste, L/I/P/V/S toggles
  sidebar/
    Sidebar.tsx         Left panel: circuit name + part palette + inspector + panels + status
    ComponentTile.tsx   Draggable part button with description + pulse-ring when highlighted
    PropertiesInspector.tsx  Context-sensitive editor + E12 presets + 📊 Add to Scope buttons
    LearnPanel.tsx      Module list with progress bar, completion badges, active highlight
    ArduinoPanel.tsx    Hex upload + serial monitor + PAUSE/RESUME + cycle counter
    ExportPanel.tsx     SPICE .cir download + New Circuit button
    ScopeButton.tsx     Open oscilloscope shortcut
    StatusBar.tsx       Sim status dot + power + mode chip + hovered pin display
  ContextMenu.tsx       Right-click context menu (delete/rotate/duplicate/properties); viewport-clamped
  ErrorBoundary.tsx     Wraps Sidebar, Oscilloscope, SchematicView in page.tsx
  HelpOverlay.tsx       ? key modal — full keyboard shortcut reference (L/I/P/V/O/S/F/1/2)
  KeyboardShortcuts.tsx Global keyboard handler (mount once in page.tsx)
  SimController.tsx     Worker lifecycle + SAB init + topology → UPDATE_NETLIST; power calc
  StepCard.tsx          Active module step card with spotlightTarget directional hint pill
  Toast.tsx             Transient notification bar (sim errors, warnings)
constants/
  breadboard.ts         PITCH, COLS, ROWS, BOARD_TOP_Y, SNAP_THRESHOLD (single source of truth)
  partDescriptions.ts   PART_DESCRIPTIONS map: ComponentType → short description string
features/
  modules/
    types.ts            ModuleStep (spotlightTarget, highlightComponent), Module, ValidatorState
    definitions.ts      11 guided modules with autoLoadId, step validators, spotlight hints
  oscilloscope/
    Oscilloscope.tsx    4-channel overlay: Y-axis labels, auto-scale, live voltage, clear-all button
    scopeBuffer.ts      Float32Array[4096] ring buffer per net
  schematic/
    SchematicView.tsx   SVG overlay (toggled with S key)
    SchematicLayout.ts  elkjs ELK layered layout: netlist → {x,y,w,h} per component + cache
    symbols/index.tsx   IEEE SVG symbols for all 14 component types
  examples/
    circuits.ts         11 pre-built starter circuits (one per module + extras)
    ExampleLoader.tsx   Expandable card gallery; ?autoload=N URL param supported
  export/
    exportNetlist.ts    Circuit topology → SPICE .cir string (covers all 14 component types)
  sharing/
    circuitUrl.ts       compressCircuit / decompressCircuit — deflate-raw base64 URL encoding
simulation/
  SimBridge.ts          Module-level SAB-backed typed arrays + init(sab)
  mna/
    MNASolver.ts        Gaussian elimination MNA DC/transient solver (Gmin + NR voltage clamp)
    NetlistBuilder.ts   PlacedComponent[] → NetlistElement[]
  workers/
    analog.worker.ts    UPDATE_NETLIST → DC solve → optional transient loop → SAB writes
    arduino.worker.ts   avr8js ATmega328P at 16 MHz; ADC (analogRead) + PWM (analogWrite) via SAB
store/
  circuitStore.ts       Zustand + zundo: nodes, components, wires, circuitName, undo/redo, newCircuit()
  uiStore.ts            hoveredNodeId, simStatus, sab, showHelp, zoom requests (fit/in/out),
                        showDesignators, showCurrentLabels, showPolarityLabels,
                        showWireVoltageColors, power, contextMenu, boxSelect
  moduleStore.ts        Zustand persist: activeModuleId, activeStepIndex, completedModuleIds,
                        resetProgress(); persisted to localStorage as 'circuit-modules'
  scopeStore.ts         Oscilloscope channels + open/close + clearChannels()
  schematicStore.ts     Schematic overlay open/close
  dragStore.ts          Active drag: type, position, rotationY, snap
  netAnalysis.ts        BFS net assignment: wires + component pins → netId per node
  toastStore.ts         Transient toast messages (message + severity)
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

**Symbol sizes** — `SYMBOL_SIZES` in `features/schematic/symbols/index.tsx` and `COMPONENT_SIZES` in `features/schematic/SchematicLayout.ts` must stay in sync. Both define the same pixel dimensions for each component type so ELK layout boxes match rendered SVG symbols exactly.

**SPICE export** — `exportNetlist.ts` covers all 14 component types. BJT → `Q<n> NPN_GENERIC`, diode → `D<n> DIODE_1N4148`, MOSFET → `M<n> NMOS_SIMPLE`, op-amp → `X<n> LM741`, inductor → `L<n>`, potentiometer → two `R<n>a`/`R<n>b` resistors. Models appended at bottom of `.cir`.

**Zustand selector rule (React 18 critical)** — Always use individual selectors. Inline object selectors `useStore(s => ({ a: s.a, b: s.b }))` create a new object every render → infinite loop crash. Use `const a = useStore(s => s.a)` per value, or `useShallow` from `zustand/react/shallow` when grouping is required.

**Wire voltage colouring** — `Wire.tsx` `useFrame` reads `voltages[fromNetId]` from SimBridge: >2.5V → `#cc2200` (red), <0.3V → `#333344` (dark), else `wire.color`. Gated by `showWireVoltageColors` in uiStore.

**Polarity labels** — `<Text>` from `@react-three/drei` rendered at pin positions; gated by `showPolarityLabels`. Colors: `#ff6b6b` for `+`, `#6b9fff` for `−`. Implemented in LED, Battery, Capacitor, Diode.

**Module system** — `features/modules/definitions.ts` defines 11 guided modules. Each `ModuleStep` has: `instruction`, optional `hint`, `spotlightTarget` (drives directional hint in StepCard), `highlightComponent` (drives pulse ring on ComponentTile), `autoLoadId` (loads a starter circuit), and a `validate()` function. `moduleStore` persists progress to localStorage via Zustand `persist`.

**Canvas overlay** — `CanvasOverlay.tsx` is a plain React component (not R3F) rendered as an absolute overlay on the canvas. Use `pointer-events-none` on the container, `pointer-events-auto` only on interactive children.

**Autosave** — `circuitStore` subscribes to topology changes and debounces a `localStorage.setItem` write (key `circuit-sandbox-save`). `SimController` restores from localStorage on mount (after first visit). `?c=` URL param takes priority over localStorage for shared circuits.

**Circuit name** — `circuitStore.circuitName` + `setCircuitName()`. Persisted in JSON save/load. `app/page.tsx` updates `document.title` reactively.

**New circuit** — `circuitStore.newCircuit()` resets nodes/components/wires/name and clears undo history. Exposed in Sidebar as a dashed "＋ New Circuit" button with inline Confirm/Cancel.

**Oscilloscope UX** — `scopeStore.clearChannels()` clears all 4 channels. `PropertiesInspector` renders a 📊 button per pin with a valid netId (up to 4 channels). Oscilloscope header has a "✕ all" button. Channel labels show live voltage via RAF loop.

**Part descriptions** — `PART_DESCRIPTIONS` in `constants/partDescriptions.ts` maps `ComponentType` → short description. Passed to `ComponentTile` as `description` prop.

**Breadboard labels** — `BreadboardLabels.tsx` renders floating `<Text>` for row letters (a–j) and column numbers (1, 5, 10 … 60) using `PITCH` and `ROWS`/`COLS` from `constants/breadboard.ts`.

**Learn tab** — `LearnPanel.tsx` shows overall progress bar (X/11), ✓ badge on completed modules, violet left-border on the active module, and a subtle "Reset progress" button that calls `moduleStore.resetProgress()`.

**Zoom controls** — `uiStore` has `zoomInRequested` / `zoomOutRequested` counters (increment to trigger). `Scene.tsx` listens with `useEffect` and moves the camera via OrbitControls ref. `CanvasOverlay` buttons call `requestZoomIn` / `requestZoomOut` / `requestZoomToFit`.

## Stores at a Glance

| Store | What it holds | Undo/redo |
|---|---|---|
| `circuitStore` | nodes, components, wires, circuitName, selectedNodeId, selectedComponentId, selectedComponentIds, wiringMode, componentClipboard (module-level) | Yes (zundo, topology only) |
| `uiStore` | hoveredNodeId, simStatus, simErrorDismissed, sab, showHelp, zoom requests, power, showPolarityLabels, showWireVoltageColors, contextMenu, boxSelect | No |
| `moduleStore` | activeModuleId, activeStepIndex, completedModuleIds, justCompleted; persisted via Zustand persist | No |
| `scopeStore` | oscilloscope open, channels (netId + color); clearChannels() clears all | No |
| `schematicStore` | schematic overlay open | No |
| `dragStore` | active drag type, position, rotationY | No |
| `toastStore` | active toast message + severity (error/warn/info) | No |

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `L` | Toggle designator labels |
| `I` | Toggle wire current labels |
| `P` | Toggle polarity labels (+/−) |
| `V` | Toggle wire voltage colours |
| `O` | Toggle oscilloscope |
| `S` | Toggle schematic view |
| `F` | Zoom to fit |
| `1` / `2` | Camera perspective / top |
| `R` | Rotate selected/dragged component |
| `?` | Show/hide help overlay |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C/V/A/D` | Copy / Paste / Select all / Duplicate |
| `Delete/Backspace` | Delete selected (cancel wire during wiring) |
| `Escape` | Deselect / cancel drag / cancel wiring |

## Copy / Paste / Multi-Select

`circuitStore` exposes:

- `selectedComponentIds: string[]` — all components in the current selection (multi-select via `toggleSelectedComponent`)
- `selectAll()` — sets `selectedComponentIds` to all component IDs (Ctrl+A)
- `copySelected()` — snapshots `selectedComponentIds` (or falls back to `selectedComponentId`) into the module-level `componentClipboard`
- `pasteClipboard(offsetCols?)` — pastes clipboard shifted 5 columns right by default; snaps pin nodes to nearest breadboard hole; selects pasted components
- `loadFromJSON()` — clears `componentClipboard` to prevent stale clipboard surviving a circuit load
- `deleteSelected()` — deletes all `selectedComponentIds` (or falls back to `selectedComponentId`), then also deletes any wire connected to `selectedNodeId`
- `rotateComponent(id)` — rotates component and calls `runNetAnalysis` so net IDs update immediately
- `newCircuit()` — clears nodes/components/wires/name, resets undo history

## Known Limitations / Future Work

- BJT simulation uses simplified Ebers-Moll (no Early effect, no temperature model).
- Capacitors use backward Euler (first-order accuracy); no RK4 or variable timestep.
- 555 timer is a behavioral model (frequency only) — no threshold/comparator detail.
- Motor and tactile switch are placed but electrically modelled as resistors only.
- Arduino ADC: `analogRead()` feeds SAB net voltages into `AVRADC` — fully implemented.
- Arduino PWM: `analogWrite()` computes duty-cycle voltage from TCCR/OCR registers — fully implemented.
- Schematic view is read-only — no manual drag of component positions.
- No overload/smoke detection (planned).

## Parallelization

For new features, use git worktrees + Codex CLI:

```bash
git worktree add -b feature-name ../circuit-feature
cd ../circuit-feature
codex exec --full-auto "$(cat SPEC.md)" > /tmp/codex-feature-name.log 2>&1
# After agent finishes, install + build manually:
pnpm --prefix /path/to/worktree install --frozen-lockfile
pnpm --prefix /path/to/worktree build
# Fix any errors, then commit and merge back:
git add -A && git commit -m "feat: ..."
cd ../circuit && git merge feature-name --no-edit
git worktree remove ../circuit-feature --force
git branch -d feature-name
```

**Codex invocation rules:**
- `--worktree` is NOT a valid flag — it errors. Always `cd` into the worktree first.
- Pass the spec inline: `codex exec --full-auto "$(cat SPEC.md)"` — do NOT use `cat file | codex` from a different directory.
- Run `pnpm install --frozen-lockfile` manually after the agent finishes (agents can't install deps).
- For small/focused changes (≤3 files), implement directly — worktree overhead not worth it.
- SPEC.md conflicts during merge: always `git checkout --ours SPEC.md`.
- When two branches both add fields to uiStore/Toolbar/KeyboardShortcuts, manually merge to keep BOTH additions.
