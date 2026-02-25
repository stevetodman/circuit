# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
pnpm dev          # dev server → http://localhost:3000 (shifts to 3001/3002 if occupied)
pnpm build        # production build (tsc + Next.js Turbopack)
pnpm lint         # ESLint
npx tsc --noEmit  # type-check only
```

pnpm test          # Vitest unit tests (MNA solver, netlist builder, net analysis)
```

Test files live in `__tests__/` directories adjacent to the code they test:
- `simulation/mna/__tests__/MNASolver.test.ts` — solver core (divider, diode NR, BJT, RC transient, singular matrix, Gmin)
- `simulation/mna/__tests__/SPICEValidation.test.ts` — 11 analytically-verifiable reference circuits
- `simulation/mna/__tests__/NetlistBuilder.test.ts` — component-to-netlist mapping
- `store/__tests__/netAnalysis.test.ts` — BFS net assignment

Also verify with `pnpm build` and manual browser smoke test.

```bash

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
  │                             adaptive-dt setInterval transient loop (τ/10, 10µs–1ms)
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
- Newton-Raphson loop (60 iter, 1e-9 tol) for diodes (Shockley) and BJTs (Ebers-Moll transport, βR=1); voltage-clamped ±2V per step
- Zener diode stamped as `kind: 'zener'` — bidirectional Shockley model: forward (Vf=0.7 V) + reverse breakdown (Vz from component value)
- Backward Euler companion model for capacitors (when `dt` is provided)
- Inductor DC mode: Geq = 1e9 S (near-short) avoids singularity with zero reactance
- Gmin (1e-9 S) added to every node diagonal to prevent singular matrices from floating nodes
- `analog.worker.ts` runs a 1ms `setInterval` transient tick when capacitors are present
- 555 timer handled behaviorally in the worker (not MNA): frequency = 1.44 / ((R1+2R2)·C)
- Motor state (angular velocity, direction) preserved across netlist updates — selective clear removes only motors absent from the new netlist
- Non-convergence of Newton-Raphson posts `SIM_NR_FAIL` → `simStatus: 'warn'` (amber dot in StatusBar) + toast; `SIM_OK` clears warn back to 'running'

## Shared Utilities

**`lib/engineering.ts`** — `parseEngValue(raw: string): number | null`
Parses engineering shorthand into a number: `"10k"→10000`, `"4.7u"→4.7e-6`, `"100n"→1e-7`, `"1M"→1e6`, `"2.2m"→0.0022`. Import this — never reimplement it locally.

---

## Type Safety Reminders (SPEC authors / Codex agents)

These mistakes appear in every sprint. Check before committing:

**1. `component.props.*` is `string | number` — not `number`**
Always narrow before passing to a numeric function:
```ts
// ❌ wrong
formatValue(component.props.resistance)

// ✅ correct
const r = Number(component.props.resistance);
if (Number.isFinite(r)) formatValue(r);
```

**2. Array spread creates `number[]`, not `Vec3`**
`Vec3` is a `[number, number, number]` tuple — TypeScript won't accept `number[]` where `Vec3` is required:
```ts
// ❌ wrong
const pos = [...otherVec3];               // inferred as number[]
const snapped = [x, y, z];               // inferred as number[]

// ✅ correct
const pos: Vec3 = [x, y, z];             // explicit tuple type
const snapped = [...otherVec3] as Vec3;  // cast when spreading
```

**3. Zustand: individual selectors only — never inline objects**
Inline object selectors create a new object every render → infinite re-render loop:
```ts
// ❌ crashes
const { a, b } = useStore(s => ({ a: s.a, b: s.b }));

