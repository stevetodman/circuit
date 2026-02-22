# SPEC: P1.5 Example Gallery Redesign + More Examples

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.
Key files:
- `features/examples/circuits.ts` — example circuit definitions
- `features/examples/ExampleLoader.tsx` — renders the load UI in sidebar

## Problems to Fix
The current example loader is a plain `<select>` dropdown with 3 examples.
It's unclear what each circuit does without selecting it first.
We need a more beginner-friendly gallery feel with cards.

## Changes

### `features/examples/circuits.ts`
Add 3 more example circuits to `EXAMPLE_CIRCUITS` (keep the existing 3 first):

**4. RC Filter** — battery + resistor + capacitor
- 1kΩ resistor in series, 10µF capacitor to ground
- description: 'RC low-pass filter. Capacitor charges/discharges through resistor.'

**5. NPN Switch** — battery + resistor + NPN transistor + LED
- Battery → base resistor (10kΩ) → BJT base, collector → LED → battery
- description: 'NPN transistor used as a switch to drive an LED.'

**6. 555 Blinker** — battery + 555 timer + LED + resistors
- 555 in astable mode: R1=1kΩ, R2=10kΩ, C=10µF → LED on output
- description: '555 timer in astable mode. LED blinks at ~1Hz.'

For each new circuit, use the existing helper functions `bbNode`, `railNode`,
`topNodePos`, `midpoint` from the same file. Choose column positions that
don't conflict with existing examples (use cols 10-40 range, rows 0-1 typically).
Place components at midpoints between breadboard nodes, just like the existing examples.

Keep it simple — the simulation will handle the rest. The circuits just need
valid node connections that form a complete loop.

### `features/examples/ExampleLoader.tsx`
Replace the `<select>` with an expandable button + card grid.

**New UX:**
1. A "Load Example" button with a chevron that toggles an expanded card grid
2. When expanded, show each circuit as a small card:
   - Circuit name (bold, 12px)
   - Description (10px, muted)
   - Tiny color swatch or icon based on circuit type (optional, skip if complex)
3. Clicking a card:
   - If board is empty → load immediately
   - If board has content → show inline confirm (amber warning, same as p0-drag-guard spec)
4. After loading → collapse the gallery

**Implementation:**
```tsx
const [expanded, setExpanded] = useState(false);
const [pendingCircuit, setPendingCircuit] = useState<ExampleCircuit | null>(null);

// When a card is clicked:
function handleSelect(circuit: ExampleCircuit) {
  const hasContent = Object.keys(components).length > 0 || Object.keys(wires).length > 0;
  if (hasContent) {
    setPendingCircuit(circuit);
  } else {
    doLoad(circuit);
  }
}

function doLoad(circuit: ExampleCircuit) {
  // Clear scope channels (same as existing logic)
  for (const ch of scopeChannels) { clearChannel(ch.netId); removeScopeChannel(ch.netId); }
  loadExample(circuit);
  setExpanded(false);
  setPendingCircuit(null);
}
```

**Card styles:**
```
rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07]
hover:border-white/[0.14] cursor-pointer transition-colors p-2.5
```

**Confirm banner** (same pattern as p0-drag-guard):
```
mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300
```

**Expand toggle button:**
```
w-full flex items-center justify-between px-3 py-2 rounded-md
text-[12px] text-white/50 hover:text-white/70 hover:bg-white/[0.05]
transition-colors font-medium
```

**Autoload query param** — keep the existing `?autoload=N` behavior.
The `useEffect` checks for `params.get('autoload')` — keep this unchanged.

## Rules
- Do NOT use window.confirm
- Do NOT change any store logic
- The `?autoload=N` useEffect must still work
- Run `pnpm build` and fix all TypeScript errors
