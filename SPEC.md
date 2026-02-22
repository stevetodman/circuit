# SPEC: Circuit Statistics in StatusBar

Show a compact circuit summary in the StatusBar:
component count, net count, and sim time (for transient circuits).

The StatusBar already shows sim status, power, and mode chip.
Add a stats line with these three numbers.

## Read First
- `components/sidebar/StatusBar.tsx` — find a good place to insert the stats line.
  Look at the existing layout: status dot row, icon row, mode chip row, warning banner.
- `store/circuitStore.ts` — `components` map and `nodes` map
- `store/uiStore.ts` — check if simulation time is stored here, or look at SimBridge
- `simulation/SimBridge.ts` — `timestampView` Float64Array — `timestampView[0]` holds
  sim time in seconds (written by analog.worker.ts every tick)

## Part 1: Component count

In StatusBar.tsx, already computed is `netCount` (from nodes).
Add component count:
```tsx
const componentCount = useCircuitStore((s) => Object.keys(s.components).length);
```

## Part 2: Simulation time

The sim timestamp is in `simulation/SimBridge.ts` as `timestampView`.
Since it's a SAB-backed Float64Array, it can be read on the main thread at any time.

Read from it in a `useEffect` / `useState` pattern with a `setInterval`:
```tsx
const [simTimeS, setSimTimeS] = useState(0);
useEffect(() => {
  const id = setInterval(() => {
    const { timestampView } = await import('@/simulation/SimBridge');
    if (timestampView) setSimTimeS(timestampView[0] ?? 0);
  }, 200);
  return () => clearInterval(id);
}, []);
```

Actually, import SimBridge at the top level (not dynamic) — it's already used elsewhere
in the main thread (SimController imports from it). Read the file to see how SimBridge
exports are imported in existing components.

```tsx
import { timestampView } from '@/simulation/SimBridge';
// In a 200ms interval:
setSimTimeS(timestampView ? timestampView[0] ?? 0 : 0);
```

### Format sim time

```tsx
function formatSimTime(seconds: number): string {
  if (seconds < 0.001) return '0ms';
  if (seconds < 1)     return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60)    return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
}
```

## Part 3: Stats display in StatusBar

Add a compact stats row between the icon row and the mode chip row:

```tsx
<div className="flex items-center gap-3 px-3 pb-1 text-[9px] font-mono text-white/25">
  <span title="Component count">{componentCount} parts</span>
  <span title="Net count">{netCount} nets</span>
  {simTimeS > 0 && (
    <span title="Simulated time elapsed">⏱ {formatSimTime(simTimeS)}</span>
  )}
</div>
```

This shows e.g.: `5 parts   3 nets   ⏱ 142ms`

## Important
- Only touch `components/sidebar/StatusBar.tsx`
- `timestampView` may be `null` initially (before SAB is initialized) — guard with `?? 0`
- The 200ms polling interval for sim time is fine — no need for faster updates
- Only show sim time when `simTimeS > 0` (DC circuits don't advance sim time)
- `netCount` is already computed in StatusBar.tsx — reuse it
- Zustand selectors: always individual, never inline objects
- Run `pnpm build` — must pass with zero TypeScript errors
