# SPEC: Sidebar Collapse Toggle

## Goal
Add a button in the sidebar header and a `B` keyboard shortcut to hide/show
the sidebar, giving more canvas space on small screens.

## Current State
- Sidebar is always visible at 240–260px width
- `uiStore` does NOT have a `showSidebar` field
- `app/page.tsx` renders `<Sidebar>` unconditionally
- No keyboard shortcut or button to collapse it

## Changes Required

### `store/uiStore.ts`
Add to the state interface (near `showHelp`):
```ts
showSidebar: boolean;
toggleSidebar: () => void;
```
Add to the initial state object:
```ts
showSidebar: true,
```
Add to the actions object:
```ts
toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
```

### `app/page.tsx`
Import `useUIStore`. Read `showSidebar`:
```tsx
const showSidebar = useUIStore((s) => s.showSidebar);
```
Conditionally render the Sidebar:
```tsx
{showSidebar && <Sidebar />}
```
When sidebar is hidden, show a small floating button on the left edge of the
canvas to reveal it again:
```tsx
{!showSidebar && (
  <button
    onClick={() => useUIStore.getState().toggleSidebar()}
    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-[#1a1a1f]
               border border-white/[0.1] rounded-r flex items-center justify-center
               text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
    title="Show sidebar (B)"
  >
    ›
  </button>
)}
```
The main layout flex-row should still work — when Sidebar is absent the canvas
stretches to fill.

### `components/sidebar/Sidebar.tsx`
Add a collapse button in the sidebar header area (the div with circuit name).
Import `useUIStore`. Add a small `‹` button at the end of the header row:
```tsx
const toggleSidebar = useUIStore((s) => s.toggleSidebar);
// In JSX, at the end of the header div:
<button
  onClick={toggleSidebar}
  title="Collapse sidebar (B)"
  className="ml-auto w-6 h-6 rounded flex items-center justify-center
             text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors text-[14px]"
>
  ‹
</button>
```

### `components/KeyboardShortcuts.tsx`
Add a `B` key handler (no meta):
```tsx
if (!meta && key === 'b') {
  e.preventDefault();
  useUIStore.getState().toggleSidebar();
  return;
}
```
Add it near the other toggle shortcuts (L, I, P, V, O, S).

### `components/HelpOverlay.tsx`
Add `['B', 'Show / hide sidebar']` to the View section rows.

## What NOT to do
- Do NOT animate the sidebar collapse — just show/hide
- Do NOT change sidebar width — just conditionally render it
- Keep the existing flex layout in page.tsx working
