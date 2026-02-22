# SPEC: Polarity Labels on Diode + Capacitor Fix

Extends wave-4 polarity work. Two small additions:
1. `Diode.tsx` — missing +/− labels entirely
2. `Capacitor.tsx` — already has `+` only; add the `−` label too

## Read First
- `components/canvas/parts/Diode.tsx` — current diode (no polarity labels)
- `components/canvas/parts/Capacitor.tsx` — already has `+`, needs `−`
- `components/canvas/parts/LED.tsx` — reference for polarity label pattern
- `store/uiStore.ts` — `showPolarityLabels` boolean is already there

## Part 1: Diode.tsx polarity labels

The Diode has:
- Anode pin at `pinOffsets[0]` (default `[-0.254, 0, 0]`) — this is `+`
- Cathode pin at `pinOffsets[1]` (default `[0.254, 0, 0]`) — this is `−`

Add imports:
```tsx
import { Text } from '@react-three/drei';
import { useUIStore } from '@/store/uiStore';
```

In the component body:
```tsx
const showPolarityLabels = useUIStore((state) => state.showPolarityLabels);
const anodeX = pinOffsets[0] ? pinOffsets[0][0] : -0.254;
const cathodeX = pinOffsets[1] ? pinOffsets[1][0] : 0.254;
```

Inside the JSX `<group>`, before the pin legs:
```tsx
{showPolarityLabels && (
  <>
    <Text
      position={[anodeX, 0.12, pinOffsets[0] ? pinOffsets[0][2] : 0]}
      fontSize={0.08}
      color="#ff6b6b"
      anchorX="center"
      anchorY="middle"
      renderOrder={10}
    >
      +
    </Text>
    <Text
      position={[cathodeX, 0.12, pinOffsets[1] ? pinOffsets[1][2] : 0]}
      fontSize={0.08}
      color="#6b9fff"
      anchorX="center"
      anchorY="middle"
      renderOrder={10}
    >
      −
    </Text>
  </>
)}
```

## Part 2: Capacitor.tsx — add `−` label

Read `Capacitor.tsx`. It has `showPolarityLabels` and shows `+` on `positivePin` (pinOffsets[1]).
Add a `negativePin` variable and a `−` label:

```tsx
const negativePin = pinOffsets[0] ?? DEFAULT_PIN_OFFSETS[0];
```

Replace the existing `{showPolarityLabels && <Text...>+</Text>}` block with:
```tsx
{showPolarityLabels && (
  <>
    <Text
      position={[positivePin[0], 0.12, positivePin[2]]}
      fontSize={0.08}
      color="#ff6b6b"
      anchorX="center"
      anchorY="middle"
      renderOrder={10}
    >
      +
    </Text>
    <Text
      position={[negativePin[0], 0.12, negativePin[2]]}
      fontSize={0.08}
      color="#6b9fff"
      anchorX="center"
      anchorY="middle"
      renderOrder={10}
    >
      −
    </Text>
  </>
)}
```

## Important notes
- `Capacitor.tsx` already imports `Text` and `useUIStore` — don't add duplicates
- `Diode.tsx` does NOT have these imports — add them
- Follow LED.tsx exactly for consistency
- Colors: `#ff6b6b` for `+`, `#6b9fff` for `−`
- Do NOT touch uiStore.ts, Toolbar.tsx, or KeyboardShortcuts.tsx — showPolarityLabels already exists

Run `pnpm build` — must pass with zero errors.
