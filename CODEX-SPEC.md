# Codex Agent Spec: Simulation Infrastructure Fixes

## PRIORITY ORDER — do Fix 0 FIRST, it's the #1 bug

Read ALL files before touching anything. Run `npx tsc --noEmit` after every file.

## Files to Read First

- `store/netAnalysis.ts`
- `store/circuitStore.ts`
- `store/dragStore.ts`
- `simulation/mna/NetlistBuilder.ts`
- `simulation/mna/MNASolver.ts`
- `simulation/workers/analog.worker.ts`
- `simulation/SimBridge.ts`
- `types/circuit.ts`
- `components/SimController.tsx`
- `components/sidebar/ArduinoPanel.tsx`
- `store/uiStore.ts`
- `components/canvas/Wire.tsx`
- `components/canvas/WireLayer.tsx`

---

## Fix 0 — CRITICAL: Component pins get netId: null (circuits don't simulate)

### Problem

`runNetAnalysis(nodes, wires)` in `store/netAnalysis.ts` never receives `components`. Component pins reference breadboard node IDs via `pin.nodeId`. If a pin's node has no adjacency edges (no wires, and the node isn't connected to anything by implicit breadboard column edges), BFS skips it: `if (!visited.has(id) && (adj[id]?.size ?? 0) > 0)` — the `> 0` check means isolated nodes stay unvisited with `netId: null`. NetlistBuilder then sees `netId: null` and skips the component entirely. The circuit appears empty to the solver.

There is also a secondary issue: `dragStore.ts` line ~77 only snaps a pin when `bestDist < SNAP_THRESHOLD`. If snap fails, `pin.nodeId = ''`. `nodes['']` is undefined → netId: null → component skipped.

### Fix A — `store/netAnalysis.ts`

Change signature to accept components:

```typescript
export function runNetAnalysis(
  nodes: Record<string, CircuitNode>,
  wires: Record<string, Wire>,
  components: Record<string, PlacedComponent>,
): Record<string, CircuitNode>
```

Add this block AFTER the main BFS loops (after the `for (const id of nodeIds)` loop that assigns floating nets), before building the `updated` result:

```typescript
// Ensure every component pin node gets a netId, even if isolated
for (const comp of Object.values(components)) {
  for (const pin of comp.pins) {
    if (pin.nodeId && nodes[pin.nodeId] && !visited.has(pin.nodeId)) {
      bfs(pin.nodeId, nextNet++);
    }
  }
}
```

### Fix B — `store/circuitStore.ts`

Find every call to `runNetAnalysis(state.nodes, state.wires)` and add `state.components` as the third argument:

```typescript
runNetAnalysis(state.nodes, state.wires, state.components)
```

### Fix C — `store/dragStore.ts`

Find the pin snap logic. Currently it skips snapping if `bestDist >= SNAP_THRESHOLD`. Change to ALWAYS snap to the nearest node (no threshold check for pin→nodeId assignment). The visual snap threshold can remain for the anchor position, but each pin must always get a valid nodeId:

```typescript
// Remove the `if (bestDist < SNAP_THRESHOLD)` guard around nodeId assignment.
// Always assign: nodeId = bestNodeId (the nearest node, regardless of distance).
```

If there's a loop over pins, ensure each pin always sets `nodeId` to the nearest node found, not ''.

---

## Fix 1 — SAB Initialization Conflict (ArduinoPanel creates second SAB)

### `store/uiStore.ts`
Add: `sab: SharedArrayBuffer | null` (init: `null`) and `setSAB: (sab: SharedArrayBuffer) => void`.

### `components/SimController.tsx`
After `initSimBridge(sab)`, call: `useUIStore.getState().setSAB(sab)`.
Also add `wires` from store and pass to postMessage; add `wires` to dependency array.

### `components/sidebar/ArduinoPanel.tsx`
Remove `ensureSAB` callback and `sabRef`. Remove `SAB_TOTAL_BYTES` and `initSimBridge` imports. Add `const sab = useUIStore((s) => s.sab)`. In `uploadAndRun`, guard: `if (!sab) return;`.

---

## Fix 2 — Stale voltages on singular matrix

### `simulation/workers/analog.worker.ts`
When `solveDC` returns null: `voltageView.fill(0)` then `postMessage({ type: 'VOLTAGES_READY', singular: true })`.

### `components/SimController.tsx`
In `VOLTAGES_READY` handler: check `e.data.singular` flag. If true, call `setSimStatus('error', 'Floating net')`. If false, call `setSimStatus('running')`.

---

## Fix 3 — Branch currents never written to SAB

### `simulation/mna/MNASolver.ts`
Change `solveDC` return type to `{ voltages: Float32Array; branchCurrents: Float32Array } | null`.

After solving, compute branch currents:
- Resistors: `I = (V_A - V_B) / R` for each resistor element
- VSources: current is in `x[nonGroundNodeCount + vsourceIndex]` — capture `lastX` before the NR loop ends

Return `{ voltages: result, branchCurrents }`.

### `simulation/workers/analog.worker.ts`
Import `SAB_CURRENT_OFFSET`, `MAX_BRANCHES` from `../../types/circuit`. Add `branchCurrentView: Float32Array`. Reattach when SAB changes. Write `result.branchCurrents` to `branchCurrentView` on success. Fill 0 on failure.

---

## Fix 4 — Wire branch current indexing (reads wrong SAB slot)

### `simulation/mna/NetlistBuilder.ts`
Add `wireBranchIndex: Record<string, number>` to return value. For each wire, find the resistor/vsource element whose `(netA, netB)` match the wire's endpoint netIds. Return that element's index in the branch currents array.

### `types/circuit.ts`
Add `branchIndex?: number` to `Wire` interface.

### `store/circuitStore.ts`
Add `setWireBranchIndices(indices: Record<string, number>): void` action. Implementation: iterate entries, update each wire's `branchIndex`.

### `components/SimController.tsx`
Import `buildNetlist`. In topology `useEffect`, after computing netlist, call `useCircuitStore.getState().setWireBranchIndices(wireBranchIndex)`.

### `components/canvas/WireLayer.tsx`
Pass `branchIndex={wire.branchIndex ?? 0}` instead of array `index`.

---

## Fix 5 — SAB timestamp view

### `simulation/SimBridge.ts`
Add `export let simTimestamp: Float64Array = new Float64Array(1)`. Wire to SAB in `init()` at `SAB_TIMESTAMP_OFFSET`.

### `simulation/workers/analog.worker.ts`
Add `timestampView`. Reattach in SAB block. After successful solve: `timestampView[0] = performance.now()`.

---

## Verification

```bash
npx tsc --noEmit   # must be clean
pnpm build         # must succeed
```

Manual: place battery + resistor + LED → LED should glow. Remove battery → LED goes dark.
