# SPEC: Module Spotlight — Visual Cues for Active Step

The `ModuleStep` type already has two hint fields that are not yet wired up:
- `spotlightTarget?: 'sidebar-parts' | 'breadboard' | 'oscilloscope' | 'properties'`
- `highlightComponent?: ComponentKind`

Implement both so beginners know WHERE to look when a step is active.

## Read First
- `components/StepCard.tsx` — add spotlightTarget display here
- `components/sidebar/ComponentTile.tsx` — add pulse ring for highlightComponent
- `features/modules/types.ts` — ModuleStep interface (already has the fields)
- `store/moduleStore.ts` — how to read activeStep
- `components/sidebar/Sidebar.tsx` — sidebar structure for optional section glow

## Part 1: StepCard spotlightTarget hint

In `components/StepCard.tsx`, after the instruction `<p>`, add a small directional cue when `step.spotlightTarget` is set.

Map target to human text:
```
'sidebar-parts'  → '← Add a component from the Parts panel'
'breadboard'     → '↑ Place it on the breadboard'
'oscilloscope'   → 'Open the oscilloscope (key O)'
'properties'     → '← Check the Properties inspector'
```

Render it as a subtle pill below the instruction, only when spotlightTarget is truthy:
```tsx
{step.spotlightTarget && (
  <div className="mt-1.5 inline-flex items-center gap-1 bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-full px-2.5 py-0.5">
    <span className="text-[#7c6fff]/80 text-[10px]">{SPOTLIGHT_LABELS[step.spotlightTarget]}</span>
  </div>
)}
```

Define `SPOTLIGHT_LABELS` as a const above the component.

## Part 2: ComponentTile highlight ring

In `components/sidebar/ComponentTile.tsx`, read `activeStep.highlightComponent` from moduleStore:
```tsx
const highlightComponent = useModuleStore((s) => s.activeStep?.highlightComponent ?? null);
```

When the tile's component type matches `highlightComponent`, add a pulsing ring to the tile:
- Add `ring-1 ring-[#7c6fff]/70 animate-pulse` to the tile's className when highlighted
- Keep it subtle — don't change size or layout, just the ring

Read the file to find the tile wrapper element and add the conditional className.

## Part 3: Sidebar section glow (optional, keep simple)

In `components/sidebar/Sidebar.tsx`, when `activeStep?.spotlightTarget === 'sidebar-parts'`, add a subtle ring to the parts section:
```tsx
const spotlightTarget = useModuleStore((s) => s.activeStep?.spotlightTarget ?? null);
// On the parts panel container div, add:
className={`... ${spotlightTarget === 'sidebar-parts' ? 'ring-1 ring-[#7c6fff]/25' : ''}`}
```

Keep it very subtle — this is just a visual nudge, not a modal overlay.

## Important notes
- Import `useModuleStore` from `@/store/moduleStore`
- Use individual selectors (NOT inline objects) to avoid React 18 useSyncExternalStore crashes:
  ```tsx
  // CORRECT:
  const highlightComponent = useModuleStore((s) => s.activeStep?.highlightComponent ?? null);
  // WRONG (causes infinite loop):
  const { highlightComponent } = useModuleStore((s) => ({ highlightComponent: s.activeStep?.highlightComponent }));
  ```
- Only add spotlight fields to module definitions that actually use them — don't add to all steps
- Update at least 2–3 steps in `features/modules/definitions.ts` with `spotlightTarget` and `highlightComponent` values to demonstrate the system works

Run `pnpm build` — must pass with zero errors.
