# SPEC: 78xx Voltage Regulator Component (p10.a)

## Goal
Add a 78xx-series linear voltage regulator as a new component type called `voltageRegulator`.
Three pins: IN, GND, OUT. Simulated as an ideal voltage source (OUT-GND = selected voltage).
Variants: 7805 (5V), 7809 (9V), 7812 (12V).

## Acceptance Criteria
1. New `'voltageRegulator'` ComponentType
2. 3 pins: `in` (left), `gnd` (bottom), `out` (right)
3. Props: `voltage?: number` (default 5)
4. Simulated as `vsource` between `out` net and `gnd` net
5. 3D model: rectangular IC body, "78xx" label
6. Appears in sidebar under 'ic' category, label "Volt Reg"
7. PropertiesInspector shows voltage dropdown: 5V (7805), 9V (7809), 12V (7812)
8. `pnpm build` passes with zero type errors

## Implementation

### 1. `types/circuit.ts`

Add to `ComponentType` union (add `| 'voltageRegulator'` after `'opamp'`):
```ts
| 'voltageRegulator'
```

Add props interface near other props interfaces:
```ts
export interface VoltageRegulatorProps {
  voltage?: number; // default 5
}
```

Add to `PlacedComponent` union at the end of the union:
```ts
| (BasePlacedComponent & TypedComponent<'voltageRegulator', VoltageRegulatorProps>)
```

Add to `PIN_TEMPLATES` (PITCH is already imported at the top of the file):
```ts
voltageRegulator: [
  { name: 'in',  offset: [-PITCH, 0, 0] as Vec3 },
  { name: 'gnd', offset: [0, 0, PITCH] as Vec3 },
  { name: 'out', offset: [PITCH, 0, 0] as Vec3 },
],
```

### 2. `simulation/mna/NetlistBuilder.ts`

Add a case after the `'opamp'` case (before `'inductor'`):
```ts
case 'voltageRegulator': {
  const netGnd = pinNet(comp, 'gnd');
  const netOut = pinNet(comp, 'out');
  const netIn  = pinNet(comp, 'in');
  if (netOut == null || netGnd == null) break;
  const V = (props as { voltage?: number }).voltage ?? 5;
  const element: NetlistElement = { id: comp.id, kind: 'vsource', netA: netOut, netB: netGnd, value: V };
  elements.push(element);
  branchElements.push(element);
  if (netIn != null && netIn !== netGnd) {
    elements.push({ id: comp.id + '_in', kind: 'resistor', netA: netIn, netB: netGnd, value: 10 });
  }
  break;
}
```

### 3. `components/canvas/parts/VoltageRegulator.tsx` (NEW FILE)

```tsx
'use client';
import * as THREE from 'three';
import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { PITCH } from '@/constants/breadboard';
import type { Vec3 } from '@/types/circuit';

interface Props {
  anchorPos: Vec3;
  transparent?: boolean;
  componentProps: { voltage?: number };
}

export default function VoltageRegulator({ anchorPos, transparent, componentProps }: Props) {
  const voltage = componentProps.voltage ?? 5;
  const opacity = transparent ? 0.45 : 1;
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.8, transparent, opacity }),
    [transparent, opacity]
  );
  const pinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.2, transparent, opacity }),
    [transparent, opacity]
  );
  const [ax, ay, az] = anchorPos;
  const label = `78${String(voltage).padStart(2, '0')}`;

  return (
    <group position={[ax, ay, az]}>
      {/* Body */}
      <mesh material={bodyMat} position={[0, PITCH * 0.5, 0]}>
        <boxGeometry args={[PITCH * 2.2, PITCH * 1.8, PITCH * 0.9]} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, PITCH * 0.5, PITCH * 0.46]}
        fontSize={PITCH * 0.42}
        color="#00ccff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {/* Pins: in (left), gnd (bottom-center), out (right) */}
      {([[-PITCH, 0, 0], [0, 0, PITCH], [PITCH, 0, 0]] as Vec3[]).map(([px, py, pz], i) => (
        <mesh key={i} material={pinMat} position={[px, py + PITCH * 0.15, pz]}>
          <cylinderGeometry args={[0.025, 0.025, PITCH * 0.4, 6]} />
        </mesh>
      ))}
    </group>
  );
}
```

### 4. `components/canvas/parts/ComponentRenderer.tsx`

Import at top:
```tsx
import VoltageRegulator from './VoltageRegulator';
```

