# SPEC: Arduino Panel UX — Keyboard Shortcut + Auto-scroll Serial

Two improvements to the Arduino panel:
1. `A` key opens the Arduino tab in the sidebar
2. Serial output auto-scrolls to bottom when new text arrives, with a
   "scroll to bottom" button when the user has scrolled up

## Read First
- `components/sidebar/Sidebar.tsx` — read the entire file to understand tab/panel
  management. Find the state variable that controls which panel is visible. Find
  where the Arduino panel is rendered.
- `components/sidebar/ArduinoPanel.tsx` — find the serial output `<div>` or `<pre>`
  element. Look for auto-scroll logic (it may or may not exist).
- `components/KeyboardShortcuts.tsx` — find where to add the `A` key handler
- `store/uiStore.ts` OR another store — decide where to put the Arduino tab request

## Part 1: Sidebar tab state

Read `Sidebar.tsx` carefully. There will be a `tab` or `panel` state with a string
value for each panel. Find its current value list.

If the active tab/panel is local state in Sidebar, add a module-level store trigger
or a prop. The simplest approach without store changes:

Add to `uiStore.ts`:
```ts
arduinoTabRequested: number;
requestArduinoTab: () => void;
```
Initial: `arduinoTabRequested: 0`.
Action: `requestArduinoTab: () => set((s) => ({ arduinoTabRequested: s.arduinoTabRequested + 1 }))`.

In `Sidebar.tsx`, watch the counter:
```tsx
const arduinoTabRequested = useUIStore((s) => s.arduinoTabRequested);
useEffect(() => {
  if (arduinoTabRequested > 0) {
    setActiveTab('arduino'); // use the real tab key for Arduino
  }
}, [arduinoTabRequested]);
```

Read the file to find the actual tab key string for Arduino.

## Part 2: KeyboardShortcuts.tsx — A key

Find the single-key handler section. Add:
```tsx
if (key === 'a') {
  e.preventDefault();
  useUIStore.getState().requestArduinoTab();
  return;
}
```

Guard with `!meta` (don't intercept Ctrl+A = select all):
```tsx
if (!meta && key === 'a') { ... }
```

## Part 3: ArduinoPanel.tsx — auto-scroll serial output

Read the serial output div in `ArduinoPanel.tsx`. Look for a `<pre>`, `<div>`,
or element that displays `serialOutput` from `uiStore`.

Add auto-scroll behavior:
```tsx
const serialRef = useRef<HTMLDivElement>(null);
const [userScrolled, setUserScrolled] = useState(false);

// Auto-scroll when new content arrives (unless user scrolled up)
const serialOutput = useUIStore((s) => s.serialOutput);
useEffect(() => {
  if (!userScrolled && serialRef.current) {
    serialRef.current.scrollTop = serialRef.current.scrollHeight;
  }
}, [serialOutput, userScrolled]);

// Detect manual scroll
const handleScroll = () => {
  const el = serialRef.current;
  if (!el) return;
  const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
  setUserScrolled(!isAtBottom);
};
```

Attach `ref={serialRef}` and `onScroll={handleScroll}` to the serial output container.

Add a "↓" button that appears when `userScrolled`:
```tsx
{userScrolled && (
  <button
    type="button"
    onClick={() => {
      setUserScrolled(false);
      if (serialRef.current) serialRef.current.scrollTop = serialRef.current.scrollHeight;
    }}
    className="absolute bottom-2 right-2 bg-white/10 hover:bg-white/20 text-white/60 text-[10px] px-1.5 py-0.5 rounded"
  >
    ↓ latest
  </button>
)}
```

Make the parent div `relative` for the absolute-positioned button.

## Part 4: HelpOverlay.tsx — A shortcut

In the Navigation section, add:
```tsx
['A', 'Open Arduino panel'],
```

## Zustand selector rule (CRITICAL)
```tsx
const arduinoTabRequested = useUIStore(s => s.arduinoTabRequested);  // CORRECT
const { arduinoTabRequested } = useUIStore(s => ({ ... }));            // WRONG
```

## Important
- Files: `store/uiStore.ts`, `components/KeyboardShortcuts.tsx`,
  `components/sidebar/Sidebar.tsx`, `components/sidebar/ArduinoPanel.tsx`,
  `components/HelpOverlay.tsx`
- Read each file in full before editing — don't assume tab key names or state shape
- The `!meta && key === 'a'` guard is essential — `Ctrl+A` must still select all
- If `serialOutput` is not in uiStore, find where it actually is (might be in toastStore
  or a different store) — grep the codebase
- Run `pnpm build` — must pass with zero TypeScript errors
