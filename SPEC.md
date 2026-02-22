# SPEC: Wire Auto-Coloring by Voltage

Auto-color wires red/black based on the simulated voltage of the net they carry.
This helps beginners understand power flow at a glance.

## Read First
- `components/canvas/Wire.tsx` — where wire color is set in useFrame
- `simulation/SimBridge.ts` — exports `voltages` Float32Array (SAB-backed)
- `store/circuitStore.ts` — `nodes` map has `netId` per node
- `store/uiStore.ts` — how to add a toggle (see showCurrentLabels for the pattern)
- `components/Toolbar.tsx` — where to add the toggle button

## Implementation

### Step 1: Add toggle to uiStore

In `store/uiStore.ts`:
- Add `showWireVoltageColors: boolean` to the interface (default: `true`)
- Add `toggleWireVoltageColors: () => void` action
- Implement as a simple boolean flip (same pattern as `showCurrentLabels`)

### Step 2: Wire.tsx — read netId + voltage in useFrame

In `components/canvas/Wire.tsx`:
1. Import `voltages` from `@/simulation/SimBridge` (already imports `branchCurrents` from there)
2. Read `showWireVoltageColors` from uiStore:
   ```tsx
   const showWireVoltageColors = useUIStore((s) => s.showWireVoltageColors);
   ```
3. Read the fromNode's netId from circuitStore:
   ```tsx
   const fromNetId = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.netId ?? -1);
   ```
4. In `useFrame`, after the current/overload logic, compute auto-color:
   ```tsx
   // Auto-color by voltage (when not overloaded and feature is enabled)
   if (!isOverloaded && showWireVoltageColors && fromNetId >= 0) {
     const v = voltages[fromNetId] ?? 0;
     let autoColor: string;
     if (v > 2.5) {
       autoColor = '#cc2200';      // red — high voltage
     } else if (v < 0.3) {
       autoColor = '#333344';      // dark — near ground
     } else {
       autoColor = wire.color;     // mid-range — keep stored color
     }
     matRef.current.color.set(autoColor);
     matRef.current.emissive.set(autoColor);
   }
   ```
   Place this AFTER the existing overload block (which has an early return) and AFTER the pulse calculation that sets `wire.color`.

   IMPORTANT: The existing code already does `matRef.current.color.set(wire.color)` in useFrame. The auto-color logic should override it when enabled. Restructure so the auto-color runs after/instead of the `wire.color` assignment.

### Step 3: Toolbar button

In `components/Toolbar.tsx`:
- Add a "V Voltage" toggle button, same pattern as "I Current" and "L Labels"
- Key: `V`
- Import `useUIStore` and bind `showWireVoltageColors` + `toggleWireVoltageColors`
- Read the file to find the exact button pattern and copy it

### Step 4: Keyboard shortcut

In `components/KeyboardShortcuts.tsx`:
- Add `V` key handler that calls `toggleWireVoltageColors()`
- Follow the exact same pattern as the existing `I` key for current labels
- Read the file to find the right spot

## Color scheme
- `> 2.5V` → `#cc2200` (dark red — power/positive rail)
- `< 0.3V` → `#333344` (near-black — ground/negative)
- Between 0.3–2.5V → keep `wire.color` from store (user-chosen color)
- Overloaded wire always → orange/red pulse (existing behavior, untouched)
- Ground (net 0, voltage = 0.0) will be colored dark — correct behavior

## Important notes
- `voltages` in SimBridge is a Float32Array initialized to zeros — it's safe to read before simulation starts (wires will just show dark color until circuit runs)
- `fromNetId` may be -1 if node doesn't exist yet — guard with `fromNetId >= 0` before indexing
- Net 0 is typically ground (0V) — the ground bus wires will be colored dark automatically
- Use individual selectors for all useStore hooks (not inline objects)
- Do NOT change `wire.color` stored in circuitStore — only override the material color in useFrame

Run `pnpm build` — must pass with zero errors.
