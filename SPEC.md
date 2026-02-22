# SPEC: Learn Tab Polish — Progress Bar + Module Completion UI

Improve the Learn tab so beginners can see their progress through the 11 modules.

## Read First
- `components/sidebar/LearnPanel.tsx` — current Learn tab UI
- `store/moduleStore.ts` — has `completedModuleIds: string[]` and `activeModuleId`
- `features/modules/definitions.ts` — MODULES array (11 modules with id, title, subtitle)

## What to build

### Part 1: Overall progress bar (top of Learn panel)
At the top of `LearnPanel.tsx`, add a progress section showing:
- Text: "X / 11 modules complete" (where X = completedModuleIds.length)
- A horizontal progress bar: a full-width dark track with a colored fill proportional to X/11
  - Track: `bg-white/8 rounded h-1.5`
  - Fill: `bg-violet-500 rounded h-1.5` with inline `width: (completedModuleIds.length / MODULES.length * 100).toFixed(1) + '%'`
  - Transition: `transition-all duration-500`

### Part 2: Completion badge on each module card
Each module card in LearnPanel already maps over MODULES. For each module:
- If `completedModuleIds.includes(module.id)`, show a ✓ checkmark badge on the card:
  - Small green circle with ✓: `w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center`
  - Position: top-right of the card (use relative + absolute positioning)

### Part 3: Active module highlight
The currently active module (`activeModuleId`) should have a subtle left border accent:
- `border-l-2 border-violet-400` when `module.id === activeModuleId`
- `border-l-2 border-transparent` otherwise

### Part 4: "Reset progress" button
At the bottom of the Learn panel (after the module list), add a small "Reset progress" button:
- `text-[10px] text-white/20 hover:text-white/50` style — very subtle
- On click: calls `useModuleStore.getState().resetModules()`
- `resetModules()` already exists in moduleStore — it sets completedModuleIds to [] and activeModuleId to null

## Zustand selector pattern (CRITICAL)
Always use individual selectors — NEVER inline objects:
```tsx
// CORRECT:
const completedModuleIds = useModuleStore(s => s.completedModuleIds);
const activeModuleId = useModuleStore(s => s.activeModuleId);

// WRONG (causes infinite render loop in React 18):
const { completedModuleIds, activeModuleId } = useModuleStore(s => ({ ... }));
```

## Important
- Only modify `components/sidebar/LearnPanel.tsx`
- Do NOT modify moduleStore.ts, definitions.ts, or any other files
- Run `pnpm build` — must pass with zero TypeScript errors
