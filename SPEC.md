# SPEC: Help Overlay + Keyboard Shortcut Updates

Two missing keyboard shortcuts need to be added to the help overlay and wired up:
1. `Space` — Pause/resume simulation (added in Wave 8, missing from help)
2. `A` — Toggle Arduino panel (not yet implemented)

## Read First
- `components/HelpOverlay.tsx` — find the SECTIONS array; add new rows
- `components/KeyboardShortcuts.tsx` — add the `A` key handler
- `components/sidebar/Sidebar.tsx` — find how tabs/panels are managed; there
  should be a way to toggle to the Arduino tab programmatically

## Part 1: HelpOverlay.tsx — add missing shortcuts

In the SECTIONS array, in the **View** section, add:
```tsx
['Space', 'Pause / resume simulation'],
```

Also add a new **Simulation** section (or add to View if simpler):
```tsx
{
  heading: 'Simulation',
  rows: [
    ['Space', 'Pause / resume simulation'],
    ['1× / 2× / 5× / 10×', 'Simulation speed (in status bar)'],
  ],
},
```

In the **Navigation** section, add the Arduino shortcut once it's wired up:
```tsx
['A', 'Open Arduino panel'],
```

Read the file to understand the exact SECTIONS format and slot in the new rows
without breaking existing structure.

## Part 2: Sidebar.tsx — expose Arduino tab selection

Read `components/sidebar/Sidebar.tsx` to understand how tabs/panels are shown.
There will be a `tab` or `activePanel` state that controls which panel is visible.

If the sidebar uses a `tab` state (e.g., `'parts' | 'arduino' | 'export'`), expose
a way to switch to the Arduino tab from outside the component. The cleanest approach:
- Add `arduinoTabRequested: number` counter to `uiStore.ts` (same increment-to-trigger
  pattern used for `zoomInRequested`, `zoomOutRequested`)
- Add `requestArduinoTab: () => void` to uiStore
- In Sidebar.tsx, watch the counter and switch to the Arduino tab when it increments

If the sidebar tab state is already in a store, use that store directly instead.

## Part 3: KeyboardShortcuts.tsx — A key

In the handler, after the existing single-key shortcuts, add:
```tsx
if (key === 'a') {
  e.preventDefault();
  useUIStore.getState().requestArduinoTab();
  return;
}
```

Make sure `A` doesn't conflict with any existing handler (check the file).
If `requestArduinoTab` requires a different store, import that instead.

## Part 4: Sidebar.tsx — respond to arduinoTabRequested

In Sidebar.tsx, add a useEffect that watches the counter and switches the active tab:
```tsx
const arduinoTabRequested = useUIStore((s) => s.arduinoTabRequested);
useEffect(() => {
  if (arduinoTabRequested > 0) setActiveTab('arduino'); // use actual tab name
}, [arduinoTabRequested]);
```

Read the file to find the actual tab name for the Arduino panel.

## Zustand selector rule (CRITICAL)
```tsx
const arduinoTabRequested = useUIStore(s => s.arduinoTabRequested);  // CORRECT
const { arduinoTabRequested } = useUIStore(s => ({ ... }));            // WRONG
```

## Important
- Files: `components/HelpOverlay.tsx`, `components/KeyboardShortcuts.tsx`,
  `store/uiStore.ts`, `components/sidebar/Sidebar.tsx`
- Read each file carefully before editing — don't guess at tab names or state shape
- The `arduinoTabRequested` counter pattern: initial value `0`, action increments by 1
  each call. The `useEffect` in Sidebar runs whenever the number changes.
- If the Arduino panel is not tab-based but always visible, the `A` key could instead
  scroll it into view or toggle its expanded state — read the file to decide.
- Run `pnpm build` — must pass with zero TypeScript errors
