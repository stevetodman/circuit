# SPEC: Component Value Labels in 3D View

Show the component's value (e.g. "220Ω", "100µF", "9V") as floating text
in the 3D view, just below the designator label (R1, C2…).
This makes the breadboard readable without having to click each component.

## Read First
- `components/canvas/parts/ComponentRenderer.tsx` — find the `showDesignators`
  block that renders the `<Text>` designator (around line 290). The value label
  goes in the same place, just below it.
- `store/uiStore.ts` — `showDesignators` boolean is already there.
  Add `showValueLabels: boolean` and `toggleValueLabels: () => void`.
- `components/Toolbar.tsx` — add a "Ω Values" toggle button (key: `V` is taken
  by wire voltage colours, use `W` for values).
- `components/KeyboardShortcuts.tsx` — bind `W` key.
- `components/HelpOverlay.tsx` — add `W` to the View shortcuts section.

## Part 1: uiStore.ts — showValueLabels

Add to the interface and initial state:
```ts
showValueLabels: boolean;
toggleValueLabels: () => void;
```
Initial: `showValueLabels: true` (on by default — very useful info).
Action: `toggleValueLabels: () => set((s) => ({ showValueLabels: !s.showValueLabels }))`.

## Part 2: ComponentRenderer.tsx — value Text label

Read the file carefully. Find where the `{showDesignators && ... <Text>...</Text>}` block is.
The `component` object (PlacedComponent) has a `props` field with the value, and `type` for
what kind of component it is.

Add a value label immediately after the designator Text:
```tsx
const showValueLabels = useUIStore((state) => state.showValueLabels);

{showValueLabels && !dragging && (
  <Text
    position={[0, 0.13, 0]}
    fontSize={0.065}
    color="#ffffff"
    fillOpacity={0.40}
    anchorX="center"
    anchorY="middle"
  >
    {formatComponentValue(component)}
  </Text>
)}
```

The position `[0, 0.13, 0]` is just below the designator at `[0, 0.22, 0]`.
Reduce if they overlap — 0.13 should clear the designator's 0.08 fontSize.

### formatComponentValue helper

Define this function near the top of `ComponentRenderer.tsx`:

```tsx
function formatComponentValue(comp: PlacedComponent): string {
  const p = comp.props as Record<string, unknown>;
  switch (comp.type) {
    case 'resistor': {
      const r = Number(p.resistance ?? 220);
      if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(1)}MΩ`;
      if (r >= 1_000) return `${(r / 1_000).toFixed(r % 1000 === 0 ? 0 : 1)}kΩ`;
      return `${r}Ω`;
    }
    case 'capacitor': {
      const c = Number(p.capacitance ?? 0.0001);
      if (c >= 0.001) return `${(c * 1000).toFixed(0)}mF`;
      if (c >= 1e-6)  return `${(c * 1e6).toFixed(0)}µF`;
      return `${(c * 1e9).toFixed(0)}nF`;
    }
    case 'battery': {
      const v = Number(p.voltage ?? 9);
      return `${v}V`;
    }
    case 'inductor': {
      const l = Number(p.inductance ?? 0.001);
      if (l >= 1)     return `${l.toFixed(1)}H`;
      if (l >= 0.001) return `${(l * 1000).toFixed(0)}mH`;
      return `${(l * 1e6).toFixed(0)}µH`;
    }
    case 'led': return (p.color as string | undefined)?.replace(/^#/, '') ? '' : '';
    default: return '';
  }
}
```

Return `''` for components where a value label adds no info (LED, BJT, switch, etc.).
The `<Text>` won't render if the string is empty — but wrap in `{label && <Text>}` to be safe.

## Part 3: Toolbar.tsx — W toggle button

Read the Toolbar to find the existing button pattern (L, I, P, V toggles).
Add a `W` button for value labels, same style:
```tsx
const showValueLabels = useUIStore((s) => s.showValueLabels);
const toggleValueLabels = useUIStore((s) => s.toggleValueLabels);

<ToolbarButton
  onClick={toggleValueLabels}
  active={showValueLabels}
  title="Values (W)"
  label="Ω"
/>
```

Or use the exact button JSX pattern from the existing buttons.

## Part 4: KeyboardShortcuts.tsx — W key

Find the section with single-key handlers. Add:
```tsx
if (key === 'w') {
  useUIStore.getState().toggleValueLabels();
  return;
}
```

## Part 5: HelpOverlay.tsx — W shortcut

In the View section rows, add:
```
['W', 'Toggle component value labels (Ω, µF, V)'],
```

## Zustand selector rule (CRITICAL)
Individual selectors only:
```tsx
const showValueLabels = useUIStore((s) => s.showValueLabels);  // CORRECT
const { showValueLabels } = useUIStore(s => ({ ... }));         // WRONG
```

## Important
- Files: `store/uiStore.ts`, `components/canvas/parts/ComponentRenderer.tsx`,
  `components/Toolbar.tsx`, `components/KeyboardShortcuts.tsx`,
  `components/HelpOverlay.tsx`
- Import `PlacedComponent` type if not already imported in ComponentRenderer
- The label uses `fillOpacity={0.40}` so it's subtle — visible but not cluttered
- Run `pnpm build` — must pass with zero TypeScript errors
