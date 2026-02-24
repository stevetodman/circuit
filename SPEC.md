# P1.5 — Wire validation preview (short-circuit warning)

## Overview
While the user is wiring (a start pin is selected), as they hover over a target pin, show a color-coded preview:
- **Green tooltip** "Connect to Net N" when the connection is clean (different nets or one end unconnected)
- **Red wire preview + red tooltip** "Short! Net A ↔ Net B" when both pins are already on different non-null nets

## Architecture context
- This is a Next.js 16 + React 18 + Three.js/R3F project
- `components/canvas/WirePreview.tsx` — renders the live arc preview during wiring; receives the endpoint from `hoveredNodeId` in uiStore
- `components/canvas/Pin.tsx` — handles pointer events on pins; has `hoveredNodeId` + `selectedNodeId`
- `store/uiStore.ts` — `hoveredNodeId`, `mouseX`, `mouseY` are already tracked here
- `store/circuitStore.ts` — `nodes` map gives `netId` per node; `selectedNodeId` = wire start pin

## Files to modify
- `components/canvas/WirePreview.tsx`
- `store/uiStore.ts`

---

## Implementation

### 1. `store/uiStore.ts`

Add to `UIState` interface:
```ts
wireValidationStatus: 'clean' | 'short' | null;
wireValidationMessage: string | null;
setWireValidationStatus: (status: 'clean' | 'short' | null, message?: string | null) => void;
```

Add initial state values:
```ts
wireValidationStatus: null,
wireValidationMessage: null,
```

Add action:
```ts
setWireValidationStatus: (status, message = null) => set({ wireValidationStatus: status, wireValidationMessage: message }),
```

---

### 2. `components/canvas/WirePreview.tsx`

Read the current file first to understand its structure. It renders a preview arc while wiring.

Add validation logic: when `hoveredNodeId` changes and `selectedNodeId` is set, check if it's a short:
```ts
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

// Inside the component, add:
const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
const nodes = useCircuitStore((s) => s.nodes);
const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
const setWireValidationStatus = useUIStore((s) => s.setWireValidationStatus);
```

Add a `useEffect` that runs whenever `hoveredNodeId` or `selectedNodeId` changes:
```ts
useEffect(() => {
  if (!hoveredNodeId || !selectedNodeId || hoveredNodeId === selectedNodeId) {
    setWireValidationStatus(null);
    return;
  }
  const fromNet = nodes[selectedNodeId]?.netId ?? null;
  const toNet = nodes[hoveredNodeId]?.netId ?? null;
  if (fromNet != null && toNet != null && fromNet !== toNet) {
    setWireValidationStatus('short', `Short! Net ${fromNet} ↔ Net ${toNet}`);
  } else if (toNet != null) {
    setWireValidationStatus('clean', `Connect to Net ${toNet}`);
  } else {
    setWireValidationStatus('clean', null);
  }
  return () => setWireValidationStatus(null);
}, [hoveredNodeId, selectedNodeId, nodes, setWireValidationStatus]);
```

**Wire color:** Change the existing tube/line color based on validation status:
- If `wireValidationStatus === 'short'` → color the preview tube/material red `#ff2222`
- If `wireValidationStatus === 'clean'` → color green `#22cc88`
- Otherwise (no hover target) → original preview color (white/grey)

Read the actual WirePreview.tsx to see how the preview color is set and modify accordingly.

**Tooltip overlay:** Render a small floating tooltip below/next to the cursor when `wireValidationMessage` is non-null:

Create a new React component inside WirePreview.tsx (exported separately or just used in page.tsx):

Actually, create a small `WireValidationTooltip` component in the same file or a new file `components/canvas/WireValidationTooltip.tsx`:

```tsx
export function WireValidationTooltip() {
  const wireValidationStatus = useUIStore((s) => s.wireValidationStatus);
  const wireValidationMessage = useUIStore((s) => s.wireValidationMessage);
  const mouseX = useUIStore((s) => s.mouseX);
  const mouseY = useUIStore((s) => s.mouseY);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);

  if (!wireValidationMessage || !selectedNodeId) return null;

  const isShort = wireValidationStatus === 'short';
  return (
    <div
      style={{ left: mouseX + 14, top: mouseY - 36 }}
      className={`fixed z-50 pointer-events-none px-2.5 py-1 rounded-md text-xs font-medium shadow-lg
        ${isShort
          ? 'bg-red-900/80 border border-red-500/40 text-red-200'
          : 'bg-emerald-900/80 border border-emerald-500/40 text-emerald-200'
        }`}
    >
      {isShort ? '⚠ ' : '✓ '}{wireValidationMessage}
    </div>
  );
}
```

Mount `WireValidationTooltip` in `app/page.tsx` alongside other overlays:
```tsx
import { WireValidationTooltip } from '@/components/canvas/WireValidationTooltip';
// in JSX:
<WireValidationTooltip />
```

OR better, since the tooltip is a plain HTML overlay (not Three.js), mount it in app/page.tsx. But to keep it self-contained, put it in WirePreview.tsx as a named export and mount from page.tsx.

---

## Important notes
- The validation only activates when `selectedNodeId` is set (wiring mode active) AND `hoveredNodeId` is a different pin
- Short detection: both `fromNet !== null` AND `toNet !== null` AND `fromNet !== toNet`
- Clean: either end is unconnected (netId null) OR they share the same net (already connected — same behavior as existing "already connected" guard in circuitStore.addWire)
- Clean up `wireValidationStatus` to `null` when the hover leaves (use the `return () => ...` cleanup in useEffect)

## Build validation
Run `pnpm build` to verify no type errors.
