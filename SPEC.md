# SPEC: Simulation Speed Control (1×/2×/5×/10×)

Add a speed multiplier for the transient simulation so users can watch
capacitor charge curves, 555 blinkers, and LED fades in slow or fast motion.

## Read First
- `simulation/workers/analog.worker.ts` — look for `DT_MS`, `intervalId`, `setInterval(tick, DT_MS)`
- `store/uiStore.ts` — add `simSpeed` + `setSimSpeed`
- `components/SimController.tsx` — look for how messages are posted to analog worker; add SET_SPEED dispatch
- `components/sidebar/StatusBar.tsx` — add speed chip UI

## Part 1: analog.worker.ts — handle SET_SPEED

Add a new message type. Near the `DT_MS` constant, add:
```ts
let currentIntervalMs = DT_MS; // default 1ms = 1×
```

In the message handler block, handle the new type:
```ts
if (msg.type === 'SET_SPEED') {
  currentIntervalMs = DT_MS / (msg.speed as number);
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = setInterval(tick, currentIntervalMs);
  }
  return;
}
```

Replace `setInterval(tick, DT_MS)` (where transient loop starts) with:
```ts
intervalId = setInterval(tick, currentIntervalMs);
```

## Part 2: uiStore.ts — add simSpeed

Add to interface and initial state:
```ts
simSpeed: number;
setSimSpeed: (speed: number) => void;
```
Initial: `simSpeed: 1`. Action: `setSimSpeed: (speed) => set({ simSpeed: speed })`.

## Part 3: SimController.tsx — forward speed to worker

Read the existing code carefully to find `workerRef` (the ref holding the analog worker instance).

Add effect to forward speed changes:
```tsx
const simSpeed = useUIStore(s => s.simSpeed);

useEffect(() => {
  if (!workerRef.current) return;
  workerRef.current.postMessage({ type: 'SET_SPEED', speed: simSpeed });
}, [simSpeed]);
```

## Part 4: StatusBar.tsx — speed chip UI

Add compact 1×/2×/5×/10× buttons at the end of the existing icon row:
```tsx
const simSpeed = useUIStore(s => s.simSpeed);
const setSimSpeed = useUIStore(s => s.setSimSpeed);

{[1, 2, 5, 10].map(speed => (
  <button
    key={speed}
    type="button"
    onClick={() => setSimSpeed(speed)}
    className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
      simSpeed === speed
        ? 'bg-violet-500/25 text-violet-300'
        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
    }`}
    title={`Simulation speed: ${speed}×`}
  >
    {speed}×
  </button>
))}
```

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const simSpeed = useUIStore(s => s.simSpeed);       // CORRECT
const { simSpeed } = useUIStore(s => ({ ... }));    // WRONG — crash
```

## Important
- Files: `simulation/workers/analog.worker.ts`, `store/uiStore.ts`, `components/SimController.tsx`, `components/sidebar/StatusBar.tsx`
- Only restart the interval when one is already running (`intervalId !== null`)
- Speed only affects the transient loop (capacitors/555); DC-only circuits unaffected
- Run `pnpm build` — must pass with zero TypeScript errors
