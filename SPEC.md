# SPEC: P1.3 Component Tooltips + P1.4 Empty Inspector State + F4.3 Engineering Notation

## Context
Circuit Sandbox — React/Next.js/Tailwind. Run `pnpm build` to verify.

## Problems to Fix

### P1.3 — Component Tooltips
Hovering a part tile in the sidebar shows no information about what the
component does, its typical use, or keyboard shortcut. Beginners get confused.

### P1.4 — Empty Inspector State
When no component is selected, `PropertiesInspector` returns null. The sidebar
has a large empty space below the parts list. Add a helpful empty state.

### F4.3 — Engineering Notation in Inspector
Resistance values show raw numbers like `1000` instead of `1kΩ`.
Capacitance shows `0.000001 F` instead of `1µF`. These should use
engineering notation in the display.

## Files to Change

### `components/sidebar/ComponentTile.tsx`
Add a `tooltip?: string` prop. Render it as a `title` attribute on the button:
```tsx
<button ... title={tooltip ?? label}>
```
That gives us native browser tooltip on hover for free.

Also add the tooltip data to `Sidebar.tsx`'s PARTS array (see below).

### `components/sidebar/Sidebar.tsx`
In the `PARTS` array definition, add a `tooltip` field to each entry:
```typescript
const PARTS: { type: ComponentType | 'wire'; label: string; icon: React.ReactNode; tooltip: string }[] = [
  { type: 'battery',       label: 'Battery',        tooltip: 'DC voltage source (1.5–30V). Powers your circuit.', icon: <Battery /> },
  { type: 'wire',          label: 'Wire',            tooltip: 'Connect two pins. Click any pin to start.', icon: <WireIcon /> },
  { type: 'resistor',      label: 'Resistor',        tooltip: 'Limits current flow. Set resistance in Ω.', icon: <Rect fill="#c8a060" /> },
  { type: 'led',           label: 'LED',             tooltip: 'Light-Emitting Diode. Glows when current flows.', icon: <LED /> },
  { type: 'capacitor',     label: 'Capacitor',       tooltip: 'Stores charge. Blocks DC, passes AC.', icon: <Circle fill="#4488cc" /> },
  { type: 'bjt',           label: 'NPN Transistor',  tooltip: 'Bipolar transistor: amplifier or switch.', icon: <BJT /> },
  { type: 'timer555',      label: '555 Timer',       tooltip: 'Generates square waves. Set frequency via R1, R2, C.', icon: <Timer555 /> },
  { type: 'motor',         label: 'Motor',           tooltip: 'DC hobby motor. Spins when voltage is applied.', icon: <Motor /> },
  { type: 'tactileSwitch', label: 'Tactile Switch',  tooltip: 'Momentary push-button switch. Toggle in inspector.', icon: <Circle fill="#666" /> },
  { type: 'diode',         label: 'Diode',           tooltip: 'Allows current in one direction only (1N4148).', icon: <Diode /> },
  { type: 'mosfet',        label: 'MOSFET',          tooltip: 'Voltage-controlled switch. Gate controls drain-source.', icon: <MOSFET /> },
  { type: 'opamp',         label: 'Op-Amp',          tooltip: 'Operational amplifier. Amplifies voltage difference.', icon: <OpAmp /> },
  { type: 'inductor',      label: 'Inductor',        tooltip: 'Stores energy in magnetic field. Opposes current change.', icon: <Inductor /> },
  { type: 'potentiometer', label: 'Potentiometer',   tooltip: 'Variable resistor. Wiper position sets output voltage.', icon: <Potentiometer /> },
  { type: 'arduino',       label: 'Arduino Uno',     tooltip: 'ATmega328P microcontroller. Upload sketches to run code.', icon: <Arduino /> },
];
```
Pass `tooltip={p.tooltip}` to ComponentTile.

### `components/sidebar/PropertiesInspector.tsx`
Currently `PropertiesInspector()` returns null when nothing is selected.
Change it to return a subtle empty state instead:

```tsx
export default function PropertiesInspector() {
  const selectedId  = useCircuitStore((s) => s.selectedComponentId);
  const components  = useCircuitStore((s) => s.components);
  const hasAny = Object.keys(components).length > 0;  // re-read this from store

  if (!selectedId) {
    return (
      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="text-[10px] text-white/20 italic leading-relaxed">
          {hasAny
            ? 'Click a component to inspect its properties.'
            : 'Drag a part from the panel above onto the breadboard to get started.'}
        </p>
      </div>
    );
  }
  const component = components[selectedId];
  if (!component) return null;
  return <Inspector component={component} />;
}
```

For `hasAny`, use `useCircuitStore((s) => Object.keys(s.components).length > 0)`.

### Engineering notation helper (in `PropertiesInspector.tsx`)
Add a helper function `engNotation(value: number, unit: string): string` that formats:
- Megaunits: ≥1e6 → `1.0MΩ`
- Kilounits: ≥1e3 → `1.0kΩ`
- Milliunits: <1e-3 → `1.0mH`
- Microunits: <1e-6 but used for µF → `1.0µF`
- Nanounits: <1e-9 → `1.0nF`
- Otherwise: `1.0Ω`

Use this in `NumberInput` to display a read-only formatted value next to the
input field (not replacing the input, just a hint label below it):
```tsx
// Below the NumberInput, show formatted value hint for large/small numbers
{Math.abs(value) >= 1000 || (Math.abs(value) < 0.1 && value !== 0) ? (
  <span className="text-[9px] text-white/30 font-mono">{engNotation(value, field.unit ?? '')}</span>
) : null}
```

## Rules
- Do NOT change store logic, simulation, or layout structure
- Do NOT add new files (put engNotation helper inside PropertiesInspector.tsx)
- Run `pnpm build` and fix all TypeScript errors
