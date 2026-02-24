# P1.7 — Net labels (named nets)

## Overview
Let users name important nets (e.g. GND, VCC, SDA). Named nets display in 3D (via Wire.tsx labels) and in the schematic. Right-clicking a wire opens an existing menu that we'll extend with a "Name this net" option.

## Architecture context (Next.js 16, React 18, Three.js/R3F, Zustand)
- `store/circuitStore.ts` — Zustand store; holds `nodes`, `wires`, `components`
- `types/circuit.ts` — core types
- `components/ContextMenu.tsx` — `WireContextMenu` (named export) = right-click wire menu with color swatches + delete
- `components/canvas/Wire.tsx` — renders each wire as a CatmullRomCurve3 tube; has `useFrame` that reads voltages
- `features/schematic/SchematicView.tsx` — SVG schematic overlay

## Files to modify
1. `store/circuitStore.ts`
2. `types/circuit.ts`
3. `components/ContextMenu.tsx`
4. `components/canvas/Wire.tsx`

(SchematicView is complex ELK-based SVG — skip for now; net labels in Wire.tsx is enough)

---

## 1. `types/circuit.ts`

No new types needed — `netLabels` is just `Record<number, string>` stored in circuitStore.

---

## 2. `store/circuitStore.ts`

**Add `netLabels: Record<number, string>` to `CircuitState` interface:**
```ts
netLabels: Record<number, string>;
setNetLabel: (netId: number, label: string) => void;
removeNetLabel: (netId: number) => void;
```

**Initial state:**
```ts
netLabels: {},
```

**Actions:**
```ts
setNetLabel(netId, label) {
  const trimmed = label.trim();
  if (!trimmed) {
    // Empty string → remove
    set((state) => {
      const { [netId]: _removed, ...rest } = state.netLabels;
      return { netLabels: rest };
    });
    return;
  }
  set((state) => ({ netLabels: { ...state.netLabels, [netId]: trimmed } }));
},
removeNetLabel(netId) {
  set((state) => {
    const { [netId]: _removed, ...rest } = state.netLabels;
    return { netLabels: rest };
  });
},
```

**Also include `netLabels` in `saveToJSON()` and `loadFromJSON()`:**
- In `saveToJSON()`: add `netLabels: get().netLabels` to the JSON object
- In `loadFromJSON()`: restore `netLabels` from the parsed JSON (default to `{}` if missing)
- In `newCircuit()`: reset `netLabels: {}`

---

## 3. `components/ContextMenu.tsx`

Read the WireContextMenu component (named export). It currently shows 7 color swatches + delete button.

**Add "Name this net" functionality to `WireContextMenu`:**

Import needed stores:
```tsx
import { useCircuitStore } from '@/store/circuitStore';
```

Inside `WireContextMenu`:
```tsx
const wires = useCircuitStore((s) => s.wires);
const nodes = useCircuitStore((s) => s.nodes);
const netLabels = useCircuitStore((s) => s.netLabels);
const setNetLabel = useCircuitStore((s) => s.setNetLabel);

// Determine the netId for this wire
const wire = wireMenu ? wires[wireMenu.wireId] : null;
const netId = wire ? (nodes[wire.fromNodeId]?.netId ?? null) : null;
const currentLabel = (netId != null) ? (netLabels[netId] ?? '') : '';

// State for the inline text input
const [editingLabel, setEditingLabel] = useState(false);
const [labelDraft, setLabelDraft] = useState('');
```

**In the JSX**, below the color swatches, add:
```tsx
{netId != null && !editingLabel && (
  <button
    type="button"
    onClick={() => { setLabelDraft(currentLabel); setEditingLabel(true); }}
    className="w-full text-left text-[11px] text-white/55 hover:text-white/85 px-2 py-1.5 hover:bg-white/[0.06] transition-colors"
  >
    {currentLabel ? `✏ "${currentLabel}"` : '＋ Name this net'}
  </button>
)}
{netId != null && editingLabel && (
  <div className="px-2 py-1.5 flex items-center gap-1">
    <input
      autoFocus
      type="text"
      value={labelDraft}
      onChange={(e) => setLabelDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          setNetLabel(netId, labelDraft);
          setEditingLabel(false);
          closeWireMenu();
        }
        if (e.key === 'Escape') setEditingLabel(false);
      }}
      placeholder="e.g. GND, VCC"
      className="flex-1 bg-white/[0.08] text-white/80 text-[11px] rounded px-1.5 py-0.5 border border-white/[0.12] focus:outline-none focus:border-[#7c6fff]/50 placeholder-white/25"
      maxLength={20}
    />
    <button
      type="button"
      onClick={() => { setNetLabel(netId, labelDraft); setEditingLabel(false); closeWireMenu(); }}
      className="text-[10px] text-[#7c6fff] hover:text-[#9b8fff] font-medium"
    >
      OK
    </button>
  </div>
)}
```

**Important:** Reset `editingLabel = false` when `wireMenu` changes (when menu closes/reopens). Use a `useEffect` that depends on `wireMenu`:
```tsx
useEffect(() => {
  setEditingLabel(false);
  setLabelDraft('');
}, [wireMenu]);
```

---

## 4. `components/canvas/Wire.tsx`

Read Wire.tsx first to understand its structure.

**Import `Text` from `@react-three/drei`** if not already imported.

**Read `netLabels` from circuitStore:**
```tsx
const netLabels = useCircuitStore((s) => s.netLabels);
```

**Render a net label** if the wire's net has a name. Inside the wire's `<group>`, find the midpoint of the wire path and render a `<Text>` label there:

After the tube mesh, add:
```tsx
{fromNetId != null && netLabels[fromNetId] && (
  <Text
    position={midpoint}  // compute midpoint from the curve
    fontSize={0.09}
    color="#ffffff"
    anchorX="center"
    anchorY="middle"
    fillOpacity={0.7}
    depthOffset={-2}
    renderOrder={3}
  >
    {netLabels[fromNetId]}
  </Text>
)}
```

To compute the midpoint: use the CatmullRomCurve3 that's already computed for the tube, get the point at t=0.5. This is already available since Wire.tsx builds a curve for the TubeGeometry.

---

## Important notes
- `netLabels` is `Record<number, string>` — keys are `netId` (numbers), not strings
- Net labels should survive save/load (included in JSON)
- Net labels don't need undo/redo (they're UI metadata, not circuit topology) — `set()` without temporal wrapping is fine. Actually, `netLabels` IS topology metadata so let temporal track it — just add it to the store state normally
- The `Text` component from `@react-three/drei` is already used in other canvas files

## Build validation
Run `pnpm build` to verify no type errors.
