# SPEC: UX Polish — Polarity Indicator + Circuit Diagnostic + Toolbar Buttons

## Priority
🟡 HIGH — implement all three items.
Run `pnpm build` to verify — must pass with zero errors.

---

## Item 1: "No Complete Circuit" Diagnostic Warning

### Goal
If the simulator has been running for >2 seconds and all net voltages are 0
(no current flowing anywhere), show a diagnostic toast explaining the likely issue.

### Implementation

**`components/SimController.tsx`**:
Add a check in the `useEffect` that runs the simulation status updates (or in the
analog worker message handler):

```typescript
// Track time since last non-zero voltage
let allZeroSince: number | null = null;

// In the interval that reads SAB or handles worker messages:
const hasNonZeroVoltage = Array.from(voltageView).some(v => Math.abs(v) > 0.01);
const componentCount = useCircuitStore.getState().components.length;

if (componentCount >= 2 && !hasNonZeroVoltage) {
  if (allZeroSince === null) allZeroSince = Date.now();
  else if (Date.now() - allZeroSince > 2000) {
    // Show diagnostic — but only once
    toastStore.getState().showToast(
      'No voltage detected. Check: is there a complete path from + to − through all components?',
      'warn'
    );
    allZeroSince = null; // Don't spam
  }
} else {
  allZeroSince = null;
}
```

The toast uses the existing `toastStore` with `'warn'` severity.

**Don't show if:**
- 0 or 1 components (nothing to diagnose)
- Circuit was just loaded (wait 2s)
- SimStatus is 'error' (already showing an error)

---

## Item 2: Polarity Indicator on 3D LED

### Goal
Show a small +/− marker on the 3D LED model so beginners know which end is anode vs cathode.
This is the most critical polarity issue (reversed LED = no light, confusing).

### Implementation

**`components/canvas/parts/LED.tsx`**:

The LED component already has `anchorPos` (the center of the LED on the breadboard).
LED pins: `anode` (one side) and `cathode` (other side).

Find where the LED body is rendered (likely a cylinder or sphere mesh).

Add two small floating text labels in 3D space using `@react-three/drei`'s `<Text>` component:
```tsx
import { Text } from '@react-three/drei';

// Near the anode pin:
<Text
  position={[anodeLocalX, 0.15, 0]}  // slightly above anode end
  fontSize={0.05}
  color="#22ff88"
  anchorX="center"
  anchorY="bottom"
>
  +
</Text>

// Near the cathode pin:
<Text
  position={[cathodeLocalX, 0.15, 0]}
  fontSize={0.05}
  color="#ff4444"
  anchorX="center"
  anchorY="bottom"
>
  −
</Text>
```

Find the actual local X positions of anode and cathode from the LED component definition
(check `types/circuit.ts` or the LED component file for pin offsets).

The `+` should be green (`#22ff88`) and `−` should be red (`#ff4444`).
Make them small but visible — `fontSize={0.04}` to `0.06`.

Only show when `showDesignators` is true (same condition as designator labels) OR always show.
Always-show is simpler and more beginner-friendly — do that.

---

## Item 3: Toolbar Buttons for Common View Toggles

### Goal
Add visible toolbar buttons for the most useful view toggles so beginners don't need
to discover keyboard shortcuts.

### Current toolbar location
Look in `components/sidebar/Sidebar.tsx` or `app/page.tsx` for any existing toolbar.
If no toolbar exists, add a thin button row at the top of the sidebar panel or
as a floating row above the canvas.

### Buttons to add

Add buttons for these currently keyboard-only actions:
| Button | Icon | Action |
|--------|------|--------|
| Fit    | ⊡ (or ⤢) | zoom to fit (F key) — `uiStore.requestZoomToFit()` |
| Labels | 🏷 | toggle designator labels (L key) — `uiStore.toggleDesignators()` |
| Current | ⚡ | toggle current labels (I key) — `uiStore.toggleCurrentLabels()` |
| Schematic | 📐 | toggle schematic view (S key) — `schematicStore.toggle()` |
| Scope  | 📊 | toggle oscilloscope (O key) — `scopeStore.toggleOpen()` |
| Help   | ? | toggle help overlay — `uiStore.toggleHelp()` |

### Implementation

Find the `StatusBar.tsx` in `components/sidebar/StatusBar.tsx` — it's at the bottom of the sidebar.
Or look for where the status dot is rendered.

**Option A: Add to StatusBar** (preferred — least invasive)
Add icon buttons to the StatusBar alongside the existing sim status dot.

**Option B: New toolbar strip**
Add a `<Toolbar />` component in `components/Toolbar.tsx` and render it in `app/page.tsx`
as a horizontal strip above the canvas (floating, semi-transparent).

Either approach is fine — choose based on what fits better after reading the files.

**Button style** (match existing):
```tsx
<button
  onClick={action}
  title="Zoom to fit (F)"
  className="w-7 h-7 rounded flex items-center justify-center
             text-white/40 hover:text-white/80 hover:bg-white/10
             transition-colors text-xs"
>
  ⊡
</button>
```

Add `title` attributes with keyboard shortcut shown: "Labels (L)", "Schematic (S)", etc.

---

## Implementation Notes

- Read the files before modifying — understand current structure
- DO NOT add new npm packages
- Use existing store actions — do NOT duplicate logic
- The `Text` component from @react-three/drei is already used in the project (Wire.tsx current labels)
- Run `pnpm build` — fix all TypeScript errors
- If a store action doesn't exist yet (e.g. toggleCurrentLabels), add it to uiStore.ts
