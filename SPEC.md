# SPEC: StepCard Polish — Next Module Button + Auto-Hint Timer

Two improvements to the StepCard:
1. **"Next module →" button** in the completion banner so users don't wait for the 2.5s auto-dismiss
2. **Auto-hint** — after 15s of inactivity on a step, the hint expands automatically

## Read First
- `components/StepCard.tsx` — look for the `justCompleted` branch (renders "Module complete!" banner) and the `hintVisible` state + "Need a hint?" button
- `store/moduleStore.ts` — look for `startModule(id)`, `exitModule()`, `completedModuleIds`
- `features/modules/definitions.ts` — import `MODULES` to find the next incomplete module

## Part 1: "Next module →" button in completion banner

In the `justCompleted` branch of `StepCard.tsx`, import `MODULES` from `@/features/modules/definitions`:
```tsx
import { MODULES } from '@/features/modules/definitions';
```

In the `justCompleted` render block, compute the next module inside the component:
```tsx
const completedModuleIds = useModuleStore((s) => s.completedModuleIds);
const startModule        = useModuleStore((s) => s.startModule);
const exitModule         = useModuleStore((s) => s.exitModule);

// Find the next module that isn't completed yet
const nextModule = MODULES.find(
  (m) => !completedModuleIds.includes(m.id) && m.id !== activeModuleId
);
```

Replace the existing completion banner JSX with a version that includes a button row:
```tsx
if (justCompleted) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-sm w-full px-4">
      <div className="bg-[#111113]/95 border border-[#7c6fff]/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm text-center">
        <div className="text-[#7c6fff] text-xl leading-none">✓</div>
        <p className="text-white/95 text-sm font-semibold mt-2">Module complete!</p>
        <p className="text-white/75 text-sm mt-1">{modTitle}</p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            type="button"
            onClick={exitModule}
            className="text-white/35 hover:text-white/60 text-xs transition-colors"
          >
            Done
          </button>
          {nextModule && (
            <button
              type="button"
              onClick={() => startModule(nextModule.id)}
              className="text-[#7c6fff] hover:text-[#9b8fff] text-xs font-medium transition-colors"
            >
              {nextModule.title} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Part 2: Auto-hint timer

The existing code has `const [hintVisible, setHintVisible] = useState(false)` and resets on step change.

Add an auto-hint effect: after 15s on a step without user action, expand the hint automatically. Add a `useEffect` that sets up a timer when `activeModuleId` or `activeStepIndex` changes:

```tsx
useEffect(() => {
  if (!activeStep?.hint) return;
  const timer = setTimeout(() => setHintVisible(true), 15_000);
  return () => clearTimeout(timer);
}, [activeModuleId, activeStepIndex, activeStep?.hint]);
```

This replaces the need to click "Need a hint?" after 15 seconds — the hint slides open automatically.

## Zustand selector rule (CRITICAL)
Always individual selectors — NEVER inline objects:
```tsx
const completedModuleIds = useModuleStore(s => s.completedModuleIds);  // CORRECT
const startModule = useModuleStore(s => s.startModule);                  // CORRECT
```

## Important
- File: `components/StepCard.tsx` only — no store changes needed
- `MODULES` is imported from `@/features/modules/definitions`
- The auto-dismiss timer in `moduleStore.advanceStep()` still runs (the "Next module →" button is additive, not a replacement for the auto-dismiss)
- `nextModule` may be `undefined` if all modules are complete — hide the button with `{nextModule && ...}`
- Run `pnpm build` — must pass with zero TypeScript errors
