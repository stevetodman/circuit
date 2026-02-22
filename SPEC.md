# SPEC: Polarity Labels on Component Pins

Show floating + and − labels above battery, LED, capacitor, and diode pins in the 3D view.
This is a top beginner pain point — they can't tell which end is which.

## Read First
- `components/canvas/parts/LED.tsx` — see how a part component is structured
- `components/canvas/parts/Battery.tsx` — another example
- `components/canvas/parts/ComponentRenderer.tsx` — see how parts receive anchorPos
- The Three.js/R3F layer. All canvas code is SSR-disabled.
- `store/uiStore.ts` — check if showDesignators exists (similar toggle pattern)

## Implementation

Add polarity labels using `@react-three/drei`'s `<Text>` component (already used in Wire.tsx for current labels).

### Where to add

In `components/canvas/parts/LED.tsx`:
- Add a "+" label above the anode pin (pos side)
- Add a "−" label above the cathode pin (neg side)
- Position: slightly above the pin, y=0.12, at the pin's x/z offset

In `components/canvas/parts/Battery.tsx`:
- Add "+" above the positive terminal
- Add "−" above the negative terminal

In `components/canvas/parts/Resistor.tsx` or a new `Capacitor.tsx`:
- For capacitor (polarized): add "+" on one side if it exists

### Label style
```tsx
<Text
  position={[xOffset, 0.12, zOffset]}
  fontSize={0.08}
  color={isPositive ? '#ff6b6b' : '#6b9fff'}
  anchorX="center"
  anchorY="middle"
  renderOrder={10}
>
  {isPositive ? '+' : '−'}
</Text>
```

Use red (#ff6b6b) for + and blue (#6b9fff) for −.

### Toggle

Add a `showPolarityLabels` boolean to `uiStore.ts` (default: `true`).
Add a setter `setShowPolarityLabels`.

Add a "P Polarity" toggle button to `components/Toolbar.tsx`, similar to the existing "L Labels" and "I Current" buttons. Key: `P`.

Add `P` key handler in `components/KeyboardShortcuts.tsx`.

Wrap the Text labels in `{showPolarityLabels && <Text.../>}` in each part component.

### Important notes
- `Text` from `@react-three/drei` is already used in the project — import from there
- The `anchorPos` for parts is always [0,0,0] in local space (ComponentRenderer handles world position)
- Pin offsets: check the PART_DEFS or pin definitions in each component file to get the right offsets
- Only LED, Battery (and optionally Capacitor/Diode) need labels — don't add to resistors

Run `pnpm build` — must pass with zero errors.
