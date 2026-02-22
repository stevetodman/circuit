# SPEC: Beginner Onboarding — First-Run Auto-Load + Wiring Mode Banner + Example Gallery

## Priority
🔴 HIGHEST — implement all items in this spec.
Run `pnpm build` to verify — must pass with zero errors.

---

## Item 1: Auto-Load Example on First Visit

### Goal
On first visit (no circuit loaded, localStorage key not set), auto-load the "LED + Resistor"
example so the canvas isn't empty.

### Implementation

**`app/page.tsx`** or **`components/SimController.tsx`**:
- On mount, check `localStorage.getItem('circuit-has-visited')`
- If not set: call `loadFromJSON(EXAMPLE_CIRCUITS[0])` to load the first example (basic LED+resistor)
  then set `localStorage.setItem('circuit-has-visited', '1')`
- If set: do nothing (user has their own circuit)

Find `EXAMPLE_CIRCUITS` import path from `features/examples/circuits.ts`.
Find `loadFromJSON` in `store/circuitStore.ts`.

The auto-load should happen once on mount, before render.
Use `useEffect(() => { ... }, [])` in a client component.

---

## Item 2: First-Run Welcome Overlay (3-step)

### Goal
After auto-loading the example, show a brief dismissable overlay explaining the 3 core actions.

### Implementation

**New component: `components/WelcomeOverlay.tsx`**

Show only when:
- `localStorage.getItem('circuit-welcome-dismissed')` is not set
- AND the circuit was auto-loaded (first visit)

UI:
```
┌─────────────────────────────────────────────────────────────┐
│                  Welcome to Circuit Sandbox                 │
│                                                             │
│  1. 🔌  Drag parts from the left panel onto the board       │
│  2. ⚡  Click a pin, then click another pin to wire         │
│  3. 👁  Watch voltages update live — hover a pin to read it │
│                                                             │
│         [Load an Example ▾]        [Get Started →]         │
└─────────────────────────────────────────────────────────────┘
```

- Fixed center overlay, semi-transparent backdrop
- "Get Started →" dismisses and sets `localStorage.setItem('circuit-welcome-dismissed', '1')`
- "Load an Example ▾" opens the ExampleLoader dropdown (or scrolls sidebar to it)
- Close on backdrop click also dismisses
- Style matches existing HelpOverlay dark theme

**`app/page.tsx`**: import and render `<WelcomeOverlay />` alongside other overlays.

---

## Item 3: Example Gallery on Empty Canvas

### Goal
When the canvas has zero components, show a gallery of example cards on the canvas itself
(rendered as an HTML overlay, not in Three.js) so beginners discover examples immediately.

### Implementation

**`components/canvas/EmptyStateGallery.tsx`**

Show when `circuitStore.components.length === 0`.

Layout: a centered grid of example cards (max 6 cards, 3 per row on desktop):
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   Try an example:                                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │💡 LED     │  │⚡ Voltage │  │🔁 Blink  │                   │
│  │ Basics   │  │  Divider │  │  Arduino │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │🔋 555    │  │🎛 Pot    │  │⚗ Zener   │                   │
│  │  Blinker │  │  Dimmer  │  │  Diode   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│     Or drag a part from the left panel to start fresh       │
└──────────────────────────────────────────────────────────────┘
```

Each card:
- Shows example name and a simple emoji icon
- Clicking loads the example via `circuitStore.loadFromJSON(example)`
- Style: dark card `bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3`

This is an HTML div absolutely positioned over the canvas (not Three.js).
Add to `app/page.tsx` or `components/canvas/Scene.tsx` as a sibling to the canvas.

**Import EXAMPLE_CIRCUITS** from `features/examples/circuits.ts`.
**Import loadFromJSON** from `store/circuitStore.ts`.

**Emoji map for examples** (approximate by id):
- led-resistor → 💡
- voltage-divider → ⚡
- blink → 🔁 (or 🟢)
- rc-blinker → ⏱
- pot-dimmer → 🎛
- zener-regulator → ⚗
- bjt-switch → 🔀
- 555-astable → 📡
- Default → 🔌

---

## Implementation Notes

- DO NOT break SSR — EmptyStateGallery and WelcomeOverlay must use `'use client'` and
  check `typeof window !== 'undefined'` before accessing localStorage
- DO NOT add new npm packages
- Keep styles consistent with existing dark theme (`bg-[#111113]`, `text-white/80`, etc.)
- Run `pnpm build` — fix all TypeScript errors
- The gallery disappears as soon as the first component is placed (reactive to store)
