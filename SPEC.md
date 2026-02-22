# SPEC: Module System — UI Layer

## Goal
Build the UI for the guided curriculum:
1. "Learn" tab in the sidebar
2. Canvas overlay: spotlight + step counter + instruction card
3. Module intro overlay (concept card)
4. Step auto-validation loop

This builds on top of `store/moduleStore.ts` from the module-core branch.
If moduleStore doesn't exist yet, create a minimal stub with the same API.

Run `pnpm build` — must pass with zero errors.

---

## Read these files first
- `components/sidebar/Sidebar.tsx` — understand existing sidebar tab structure
- `app/page.tsx` — understand overlay mounting
- `store/uiStore.ts` — understand store patterns
- `store/circuitStore.ts` — understand component/node structure
- `features/modules/definitions.ts` — or create a stub if it doesn't exist

---

## 1. moduleStore stub (if not already in repo)

If `store/moduleStore.ts` doesn't exist, create it:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ModuleStep {
  id: string;
  instruction: string;
  hint?: string;
  spotlightTarget?: string;
  highlightComponent?: string;
  validate: (state: unknown) => boolean;
}

export interface Module {
  id: string;
  title: string;
  subtitle: string;
  concept: string;
  prerequisiteId?: string;
  steps: ModuleStep[];
}

interface ModuleStore {
  activeModuleId: string | null;
  activeStepIndex: number;
  completedModuleIds: string[];
  startModule(id: string): void;
  advanceStep(): void;
  exitModule(): void;
  resetProgress(): void;
}

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      activeModuleId: null,
      activeStepIndex: 0,
      completedModuleIds: [],
      startModule: (id) => set({ activeModuleId: id, activeStepIndex: 0 }),
      advanceStep: () => {
        // Will be overridden by module-core; for now just advance index
        set(s => ({ activeStepIndex: s.activeStepIndex + 1 }));
      },
      exitModule: () => set({ activeModuleId: null, activeStepIndex: 0 }),
      resetProgress: () => set({ activeModuleId: null, activeStepIndex: 0, completedModuleIds: [] }),
    }),
    { name: 'circuit-modules' }
  )
);
```

Also create a stub `features/modules/definitions.ts` exporting `MODULES = []` and
`isModuleUnlocked = () => true` if the real one doesn't exist.

---

## 2. Sidebar "Learn" Tab

### Location
`components/sidebar/Sidebar.tsx` currently has tabs or sections. Find where
the parts palette is rendered. Add a "Learn" tab alongside "Parts".

If the sidebar doesn't have tabs, add a tab bar at the top:
```
[Parts] [Learn]
```

### Learn tab content (`components/sidebar/LearnPanel.tsx`)

```tsx
'use client';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, isModuleUnlocked } from '@/features/modules/definitions';

