# SPEC: Top-Down Camera Default + Circuit Health Checker

## Two independent changes — implement both.
Run `pnpm build` — must pass with zero errors.

---

## Change 1: Top-Down Camera as Default View

### Goal
New users find the perspective 3D view disorienting. Physical breadboards are
always viewed from above. Make top-down (orthographic/perspective looking straight
down) the default camera position.

### Implementation

Read `components/canvas/Scene.tsx` fully first.

Find where the camera is initialized or where OrbitControls sets its initial position.

Change the initial camera setup:
- Position: directly above center, looking down: `[0, 15, 0]` or similar
- Target: `[0, 0, 0]` (center of breadboard)
- Rotation: straight down

In R3F with OrbitControls, this is usually done via the camera `position` prop
on the Canvas or PerspectiveCamera, OR via `OrbitControls` target + initial state.

Look for:
```tsx
<PerspectiveCamera makeDefault position={[x, y, z]} />
// or
camera={{ position: [x, y, z] }}
```

Change to a top-down position. The breadboard is at y=0, roughly 13 units wide.
A good top-down position: `position={[0, 12, 0.01]}` (the tiny z offset prevents gimbal lock).

The OrbitControls should allow the user to still orbit to 3D view.

Also update the `1` / `2` key shortcuts in `components/KeyboardShortcuts.tsx`:
- `1` → perspective view (3D, at a nice angle like `[8, 8, 8]`)
- `2` → top-down view (the new default)

Currently `2` is top and `1` is perspective — keep this and just swap which is default.

---

## Change 2: Circuit Health Checker (Enhanced)

The basic all-zero diagnostic was added in a previous branch. Enhance it with
specific checks.

### Location
Add health check logic to `components/SimController.tsx` or a new
`components/CircuitHealthChecker.tsx` component.

### Checks to implement

Read `store/circuitStore.ts` and `store/netAnalysis.ts` to understand how to
query topology.

**Check 1: No complete circuit (already exists — improve message)**
- Condition: components >= 2, battery exists, all voltages near 0
- Message: "No current flowing — check that battery + and − both connect to the circuit"

**Check 2: LED without current-limiting resistor**
- Condition: LED exists, no resistor shares a net with the LED
- Implementation:
  ```typescript
  const leds = components where type === 'led'
  const resistors = components where type === 'resistor'
  for each led:
    const ledNetIds = led.pins.map(p => nodes[p.nodeId]?.netId).filter(Boolean)
    const hasResistor = resistors.some(r =>
      r.pins.some(p => ledNetIds.includes(nodes[p.nodeId]?.netId))
    )
    if (!hasResistor) → warn "LED needs a current-limiting resistor in series"
  ```
- Message: "LED connected without a resistor — add a 220–470Ω resistor to limit current"

**Check 3: Short circuit (battery terminals directly connected)**
- Condition: battery's positive and negative pins share the same net
- Message: "Short circuit detected — battery + and − are directly connected"

**Check 4: Floating net (component pin with netId = null)**
- Condition: any component pin has netId = null (not connected to anything)
- Skip: don't report freshly placed components that haven't been wired yet (wait 3s)
- Message: "Some component pins aren't connected — check all pins have wires"

### Rate limiting
- Check at most once every 3 seconds
- Don't show the same warning twice in a row
- Clear warnings when circuit changes

### Display
Use existing `toastStore` with severity `'warn'`.
OR: add a small persistent indicator in `StatusBar.tsx` (bottom of sidebar).

The StatusBar approach is better — a persistent indicator that doesn't auto-dismiss.
Add a yellow dot + short message in StatusBar when there's an active health warning.

Read StatusBar.tsx first.