In the `PRIMARY_VALUE_KEY` object, add:
```ts
voltageRegulator: 'voltage',
```

In the render switch/if-else that dispatches to part components, add a case for `'voltageRegulator'`:
```tsx
case 'voltageRegulator':
  return (
    <VoltageRegulator
      anchorPos={localAnchor}
      transparent={transparent}
      componentProps={componentProps as { voltage?: number }}
    />
  );
```

### 5. `components/sidebar/Sidebar.tsx`

In the `PARTS` array, add near `timer555` and `arduino`:
```tsx
{ type: 'voltageRegulator', label: 'Volt Reg', tooltip: '78xx linear regulator. Outputs fixed 5V, 9V, or 12V from higher input.', icon: <Rect fill="#1a1a2e" /> },
```

In `PART_CATEGORIES`, add:
```ts
voltageRegulator: 'ic',
```

### 6. `constants/partDescriptions.ts`

Add to `PART_DESCRIPTIONS`:
```ts
voltageRegulator: '78xx linear regulator — outputs fixed voltage',
```

### 7. `components/sidebar/PropertiesInspector.tsx`

Find where the component-specific property fields are rendered (where it checks `comp.type === 'battery'` or similar). Add a block for voltageRegulator showing a voltage selector dropdown.

Look for a `PropertyRow` pattern used for other components and add:
```tsx
{comp.type === 'voltageRegulator' && (
  <div className="flex items-center gap-2 mb-1">
    <label className="text-[10px] text-white/40 w-20 shrink-0">Output</label>
    <select
      value={String((comp.props as { voltage?: number }).voltage ?? 5)}
      onChange={(e) => setProperty(comp.id, 'voltage', Number(e.target.value))}
      className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
    >
      <option value="5">5 V (7805)</option>
      <option value="9">9 V (7809)</option>
      <option value="12">12 V (7812)</option>
    </select>
  </div>
)}
```

### 8. `features/schematic/symbols/index.tsx`

Add to the symbols map for `voltageRegulator`:
```tsx
voltageRegulator: ({ x, y, w, h }: SymbolProps) => (
  <g transform={`translate(${x},${y})`}>
    <rect x={4} y={4} width={w - 8} height={h - 8} fill="none" stroke="currentColor" strokeWidth={1.5} rx={2} />
    <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize={8} fill="currentColor" fontFamily="monospace">78xx</text>
    <line x1={0} y1={h / 2} x2={4} y2={h / 2} stroke="currentColor" strokeWidth={1.5} />
    <line x1={w - 4} y1={h / 2} x2={w} y2={h / 2} stroke="currentColor" strokeWidth={1.5} />
    <line x1={w / 2} y1={h - 4} x2={w / 2} y2={h} stroke="currentColor" strokeWidth={1.5} />
  </g>
),
```

Add to `SYMBOL_SIZES`:
```ts
voltageRegulator: { w: 48, h: 36 },
```

### 9. `features/schematic/SchematicLayout.ts`

Add to `COMPONENT_SIZES`:
```ts
voltageRegulator: { w: 48, h: 36 },
```

### 10. `features/export/exportBOM.ts`

In `formatValue` switch, add:
```ts
case 'voltageRegulator': return `${Number(p.voltage ?? 5)}V`;
```

In `TYPE_LABELS`, add:
```ts
voltageRegulator: 'Volt. Regulator',
```

### 11. `features/export/exportNetlist.ts`

Add a case for voltageRegulator (stamp as SPICE voltage source):
Find the switch/if-else that generates SPICE netlist lines and add:
```ts
case 'voltageRegulator': {
  const netOut = getNet(comp, 'out');
  const netGnd = getNet(comp, 'gnd');
  const V = (comp.props as { voltage?: number }).voltage ?? 5;
  if (netOut != null && netGnd != null) {
    lines.push(`V${designator} ${netOut} ${netGnd} DC ${V}`);
  }
  break;
}
```

### 12. `components/FindReplace.tsx`

Add to `TYPE_LABELS`:
```ts
voltageRegulator: 'Volt Reg',
```

Add to `PRIMARY_VALUE_KEY`:
```ts
voltageRegulator: 'voltage',
```

## Type Safety Notes
- `PlacedComponent` is a discriminated union — cast with `as PlacedComponent` when constructing one with generic spread
- `netB: netGnd` — ensure netGnd is not null before using (check above)
- All `ComponentType` exhaustive switches need a `voltageRegulator` case or a default

## Verify
Run `pnpm build` — must pass with zero type errors.
