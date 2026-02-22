# SPEC: Component Descriptions in Parts Palette

Show a 1-line beginner-friendly description under each part name in the palette.
"What is this?" answered before the user even clicks.

## Read First
- `components/sidebar/ComponentTile.tsx` — add description display here
- `components/sidebar/Sidebar.tsx` — where ComponentTile is rendered, to wire the description prop

## Part 1: Create component descriptions constant

Create a new file `constants/partDescriptions.ts`:

```ts
import type { ComponentType } from '@/types/circuit';

export const PART_DESCRIPTIONS: Partial<Record<ComponentType | 'wire', string>> = {
  battery:       'Power source — supplies voltage',
  resistor:      'Limits current — protects other parts',
  led:           'Lights up when current flows through it',
  capacitor:     'Stores charge — used for timing & filters',
  diode:         'One-way valve — blocks reverse current',
  bjt:           'NPN transistor switch',
  pnp:           'PNP transistor switch',
  mosfet:        'Voltage-controlled switch',
  tactileSwitch: 'Push-button — closes circuit when pressed',
  potentiometer: 'Variable resistor — twist to change value',
  motor:         'DC motor — spins when powered',
  timer555:      '555 timer — generates repeating pulses',
  inductor:      'Coil — resists current changes',
  arduino:       'Microcontroller — runs your sketch',
  schottky:      'Fast diode — low forward voltage drop',
  zener:         'Voltage-clamp diode',
  opamp:         'Amplifies voltage differences',
  wire:          'Connects two pins',
};
```

## Part 2: Update ComponentTile

In `components/sidebar/ComponentTile.tsx`, add an optional `description` prop:

```tsx
interface Props {
  type: ComponentType | 'wire';
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  description?: string;   // ← new
  onAdd?: () => void;
}
```

Change the button's inner layout to support a stacked label + description:

Replace the current inner structure with:
```tsx
<div className="flex items-center gap-2.5 w-full min-w-0">
  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-sm">
    {icon}
  </span>
  <div className="flex flex-col min-w-0 flex-1">
    <span className="leading-none text-[13px] text-[#c8c8d0] group-hover:text-white">{label}</span>
    {description && (
      <span className="text-[10px] text-white/28 leading-tight truncate mt-0.5">{description}</span>
    )}
  </div>
</div>
```

Add `group` to the button's className so the label hover works:
```tsx
className={`group flex items-center w-full px-3 py-2 rounded-md text-left
             transition-colors duration-100
             cursor-grab active:cursor-grabbing
             hover:bg-white/[0.08] active:bg-white/[0.12]
             focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none
             ${isHighlighted ? 'ring-1 ring-[#7c6fff]/70 animate-pulse' : ''}`}
```

Note: remove `gap-2.5` from the button className since the inner div now handles it.

## Part 3: Pass description from Sidebar.tsx

In `components/sidebar/Sidebar.tsx`, import `PART_DESCRIPTIONS`:
```tsx
import { PART_DESCRIPTIONS } from '@/constants/partDescriptions';
```

For every `<ComponentTile>` rendering, add:
```tsx
description={PART_DESCRIPTIONS[componentType]}
```

Read `Sidebar.tsx` fully to find all ComponentTile usages and add the prop to each.

## Important notes
- Keep descriptions short (≤5 words) — they truncate on one line
- TypeScript: `PART_DESCRIPTIONS[x]` returns `string | undefined` → compatible with `description?: string`
- Do NOT change the tile height significantly — descriptions are `text-[10px]` and very compact
- Do NOT modify `uiStore.ts`, `Toolbar.tsx`, or any canvas files — this is sidebar-only

Run `pnpm build` — must pass with zero errors.
