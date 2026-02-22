# Codex Agent Spec: Schematic Polish + PropertiesInspector Completeness

Read ALL relevant files before writing code. Run `npx tsc --noEmit` after every file.

## Files to Read First

- `features/schematic/SchematicView.tsx`
- `features/schematic/symbols/index.tsx`
- `features/schematic/SchematicLayout.ts`
- `components/sidebar/PropertiesInspector.tsx`
- `features/examples/circuits.ts`
- `features/examples/ExampleLoader.tsx`
- `types/circuit.ts`
- `constants/breadboard.ts`

---

## Fix 1 — Missing schematic symbols (555, motor, arduino, switch)

### `features/schematic/symbols/index.tsx`

Read the existing file to see how symbols are defined (SVG elements, pin positions). Then add symbols for the missing types. Follow the exact same pattern as existing symbols.

**Timer555 symbol** — DIP-8 IC box with labeled pins:
```tsx
export function Timer555Symbol({ x, y, w, h, selected }: SymbolProps) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={h} rx={3} fill={selected ? '#1a1a2e' : '#111'} stroke={selected ? '#6cf' : '#555'} strokeWidth={1.5} />
      <text x={w/2} y={h/2 + 4} textAnchor="middle" fill="#aaa" fontSize={11} fontFamily="monospace">555</text>
      {/* Pin labels */}
      <text x={4} y={16} fill="#666" fontSize={8} fontFamily="monospace">GND</text>
      <text x={4} y={h-4} fill="#666" fontSize={8} fontFamily="monospace">OUT</text>
      <text x={w-4} y={16} textAnchor="end" fill="#666" fontSize={8} fontFamily="monospace">VCC</text>
    </g>
  );
}
```

**Motor symbol** — circle with M:
```tsx
export function MotorSymbol({ x, y, w, h, selected }: SymbolProps) {
  const cx = x + w/2, cy = y + h/2, r = Math.min(w, h)/2 - 4;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={selected ? '#6cf' : '#555'} strokeWidth={1.5} />
      <text x={cx} y={cy+4} textAnchor="middle" fill="#aaa" fontSize={14} fontFamily="monospace">M</text>
      {/* Terminal lines */}
      <line x1={cx-r} y1={cy} x2={x} y2={cy} stroke="#555" strokeWidth={1.5} />
      <line x1={cx+r} y1={cy} x2={x+w} y2={cy} stroke="#555" strokeWidth={1.5} />
    </g>
  );
}
```

**Arduino symbol** — rectangle with UNO label and pin count indicator:
```tsx
export function ArduinoSymbol({ x, y, w, h, selected }: SymbolProps) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={selected ? '#003333' : '#001a1a'} stroke={selected ? '#6cf' : '#00979c'} strokeWidth={1.5} />
      <text x={x+w/2} y={y+h/2-4} textAnchor="middle" fill="#00979c" fontSize={10} fontFamily="monospace" fontWeight="bold">ARDUINO</text>
      <text x={x+w/2} y={y+h/2+8} textAnchor="middle" fill="#006666" fontSize={8} fontFamily="monospace">UNO</text>
    </g>
  );
}
```

**TactileSwitch symbol** — two lines with a gap and a crossbar:
```tsx
export function TactileSwitchSymbol({ x, y, w, h, selected }: SymbolProps) {
  const mid = y + h/2;
  const stroke = selected ? '#6cf' : '#555';
  return (
    <g>
      <line x1={x} y1={mid} x2={x+w*0.35} y2={mid} stroke={stroke} strokeWidth={1.5} />
      <line x1={x+w*0.65} y1={mid} x2={x+w} y2={mid} stroke={stroke} strokeWidth={1.5} />
      {/* switch contacts */}
      <line x1={x+w*0.35} y1={mid-6} x2={x+w*0.35} y2={mid+6} stroke={stroke} strokeWidth={1.5} />
      <line x1={x+w*0.35} y1={mid-8} x2={x+w*0.65} y2={mid-8} stroke={stroke} strokeWidth={1.5} strokeDasharray="2,2" />
      <line x1={x+w*0.65} y1={mid-6} x2={x+w*0.65} y2={mid+6} stroke={stroke} strokeWidth={1.5} />
    </g>
  );
}
```

