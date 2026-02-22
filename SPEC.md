# SPEC: Top Toolbar (Undo/Redo/Delete/Labels/Schematic + Key Shortcut Bar)

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.
Key file: `app/page.tsx` (the main layout)
Also: `store/circuitStore.ts` exports `useCircuitHistory` for undo/redo.
`components/KeyboardShortcuts.tsx` handles keyboard events.

## Problem
There are no toolbar buttons for common actions. Users must know keyboard
shortcuts to undo, delete, toggle labels, open schematic, etc.
Beginners struggle to discover these features.

## What to Build

A horizontal toolbar strip at the top of the `<main>` canvas area
(inside `<main className="relative flex-1 min-w-0 h-full">`).
Position it absolutely at the top, above the 3D canvas.

### Toolbar layout
```
[↩ Undo] [↪ Redo]  |  [🗑 Delete] [⎘ Copy] [⎙ Paste]  |  [L Labels] [I Current] [S Schematic]
```

Position: `absolute top-0 left-0 right-0 z-20`
Style: `flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07]`

### Button style (reusable)
```tsx
function ToolbarBtn({
  onClick, title, disabled, active, children
}: {
  onClick: () => void; title: string; disabled?: boolean; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/[0.1] cursor-pointer'}
        ${active ? 'bg-white/[0.1] text-white/90' : 'text-white/55 hover:text-white/80'}
        focus-visible:ring-1 focus-visible:ring-[#7c6fff] focus-visible:outline-none`}
    >
      {children}
    </button>
  );
}
```

### Separator
```tsx
function Sep() {
  return <span className="w-px h-4 bg-white/[0.1] mx-1 flex-shrink-0" />;
}
```

### Store hooks needed
- `useCircuitHistory` → `{ undo, redo, pastStates, futureStates }` from `@/store/circuitStore`
  - `canUndo = pastStates.length > 0`
  - `canRedo = futureStates.length > 0`
- `useCircuitStore` → `deleteSelected`, `copySelected`, `pasteClipboard`, `selectedComponentId`, `selectedComponentIds`
- `useUIStore` → `showDesignators`, `toggleDesignators`, `showCurrentLabels`, `toggleCurrentLabels`
  - Read the uiStore to verify exact action names — grep for `showDesignator` and `showCurrentLabel`
- `useSchematicStore` → `open`, `toggle`

### Button actions
- **Undo**: `useCircuitHistory().getState().undo()`, disabled if `!canUndo`
- **Redo**: `useCircuitHistory().getState().redo()`, disabled if `!canRedo`
- **Delete**: `deleteSelected()`, disabled if no selection (`!selectedComponentId && selectedComponentIds.length === 0`)
- **Copy**: `copySelected()`, disabled if no selection
- **Paste**: `pasteClipboard()` (always enabled, even if clipboard empty — it no-ops)
- **Labels (L)**: `toggleDesignators()`, active when `showDesignators`
- **Current (I)**: `toggleCurrentLabels()`, active when `showCurrentLabels`
- **Schematic (S)**: `toggleSchematic()` from schematicStore, active when `schematicOpen`

### Integration in `app/page.tsx`
In the `<main>` element, add the toolbar before `<Scene />`:
```tsx
<Toolbar />
<Scene />
```
The Scene (canvas) should be pushed down by the toolbar height. Add `pt-[36px]` or
`mt-[36px]` to the Scene's container. Actually, wrap Scene in a div that fills the
remaining space:
```tsx
<div className="absolute inset-0 top-[36px]">
  <Scene />
</div>
```
And the toolbar is `absolute top-0 left-0 right-0 h-[36px]`.

### File to create: `components/Toolbar.tsx`
Create this new file with the ToolbarBtn, Sep, and the main Toolbar component.
Keep it self-contained (import stores directly).

### Update `app/page.tsx`
Import `Toolbar` and add it inside `<main>`:
```tsx
import Toolbar from '@/components/Toolbar';
// ...
<main className="relative flex-1 min-w-0 h-full">
  <Toolbar />
  <div className="absolute inset-0 top-[36px]">
    <Scene />
    <WiringHint />
    <CameraHint />
    {/* ... oscilloscope, schematic ... */}
  </div>
</main>
```

## Rules
- Do NOT change any keyboard shortcuts in KeyboardShortcuts.tsx
- Do NOT change any store logic
- Do NOT add toolbar buttons that duplicate sidebar actions in confusing ways
- Verify uiStore has `showDesignators`, `showCurrentLabels`, `toggleDesignators`, `toggleCurrentLabels`
  (grep the file first — if the names are different, use the correct names)
- Run `pnpm build` and fix all TypeScript errors
