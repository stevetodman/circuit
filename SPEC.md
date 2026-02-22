# SPEC: Module Polish — Completion Celebration + Better First Module

Polish the module system UX. Read each file fully before editing.

## Change 1: Module Completion Celebration

File: `components/StepCard.tsx` and `store/moduleStore.ts`

When the final step of a module is completed (advanceStep called on the last step), show a brief completion state in the StepCard before it closes:
- Show a ✓ icon + "Module complete!" text + module title
- Show for 2.5 seconds then auto-close (the store already calls exitModule after completion)

In `moduleStore.ts`, look at `advanceStep`. When `activeStepIndex + 1 >= module.steps.length`, it should mark the module complete. Add a `justCompleted: boolean` field to the store that is set to `true` when a module completes, and auto-resets to `false` after 2.5s using `setTimeout`.

In `StepCard.tsx`, read `justCompleted` from the store and show the completion UI when true, even if `activeModuleId` is null.

## Change 2: Hint System

File: `components/StepCard.tsx`

Add a "Need a hint?" button below the step instruction. 
- Hidden by default
- On click: reveal `step.hint` text with a fade in
- Reset (hide hint) when step advances

## Change 3: Learn Tab — Module Info on Hover/Click

File: `components/sidebar/LearnPanel.tsx`

Currently the Learn panel just has a list. When a module is clicked to start it, show an expanded state below the module title with:
- The `mod.concept` text (the "what you'll learn" description)
- A "Start →" button that calls `startModule(mod.id)`

This replaces the click immediately starting the module — instead:
1. First click = expand concept preview
2. Start button click = actually start

For currently active modules, show "Continue →" button instead of "Start →".

Keep it simple — no animations needed, just conditional rendering.

## Change 4: Status Bar — Smarter Health Warnings

File: `components/sidebar/StatusBar.tsx`

The health warning is showing at the bottom but it's partially clipped.  
Read the current StatusBar layout and make the health warning always fully visible (not clipped by container bounds).

Also: make the warning dismissible with an ✕ button. Store dismissed state locally (useState) and reset it when `circuitHealthWarning` changes.

Run `pnpm build` — must pass with zero errors.
