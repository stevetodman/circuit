# SPEC: Value Presets for Capacitor, Battery, Inductor

Add E-series preset chips below the capacitance, voltage, and inductance number inputs in PropertiesInspector — matching the existing E12 resistor pattern.

## Read First
- `components/sidebar/PropertiesInspector.tsx` — look for `E12_VALUES` constant and how it renders chips below the resistance input. Mirror exactly that pattern for the three new component types.

## Part 1: Add preset constants (near E12_VALUES)

Add three new constant arrays after the `E12_VALUES` line:
```tsx
const CAP_PRESETS    = [0.1, 1, 10, 100, 470, 1000]; // µF
const BATTERY_PRESETS = [1.5, 3, 5, 9, 12];           // V
const INDUCTOR_PRESETS = [1e-3, 10e-3, 100e-3];       // H (1mH, 10mH, 100mH)
```

## Part 2: Render capacitor presets

Find the section where `component.type === 'resistor' && field.key === 'resistance'` renders E12 chips. Immediately after (as a parallel sibling condition within the same `<>...</>` block), add capacitor presets:

```tsx
{component.type === 'capacitor' && field.key === 'capacitance' && (
  <div className="flex flex-wrap gap-1 mt-1">
    {CAP_PRESETS.map((value) => (
      <button
        key={value}
        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
        onClick={() => setProperty(component.id, 'capacitance', value)}
      >
        {value < 1 ? `${Math.round(value * 1000)}nF` : value >= 1000 ? `${value / 1000}mF` : `${value}µF`}
      </button>
    ))}
  </div>
)}
```

Label formatting:
- 0.1µF → `100nF`
- 1µF → `1µF`, 10µF → `10µF`, 100µF → `100µF`, 470µF → `470µF`
- 1000µF → `1mF`

## Part 3: Render battery presets

```tsx
{component.type === 'battery' && field.key === 'voltage' && (
  <div className="flex flex-wrap gap-1 mt-1">
    {BATTERY_PRESETS.map((value) => (
      <button
        key={value}
        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
        onClick={() => setProperty(component.id, 'voltage', value)}
      >
        {value}V
      </button>
    ))}
  </div>
)}
```

## Part 4: Render inductor presets

```tsx
{component.type === 'inductor' && field.key === 'inductance' && (
  <div className="flex flex-wrap gap-1 mt-1">
    {INDUCTOR_PRESETS.map((value) => (
      <button
        key={value}
        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
        onClick={() => setProperty(component.id, 'inductance', value)}
      >
        {value < 0.01 ? `${Math.round(value * 1000)}mH` : `${Math.round(value * 1000)}mH`}
      </button>
    ))}
  </div>
)}
```

Renders: `1mH`, `10mH`, `100mH`.

## Important
- File: `components/sidebar/PropertiesInspector.tsx` only — no other files needed
- All three preset blocks live inside the existing `field.kind === 'number'` branch, after the resistor E12 chips block
- The presets are additive — existing `engNotation` readout stays as-is
- Run `pnpm build` — must pass with zero TypeScript errors