// ✅ correct
const a = useStore(s => s.a);
const b = useStore(s => s.b);
// OR use useShallow from zustand/react/shallow when grouping is required
```

**4. Never reimplement `parseEngValue` — import from `@/lib/engineering`**
```ts
import { parseEngValue } from '@/lib/engineering';
```

**5. Three.js imports only under `components/canvas/`**
`Scene.tsx`, `DragManager.tsx`, `Pin.tsx`, `Wire.tsx` etc. are SSR-excluded. Never import Three.js in sidebar components, stores, or `app/`.

---

## Directory Layout

```
lib/
  engineering.ts        parseEngValue — shared engineering notation parser
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
    Sidebar.tsx         Left panel: parts/learn/arduino tabs + category filter chips + circuit name
                        + part palette + inspector + panels + status; collapsible with B key
    ComponentTile.tsx   Draggable part button with description + pulse-ring when highlighted
    PropertiesInspector.tsx  Context-sensitive editor + E12 presets + 📊 Add to Scope buttons
    LearnPanel.tsx      Module list with progress bar, completion badges, active highlight
    ArduinoPanel.tsx    Hex upload + serial monitor + PAUSE/RESUME + cycle counter
    ExportPanel.tsx     SPICE .cir download + Save/Load JSON + Copy share link + New Circuit button
    ScopeButton.tsx     Open oscilloscope shortcut
    StatusBar.tsx       Sim status dot + power + mode chip + hovered pin + parts/nets count + sim time
  ContextMenu.tsx       Right-click: component menu (delete/rotate/duplicate/swapType/properties) + WireContextMenu
                        (7 color swatches + delete wire); both are viewport-clamped
  SwapTypeMenu.tsx      Floating type-picker opened by "Swap type" context menu item; shows pin-compatible types
  CanvasSearch.tsx      Ctrl+F component search overlay: filter by type name, arrow-key navigate, Enter to zoom
  ErrorBoundary.tsx     Wraps Sidebar, Oscilloscope, SchematicView in page.tsx
  HelpOverlay.tsx       ? key modal — full keyboard shortcut reference
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
    definitions.ts      20 guided modules with autoLoadId, step validators, spotlight hints
  oscilloscope/
    Oscilloscope.tsx    4-channel overlay: Y-axis labels, auto-scale, live voltage, Vpp/Vmin/Vmax/freq
                        stats per channel, time-window selector, clear-all button
    scopeBuffer.ts      Float32Array[4096] ring buffer per net
  schematic/
    SchematicView.tsx   SVG overlay (toggled with S key)
    SchematicLayout.ts  elkjs ELK layered layout: netlist → {x,y,w,h} per component + cache
    symbols/index.tsx   IEEE SVG symbols for all 14 component types
  examples/
    circuits.ts         pre-built starter circuits (one per module)
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
  uiStore.ts            hoveredNodeId, simStatus, simPaused, sab, showHelp, showSidebar,
                        showValueLabels, arduinoTabRequested, zoom requests (fit/in/out),
                        showDesignators, showCurrentLabels, showPolarityLabels,
                        showWireVoltageColors, overloadIds, circuitHealthWarning,
                        power, contextMenu, wireMenu, boxSelect,
                        clickToPlaceType, inlineEditComponentId, inlineEditScreenPos,
                        swapTypeMenuId, swapTypeMenuPos, canvasSearchOpen,
                        recentlyUsedTypes, showCurrentThickness, wireRoutingMode
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

**Module system** — `features/modules/definitions.ts` defines 20 guided modules (M1–M20). Each `ModuleStep` has: `instruction`, optional `hint`, `failHint` (shown on failed validation), `spotlightTarget` (drives directional hint in StepCard), `highlightComponent` (drives pulse ring on ComponentTile), `autoLoadId` (loads a starter circuit), and a `validate()` function. `moduleStore` persists progress to localStorage via Zustand `persist`. Steps can be skipped with a "skip" button (marked yellow rather than green).

**Canvas overlay** — `CanvasOverlay.tsx` is a plain React component (not R3F) rendered as an absolute overlay on the canvas. Use `pointer-events-none` on the container, `pointer-events-auto` only on interactive children. Contains zoom +/−/fit buttons, a component counter, a **screenshot button** (grabs `canvas.toDataURL('image/png')` — requires `gl={{ preserveDrawingBuffer: true }}` on `<Canvas>`), and a **fullscreen button** (`document.documentElement.requestFullscreen()`).

**simStatus 'warn'** — `uiStore.simStatus` is `'idle' | 'running' | 'error' | 'warn'`. The 'warn' state is set when the MNA Newton-Raphson loop does not converge (`SIM_NR_FAIL` worker message) and cleared when the next tick succeeds (`SIM_OK`). StatusBar renders an amber dot for 'warn'. SimController also emits a toast for `SIM_NR_FAIL`.

**Wiring validation** — `circuitStore.addWire()` guards against: (1) self-wire (both ends same node → no-op + warn toast), (2) same-net wire (both pins already on the same electrical net → warn toast). Both use `useToastStore.getState().addToast(..., 'warn')`.

**Delete toast** — `circuitStore.deleteSelected()`, `removeComponent()`, and `removeWire()` each call `useToastStore.getState().addToast('Deleted — Ctrl+Z to undo', 'info')` after the deletion so users always see an undo hint.

**Tactile switch click-to-toggle** — `ComponentRenderer.handleClick` checks `type === 'tactileSwitch'` and calls `setProperty(componentId, 'closed', 0|1)` to toggle state without opening the properties panel. The `closed` prop (0=open, 1=closed) is already passed through to `TactileSwitch` (dome turns green when closed).

**Potentiometer wiper** — `Potentiometer.tsx` accepts `wiper` (0.0–1.0) and `onWiperChange` props. The shaft/knob group rotates `(wiper - 0.5) * 270°` to visually reflect position. `onWheel` on the knob group adjusts wiper by ±0.05 per scroll tick via `setProperty(componentId, 'wiper', value)`. `ComponentRenderer` wires both props for the `'potentiometer'` case.

