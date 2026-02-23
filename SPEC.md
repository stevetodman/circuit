# SPEC: Better NR Non-Convergence UX

## Problem
When Newton-Raphson fails to converge in `MNASolver.ts` (after 60 iterations), the solver
returns best-effort voltages and emits `SIM_WARN` to the main thread. The toast appears
briefly and users may miss it. Meanwhile the circuit shows "wrong" but plausible-looking
voltages with no persistent indication that the simulation is invalid.

## Solution
1. Elevate the non-convergence from a transient toast to a persistent sim error state
2. Make the status bar show an amber/yellow "Not converged" indicator (not red "Error")

## Current State
- `analog.worker.ts` posts `{ type: 'SIM_WARN', message }` on non-convergence
- `SimController.tsx` receives SIM_WARN and calls `addToast(message, 'warn')`
- `uiStore.simStatus` can be `'idle' | 'running' | 'error'`
- `uiStore.setSimStatus(status, error?)` updates the status
- `StatusBar.tsx` shows a dot: idle=grey, running=green, error=red

## Changes Required

### `simulation/workers/analog.worker.ts`
When NR fails, change the posted message type from `SIM_WARN` to `SIM_NR_FAIL`:
```ts
// Instead of: self.postMessage({ type: 'SIM_WARN', message: 'NR did not converge' })
self.postMessage({ type: 'SIM_NR_FAIL', message: 'Simulation did not converge — results may be inaccurate' });
```
Also post `SIM_OK` when the next solve DOES converge, to clear the warning.

### `components/SimController.tsx`
Handle the new message type:
```ts
case 'SIM_NR_FAIL':
  addToast(data.message, 'warn');
  useUIStore.getState().setSimStatus('warn' as any); // see uiStore change below
  break;
case 'SIM_OK':  // clear convergence warning
  if (useUIStore.getState().simStatus === 'warn') {
    useUIStore.getState().setSimStatus('running');
  }
  break;
```

### `store/uiStore.ts`
Add `'warn'` to the simStatus union:
```ts
simStatus: 'idle' | 'running' | 'error' | 'warn';
```
Update `setSimStatus` signature and implementation accordingly.

### `components/sidebar/StatusBar.tsx`
Add the warn dot style:
```ts
const SIM_DOT = {
  idle:    { color: '#555',    label: 'Idle' },
  running: { color: '#22cc66', label: 'Running' },
  error:   { color: '#dd3333', label: 'Error' },
  warn:    { color: '#ffaa00', label: 'Not converged' },  // amber
};
```

## What NOT to do
- Do NOT change the NR algorithm itself
- Do NOT change how SIM_WARN is handled for other warnings (overload, etc.)
- 4 files: analog.worker.ts, SimController.tsx, uiStore.ts, StatusBar.tsx