export default function LearnPanel() {
  const { completedModuleIds, activeModuleId, startModule, exitModule } = useModuleStore(s => ({
    completedModuleIds: s.completedModuleIds,
    activeModuleId: s.activeModuleId,
    startModule: s.startModule,
    exitModule: s.exitModule,
  }));

  return (
    <div className="flex flex-col gap-1 p-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2 px-1">
        Guided Modules
      </p>
      {MODULES.map((mod) => {
        const done = completedModuleIds.includes(mod.id);
        const active = activeModuleId === mod.id;
        const unlocked = isModuleUnlocked(mod.id, completedModuleIds);

        return (
          <button
            key={mod.id}
            disabled={!unlocked}
            onClick={() => active ? exitModule() : startModule(mod.id)}
            className={`
              flex items-start gap-2.5 w-full text-left px-2.5 py-2 rounded-md
              transition-colors text-xs
              ${active ? 'bg-[#7c6fff]/20 border border-[#7c6fff]/40' :
                done ? 'bg-white/[0.04] border border-white/[0.06]' :
                unlocked ? 'hover:bg-white/[0.06] border border-transparent' :
                'opacity-30 cursor-not-allowed border border-transparent'}
            `}
          >
            <span className="mt-0.5 shrink-0 text-[11px]">
              {done ? '✓' : active ? '▶' : unlocked ? '○' : '🔒'}
            </span>
            <div>
              <p className={`font-medium ${done ? 'text-white/50' : 'text-white/80'}`}>
                {mod.title}
              </p>
              <p className="text-white/30 text-[10px] mt-0.5">{mod.subtitle}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

## 3. Canvas Overlays

### 3a. Module Intro Overlay (`components/ModuleIntroOverlay.tsx`)

Show concept card when a module starts (before step 1):

```tsx
'use client';
import { useState, useEffect } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES } from '@/features/modules/definitions';

export default function ModuleIntroOverlay() {
  const { activeModuleId, activeStepIndex } = useModuleStore(s => ({
    activeModuleId: s.activeModuleId,
    activeStepIndex: s.activeStepIndex,
  }));
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when a new module starts
  useEffect(() => {
    setDismissed(false);
  }, [activeModuleId]);

  if (!activeModuleId || activeStepIndex > 0 || dismissed) return null;
  const mod = MODULES.find(m => m.id === activeModuleId);
  if (!mod) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="bg-[#111113] border border-white/[0.12] rounded-xl p-7 max-w-md shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7c6fff] mb-2">
          Module {mod.title.split('.')[0].replace(/\D/g, '')}
        </p>
        <h2 className="text-white text-xl font-semibold mb-1">{mod.title.split('. ')[1]}</h2>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">{mod.concept}</p>
        <button
          onClick={() => setDismissed(true)}
          className="w-full bg-[#7c6fff] hover:bg-[#6b5fee] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Start Building →
        </button>
      </div>
    </div>
  );
}
```

### 3b. Step Instruction Card (`components/StepCard.tsx`)

Persistent floating card showing current step. Position: bottom-center of canvas.

```tsx
'use client';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES } from '@/features/modules/definitions';

export default function StepCard() {
  const { activeModuleId, activeStepIndex, exitModule } = useModuleStore(s => ({
    activeModuleId: s.activeModuleId,
    activeStepIndex: s.activeStepIndex,
    exitModule: s.exitModule,
  }));

  if (!activeModuleId) return null;
  const mod = MODULES.find(m => m.id === activeModuleId);
  if (!mod) return null;
  const step = mod.steps[activeStepIndex];
  if (!step) return null;
  const total = mod.steps.length;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-sm w-full px-4">
      <div className="bg-[#111113]/95 border border-[#7c6fff]/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {mod.steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
              i < activeStepIndex ? 'bg-[#7c6fff]' :
              i === activeStepIndex ? 'bg-[#7c6fff]/70' :
              'bg-white/10'
            }`} />
          ))}
          <span className="text-white/30 text-[10px] font-mono ml-2 shrink-0">
            {activeStepIndex + 1}/{total}
          </span>
        </div>

        <p className="text-white/90 text-sm font-medium mb-1">{step.instruction}</p>
        {step.hint && (
          <p className="text-white/40 text-xs mt-1.5">{step.hint}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={exitModule}
            className="text-white/25 hover:text-white/50 text-xs transition-colors"
          >
            Exit lesson
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#7c6fff] animate-pulse" />
            <span className="text-white/30 text-[10px]">Watching for progress…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Step Auto-Validation Loop (`components/ModuleValidator.tsx`)

Poll circuit state every 500ms and call `advanceStep()` when validator passes.

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useScopeStore } from '@/store/scopeStore';
import { voltageView } from '@/simulation/SimBridge';
import { MODULES } from '@/features/modules/definitions';

export default function ModuleValidator() {
  const { activeModuleId, activeStepIndex, advanceStep } = useModuleStore(s => ({
    activeModuleId: s.activeModuleId,
    activeStepIndex: s.activeStepIndex,
    advanceStep: s.advanceStep,
  }));
  const stepRef = useRef({ moduleId: activeModuleId, stepIndex: activeStepIndex });
  stepRef.current = { moduleId: activeModuleId, stepIndex: activeStepIndex };

  useEffect(() => {
    if (!activeModuleId) return;

    const interval = setInterval(() => {
      const { moduleId, stepIndex } = stepRef.current;
      if (!moduleId) return;

      const mod = MODULES.find(m => m.id === moduleId);
      const step = mod?.steps[stepIndex];
      if (!step) return;

      // Build validator state snapshot
      const { components, nodes, wires } = useCircuitStore.getState();
      const scopeChannels = useScopeStore.getState().channels;

      const state = {
        components: Object.fromEntries(
          Object.entries(components).map(([id, c]) => [id, {
            type: c.type,
            props: c.props,
            pins: c.pins,
          }])
        ),
        nodes: Object.fromEntries(
          Object.entries(nodes).map(([id, n]) => [id, { netId: n.netId }])
        ),
        wires,
        voltages: voltageView,
        scopeChannels: scopeChannels.map(ch => ({ netId: ch.netId })),
      };

      if (step.validate(state as Parameters<typeof step.validate>[0])) {
        advanceStep();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeModuleId, advanceStep]);

  return null; // no visual output
}
```

---

## 5. Wire everything into app/page.tsx

Import and render all new components in `app/page.tsx`:

```tsx
import ModuleIntroOverlay from '@/components/ModuleIntroOverlay';
import StepCard from '@/components/StepCard';
import ModuleValidator from '@/components/ModuleValidator';
```

Add inside the JSX, alongside existing overlays:
```tsx
<ModuleIntroOverlay />
<ModuleValidator />
// StepCard goes inside the canvas div (absolute positioned):
<StepCard />
```

---

## 6. Add Learn tab to Sidebar

In `components/sidebar/Sidebar.tsx`:
- Import `LearnPanel`
- Add a tab toggle state (or use uiStore if sidebar already has tabs)
- Render `[Parts] [Learn]` tab bar at top of sidebar
- Conditionally render `LearnPanel` when Learn tab is active

Read Sidebar.tsx carefully before modifying — understand its current structure.

---

## Implementation Notes

- Do NOT import from Three.js or R3F
- Do NOT add new npm packages
- `voltageView` from SimBridge is a Float32Array — always safe to read
- The `validate` function on each step receives the same shape as ValidatorState in types.ts
- Use `useStore.getState()` (not hooks) inside the interval callback to avoid stale closures
- Run `pnpm build` — fix all TypeScript errors