### `features/schematic/SchematicView.tsx`

Find `symbolForTypeName()` or the equivalent switch/map. Add the missing types:

```typescript
case 'timer555':     return <Timer555Symbol {...props} />;
case 'motor':        return <MotorSymbol {...props} />;
case 'arduino':      return <ArduinoSymbol {...props} />;
case 'tactileSwitch': return <TactileSwitchSymbol {...props} />;
```

---

## Fix 2 — PropertiesInspector: complete all missing component types

### `components/sidebar/PropertiesInspector.tsx`

Read the file fully. `PROP_DEFS` is missing entries for `timer555`, `arduino`, `motor`, `tactileSwitch`.

Add them (follow the same PropField pattern as existing entries):

```typescript
timer555: [
  { key: 'r1',          label: 'R1 (timing)',   type: 'number', default: 1000,  min: 100,    max: 1e6,  step: 100,  unit: 'Ω' },
  { key: 'r2',          label: 'R2 (timing)',   type: 'number', default: 1000,  min: 100,    max: 1e6,  step: 100,  unit: 'Ω' },
  { key: 'capacitance', label: 'Capacitance',   type: 'number', default: 1e-6,  min: 1e-9,   max: 1e-3, step: 1e-7, unit: 'F' },
],
motor: [
  { key: 'rpm',         label: 'Target RPM',    type: 'number', default: 1000,  min: 0,      max: 10000, step: 100, unit: 'rpm' },
  { key: 'resistance',  label: 'Winding R',     type: 'number', default: 10,    min: 1,      max: 1000,  step: 1,   unit: 'Ω'   },
],
tactileSwitch: [
  { key: 'closed',      label: 'State',         type: 'number', default: 0,     min: 0,      max: 1,    step: 1,    unit: ''   },
],
arduino: [
  { key: 'clockMhz',   label: 'Clock speed',    type: 'number', default: 16,    min: 1,      max: 20,   step: 1,    unit: 'MHz' },
],
```

---

## Fix 3 — Example circuits: parameterize node IDs by column offset

### `features/examples/circuits.ts`

Read the file. Example circuits hardcode node IDs like `bb-a20`. If `COLS` changes, they break.

Refactor to generate node IDs from relative positions:

```typescript
// Helper: get node ID for main grid
function bbNode(row: 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j', col: number): string {
  return `bb-${row}${col}`;
}
function railNode(rail: 'tp'|'tn'|'bp'|'bn', n: number): string {
  return `bb-${rail}-${n}`;
}

// Use center column (32) as anchor, offset from there
const CENTER_COL = 32;
```

Then replace hardcoded node IDs with `bbNode('a', CENTER_COL + offset)` etc.

This makes examples work regardless of board size changes. Keep the same circuit topology, just parameterize the column numbers.

---

## Fix 4 — SchematicLayout: cache layout results

### `features/schematic/SchematicLayout.ts`

Add a simple cache: store the last `{ componentIds, wireIds }` hash and the corresponding layout result. If the circuit topology hasn't changed, return the cached layout instead of re-running elkjs.

```typescript
let layoutCache: {
  key: string;
  result: Record<string, SchematicPos>;
} | null = null;

function topologyKey(components: Record<string, PlacedComponent>, wires: Record<string, Wire>): string {
  const cIds = Object.keys(components).sort().join(',');
  const wIds = Object.keys(wires).sort().join(',');
  return `${cIds}|${wIds}`;
}

export async function layoutSchematic(...): Promise<Record<string, SchematicPos>> {
  const key = topologyKey(components, wires);
  if (layoutCache?.key === key) return layoutCache.result;

  // ... existing layout logic ...

  layoutCache = { key, result };
  return result;
}
```

---

## Verification

```bash
npx tsc --noEmit
pnpm build
```

Manual:
- Open schematic view with a 555 timer placed → shows 555 symbol (not gray box)
- Open schematic view with motor → shows M circle
- Select motor → PropertiesInspector shows RPM and winding resistance
- Select 555 → shows R1, R2, capacitance
- Load example circuits → they load correctly (nodes exist on board)
- Toggle schematic on same circuit twice → second open is instant (cached)