**PITCH constant** — All 12 part component files import `PITCH` from `@/constants/breadboard`. No file hardcodes `0.254` directly.

**Autosave** — `circuitStore` subscribes to topology changes and debounces a `localStorage.setItem` write (key `circuit-sandbox-save`). `SimController` restores from localStorage on mount (after first visit). `?c=` URL param takes priority over localStorage for shared circuits.

**Circuit name** — `circuitStore.circuitName` + `setCircuitName()`. Persisted in JSON save/load. `app/page.tsx` updates `document.title` reactively.

**New circuit** — `circuitStore.newCircuit()` resets nodes/components/wires/name and clears undo history. Exposed in Sidebar as a dashed "＋ New Circuit" button with inline Confirm/Cancel.

**Oscilloscope UX** — `scopeStore.clearChannels()` clears all 4 channels. `PropertiesInspector` renders a 📊 button per pin with a valid netId (up to 4 channels). Oscilloscope header has a "✕ all" button. Channel labels show live voltage via RAF loop.

**Part descriptions** — `PART_DESCRIPTIONS` in `constants/partDescriptions.ts` maps `ComponentType` → short description. Passed to `ComponentTile` as `description` prop.

**Breadboard labels** — `BreadboardLabels.tsx` renders floating `<Text>` for row letters (a–j) and column numbers (1, 5, 10 … 60) using `PITCH` and `ROWS`/`COLS` from `constants/breadboard.ts`.

**Learn tab** — `LearnPanel.tsx` shows overall progress bar (X/11), ✓ badge on completed modules, violet left-border on the active module, and a subtle "Reset progress" button that calls `moduleStore.resetProgress()`.

**Wire context menu** — Right-clicking a wire calls `openWireMenu(wireId, x, y)` in uiStore. `WireContextMenu` (named export from `ContextMenu.tsx`) renders 7 color swatches + a Delete button. Wire color is stored as `wire.color` in circuitStore and read by `Wire.tsx` for rendering.

**Sidebar collapse** — `uiStore.showSidebar` (default `true`) gates `<Sidebar />` render in `page.tsx`. When hidden, a floating `›` button (absolute-positioned) reveals it. `B` key calls `toggleSidebar()`.

**Parts category filter** — `Sidebar.tsx` has `'all' | 'passive' | 'active' | 'power' | 'ic'` chip row above the parts list. `PART_CATEGORIES` maps each `ComponentType` to a category. Chips are mutually exclusive; `'all'` is the default.

**Zoom controls** — `uiStore` has `zoomInRequested` / `zoomOutRequested` counters (increment to trigger). `Scene.tsx` listens with `useEffect` and moves the camera via OrbitControls ref. `CanvasOverlay` buttons call `requestZoomIn` / `requestZoomOut` / `requestZoomToFit`. `requestZoomToComponent(id)` zooms to a specific placed component (used by Ctrl+F search).

**Click-to-place** — `uiStore.clickToPlaceType` + `clickToPlaceRotation`. When set, clicking the canvas places that component type. `R` rotates, `Escape` cancels. Set by clicking a part tile; toggled off after each placement.

**Inline value editor** — `InlineValueEditor.tsx` opens on double-click of a component (or after "Swap type"). Reads/writes primary prop (resistance, capacitance, etc.) via `parseEngValue` from `@/lib/engineering`. Commits on Enter/blur.

**Swap type** — Right-click → "Swap type" opens `SwapTypeMenu.tsx` with pin-compatible types (2-pin group / 3-pin group). Calls `circuitStore.swapComponentType(id, newType)` which keeps anchorPos + rotationY, resets props to {}, re-runs net analysis. Auto-opens inline editor if new type has a primary value.

**Multi-component drag** — When `selectedComponentIds.length > 1`, pointer-down on any selected component in Scene.tsx starts a group drag. On pointer-up, calls `circuitStore.moveComponents(moves)` to batch-move all selected components maintaining relative positions. Single-select drag uses Scene.tsx pointer handlers unchanged.

**Canvas search** — `CanvasSearch.tsx` opened by Ctrl+F. Filters placed components by type name, navigates with arrow keys, Enter zooms to selected. Uses `requestZoomToComponent` in uiStore.

**Smart defaults** — `circuitStore.addComponent()` calls `getSmartDefaultProps(type, components)` to inherit the most-recently-placed same-type component's primary value. Falls back to empty props if no existing component of that type.

**Wire routing** — `uiStore.wireRoutingMode: 'curve' | 'orthogonal'`. Toggled with Q key. Orthogonal mode renders wires as axis-aligned L-shapes. Stored in localStorage via uiStore partialize.

