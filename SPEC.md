# SPEC: Wiring Mode Banner + Pin Voltage Tooltip on Hover

## Priority
🔴 HIGHEST — implement both items.
Run `pnpm build` to verify — must pass with zero errors.

---

## Item 1: Persistent Wiring Mode Banner

### Goal
When the user is in wiring mode (clicked a pin and is about to click a second pin),
show a persistent banner above the canvas explaining what to do and how to cancel.

### Current wiring mode state
- `circuitStore.wiringMode` — boolean
- `circuitStore.selectedNodeId` — the first pin that was clicked (source pin)

### Implementation

**`components/WiringBanner.tsx`** (new small component):
```tsx
'use client';
import { useCircuitStore } from '@/store/circuitStore';

export default function WiringBanner() {
  const { wiringMode, selectedNodeId } = useCircuitStore(s => ({
    wiringMode: s.wiringMode,
    selectedNodeId: s.selectedNodeId,
  }));

  if (!wiringMode) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3
                    bg-[#7c6fff]/20 border border-[#7c6fff]/60 rounded-full
                    px-5 py-2 text-sm text-white/90 backdrop-blur-sm shadow-lg
                    pointer-events-none select-none">
      <span className="w-2 h-2 rounded-full bg-[#7c6fff] animate-pulse" />
      Wiring — click a destination pin to connect
      <span className="text-white/40 ml-2">Esc to cancel</span>
    </div>
  );
}
```

**`app/page.tsx`**: import and render `<WiringBanner />` alongside other overlays.

The banner:
- Fixed position, centered at top of screen
- Uses the existing purple accent color (#7c6fff)
- Pulsing purple dot to indicate active state
- Pointer-events-none (doesn't block canvas interaction)
- Disappears immediately when wiringMode becomes false

---

## Item 2: Pin Voltage Tooltip on Hover

### Goal
When hovering a pin/node on the breadboard, show the voltage at that net in a small
tooltip near the cursor. The voltage data is already in the SAB `voltageView`.

### Current hover state
- `uiStore.hoveredNodeId` — the node ID of the currently hovered pin
- `circuitStore.nodes` — map of nodeId → { netId, ... }
- `SimBridge.voltageView` — Float32Array of voltages indexed by netId

### Implementation

**`components/canvas/PinTooltip.tsx`** (new component):

This is an HTML overlay (not Three.js), positioned using CSS fixed positioning.
It needs the mouse position, which is available from `uiStore` or we track it separately.

**Step 1: Track mouse position in uiStore**
In `store/uiStore.ts`, add:
```typescript
mouseX: number;
mouseY: number;
setMousePos(x: number, y: number): void;
```

**Step 2: Update mouse position on canvas mousemove**
In `components/canvas/Scene.tsx` (or wherever the canvas pointer events are handled),
on `onPointerMove`:
```typescript
useUIStore.getState().setMousePos(e.clientX, e.clientY);
```
This is already happening for other things — just add the store update.

**Step 3: PinTooltip component**
```tsx
'use client';
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import { voltageView } from '@/simulation/SimBridge';

export default function PinTooltip() {
  const { hoveredNodeId, mouseX, mouseY } = useUIStore(s => ({
    hoveredNodeId: s.hoveredNodeId,
    mouseX: s.mouseX,
    mouseY: s.mouseY,
  }));
  const nodes = useCircuitStore(s => s.nodes);

  if (!hoveredNodeId) return null;

  const node = nodes[hoveredNodeId];
  if (!node || node.netId == null) return null;

  const voltage = voltageView[node.netId] ?? 0;
  const label = Math.abs(voltage) < 0.001
    ? '0 V'
    : `${voltage.toFixed(2)} V`;

  return (
    <div
      style={{ left: mouseX + 12, top: mouseY - 28 }}
      className="fixed z-50 pointer-events-none
                 bg-[#1a1a2e] border border-white/20 rounded px-2 py-1
                 text-xs text-white/90 font-mono shadow-lg"
    >
      {label}
      <span className="text-white/40 ml-1.5">{hoveredNodeId}</span>
    </div>
  );
}
```

**`app/page.tsx`**: import and render `<PinTooltip />`.

### Important: voltageView is a SAB-backed typed array
- Import from `@/simulation/SimBridge` — it's a Float32Array
- Read it synchronously in render — it's always fresh from the SAB
- No need for useFrame or subscriptions — React re-render on hoveredNodeId change is enough

### Voltage display format
- |V| < 0.001 → "0 V"
- |V| < 1.0 → "420 mV"
- Otherwise → "3.30 V"

Implement proper engineering notation:
```typescript
function formatVoltage(v: number): string {
  const abs = Math.abs(v);
  if (abs < 0.001) return '0 V';
  if (abs < 1) return `${(v * 1000).toFixed(0)} mV`;
  return `${v.toFixed(2)} V`;
}
```

---

## Implementation Notes

- DO NOT add new npm packages
- `voltageView` is module-level in SimBridge — safe to import and read directly
- The tooltip must NOT cause React re-renders on every frame — only on hoveredNodeId change
- Keep the tooltip small and unobtrusive
- Run `pnpm build` — fix all TypeScript errors
