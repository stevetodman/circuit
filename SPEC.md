# SPEC: Analog Simulation Pause / Resume

Add a ⏸/▶ toggle to pause and resume the analog simulation transient loop,
plus a spacebar shortcut. Pausing freezes the SAB so the oscilloscope and
LED brightness hold their last values without flickering or resetting.

## Read First
- `simulation/workers/analog.worker.ts` — look for `startLoop()`, `stopLoop()`,
  and the `self.onmessage` handler block. No PAUSE message exists yet.
- `store/uiStore.ts` — add `simPaused` + `toggleSimPaused` (pattern: simSpeed/setSimSpeed)
- `components/SimController.tsx` — where to add the effect that forwards pause state to worker
- `components/sidebar/StatusBar.tsx` — where to add the ⏸/▶ button
- `components/KeyboardShortcuts.tsx` — where to bind spacebar

## Part 1: analog.worker.ts — handle PAUSE / RESUME

Add a new union to the message type near the top where `SetSpeedMsg` is defined:
```ts
type PauseMsg = { type: 'PAUSE' };
type ResumeMsg = { type: 'RESUME' };
```

Update `self.onmessage` signature to include the new types:
```ts
self.onmessage = (e: MessageEvent<UpdateNetlistMsg | SetSpeedMsg | PauseMsg | ResumeMsg>) => {
```

In the message handler block, after the `SET_SPEED` handler and before the
`UPDATE_NETLIST` guard, add:
```ts
if (msg.type === 'PAUSE') {
  stopLoop();
  return;
}
if (msg.type === 'RESUME') {
  if (wasRunning) startLoop();
  return;
}
```

Add a module-level `let wasRunning = false;` just above the `startLoop` function.
In `startLoop()`, set `wasRunning = true;` as the first line.
In `stopLoop()`, capture `wasRunning = intervalId !== null;` BEFORE clearing intervalId.

This ensures RESUME only restarts the loop when it was actually running (capacitor
circuits), not for pure DC circuits where no interval was started.

## Part 2: uiStore.ts — add simPaused

Add to the interface and initial state:
```ts
simPaused: boolean;
toggleSimPaused: () => void;
```
Initial: `simPaused: false`.
Action: `toggleSimPaused: () => set((s) => ({ simPaused: !s.simPaused }))`.

## Part 3: SimController.tsx — forward pause/resume to worker

Read the existing file to find `workerRef` and the existing `simSpeed` effect (around line 267–270).

Add a selector and effect right after the simSpeed effect:
```tsx
const simPaused = useUIStore((s) => s.simPaused);

useEffect(() => {
  if (!workerRef.current) return;
  workerRef.current.postMessage({ type: simPaused ? 'PAUSE' : 'RESUME' });
}, [simPaused]);
```

## Part 4: StatusBar.tsx — ⏸/▶ button

Read the existing file. Find the speed chip buttons (the `[1, 2, 5, 10].map(...)` block).
Add a ⏸/▶ button immediately BEFORE the speed chips:

```tsx
const simPaused = useUIStore((s) => s.simPaused);
const toggleSimPaused = useUIStore((s) => s.toggleSimPaused);

<button
  type="button"
  onClick={toggleSimPaused}
  title={simPaused ? 'Resume simulation (Space)' : 'Pause simulation (Space)'}
  className={`w-6 h-5 flex items-center justify-center rounded text-[11px] transition-colors ${
    simPaused
      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
      : 'text-white/40 hover:text-white/70 hover:bg-white/10'
  }`}
>
  {simPaused ? '▶' : '⏸'}
</button>
```

## Part 5: KeyboardShortcuts.tsx — spacebar

Read the existing file. Find the section that handles single-key shortcuts (after
the meta-key block, near the `key === 'f'` handler).

Add:
```tsx
if (key === ' ') {
  e.preventDefault();
  useUIStore.getState().toggleSimPaused();
  return;
}
```

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const simPaused = useUIStore(s => s.simPaused);         // CORRECT
const { simPaused } = useUIStore(s => ({ ... }));       // WRONG — crash
```

## Important
- Files: `simulation/workers/analog.worker.ts`, `store/uiStore.ts`,
  `components/SimController.tsx`, `components/sidebar/StatusBar.tsx`,
  `components/KeyboardShortcuts.tsx`
- Pausing a DC-only circuit (no loop running) is harmless — the button still
  toggles state, the worker ignores RESUME if wasRunning is false
- Run `pnpm build` — must pass with zero TypeScript errors