**Onboarding tooltip** — First-visit tooltip overlay (dismissed to localStorage). Explains drag-to-place, wiring, and simulation start.

**Net labels** — `circuitStore.netLabels: Record<number, string>`. Right-click wire → "Name net" → typed in wire context menu. Displayed in Wire.tsx tooltips and schematic. Stored in circuit JSON.

**Component lock** — `locked?: boolean` on `PlacedComponent`. `moveComponent()` / `removeComponent()` no-op if locked. Shown as 🔒 badge on 3D model. Toggle via right-click → Lock/Unlock.

**Annotations** — `circuitStore.notes: CircuitNote[]`. Add via right-click → "Add note". Render as `<Text>` in Scene.tsx. Double-click to edit in-place. Included in JSON save/load.

## Stores at a Glance

| Store | What it holds | Undo/redo |
|---|---|---|
| `circuitStore` | nodes, components, wires, circuitName, selectedNodeId, selectedComponentId, selectedComponentIds, wiringMode, componentClipboard (module-level) | Yes (zundo, topology only) |
| `uiStore` | hoveredNodeId, simStatus (`'idle'\|'running'\|'error'\|'warn'`), simErrorDismissed, simPaused, sab, showHelp, showSidebar, showValueLabels, arduinoTabRequested, zoom requests, power, showPolarityLabels, showWireVoltageColors, overloadIds, circuitHealthWarning, contextMenu, wireMenu, boxSelect, serialOutput | No |
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
| `W` | Toggle component value labels (Ω, µF, V) |
| `O` | Toggle oscilloscope |
| `S` | Toggle schematic view |
| `B` | Show/hide sidebar |
| `F` | Zoom to fit |
| `+` / `-` | Zoom in / out |
| `1` / `2` | Camera perspective / top |
| `R` | Rotate selected/dragged component |
| `Space` | Pause / resume simulation |
| `A` | Open Arduino panel |
| `?` | Show/hide help overlay |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C/V/A/D` | Copy / Paste / Select all / Duplicate |
| `Tab` / `Shift+Tab` | Cycle selection forward / backward through components |
| `Shift+click` | Add/remove component from multi-selection |
| `Delete/Backspace` | Delete wire (when wire context menu is open), else delete selected |
| `Escape` | Close open overlay (scope/schematic/help) first, then deselect / cancel |
| `F11` | Toggle fullscreen |
| `Ctrl+F` | Open component search overlay |
| `Q` | Toggle orthogonal wire routing |
| `Ctrl+N` | New circuit (with confirmation) |
| `Arrow keys` | Nudge selected component (0.254 mm / 1 pitch per press) |

## Copy / Paste / Multi-Select

`circuitStore` exposes:

- `selectedComponentIds: string[]` — all components in the current selection (multi-select via `toggleSelectedComponent`)
- `selectAll()` — sets `selectedComponentIds` to all component IDs (Ctrl+A)
- `copySelected()` — snapshots `selectedComponentIds` (or falls back to `selectedComponentId`) into the module-level `componentClipboard`
- `pasteClipboard(offsetCols?)` — pastes clipboard shifted 5 columns right by default; snaps pin nodes to nearest breadboard hole; selects pasted components
- `loadFromJSON()` — clears `componentClipboard` to prevent stale clipboard surviving a circuit load
- `deleteSelected()` — deletes all `selectedComponentIds` (or falls back to `selectedComponentId`), then also deletes any wire connected to `selectedNodeId`
- `rotateComponent(id)` — rotates component and calls `runNetAnalysis` so net IDs update immediately
- `nudgeComponent(id, dx, dz)` — moves component by delta (arrow key nudge, 1 pitch = 0.254)
- `moveComponent(id, newAnchorPos)` — moves component to absolute world position with pin re-snap
- `moveComponents(moves)` — batch-move multiple components (multi-drag); moves processed atomically
- `swapComponentType(id, newType)` — replaces component type in-place; keeps pos/rotation; resets props; toasts undo hint
- `newCircuit()` — clears nodes/components/wires/name, resets undo history

## Known Limitations / Future Work

- BJT simulation uses Ebers-Moll transport model (βR=1, no Early effect, no temperature model).
- Capacitors use backward Euler (first-order accuracy) with adaptive timestep (dt = τ/10, clamped 10µs–1ms); no RK4.
- 555 timer is a behavioral model (frequency only) — no threshold/comparator detail.
- Motor and tactile switch are placed but electrically modelled as resistors only.
- Arduino ADC: `analogRead()` feeds SAB net voltages into `AVRADC` — fully implemented.
- Arduino PWM: `analogWrite()` computes duty-cycle voltage from TCCR/OCR registers — fully implemented.
- Overload detection: `SimController` tracks components with |I| above rated threshold and sets `uiStore.overloadIds` — implemented.
- Schematic view is read-only — no manual drag of component positions.

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
