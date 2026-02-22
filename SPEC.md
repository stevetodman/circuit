# SPEC: Overload / Smoke Detection

## Goal
Detect when components are operating beyond safe limits and warn the user visually.
This is a beginner-safety feature — makes the simulator feel realistic.
Run `pnpm build` to verify — must pass with zero errors.

---

## Thresholds

| Component | Condition | Threshold |
|-----------|-----------|-----------|
| Resistor  | Power dissipation | > 0.25 W (¼W standard) |
| LED       | Forward current | > 30 mA |
| Diode     | Forward current | > 1 A |
| Wire      | Current | > 2 A |

---

## Implementation

### 1. Detection in analog.worker.ts

After each MNA solve (both DC and transient), compute per-component power/current and
check thresholds. Post a message to main thread if any component is over limit.

**Message format:**
```typescript
{ type: 'OVERLOAD', violations: Array<{ id: string, kind: string, value: number, limit: number }> }
```

In `simulation/workers/analog.worker.ts`:
- After `solver.solveDC(netlist, ...)` returns voltages/currents:
  - For each resistor: `P = V^2 / R` or `P = I^2 * R`. If P > 0.25, add to violations.
  - For each LED/diode: read branch current from solution. If I > 0.03 (LED) or I > 1.0 (diode), add violation.
  - For wires: read branch currents from SAB `branchCurrents[]`. If |I| > 2.0, add violation.
- Throttle: only post OVERLOAD message at most once per second (use a timestamp).
- Post `{ type: 'OVERLOAD', violations }` to main thread. If violations is empty, post `{ type: 'OVERLOAD_CLEAR' }`.

### 2. SimController.tsx — receive and store

In `components/SimController.tsx`:
- Add handler for `'OVERLOAD'` message from analog worker:
  ```typescript
  case 'OVERLOAD':
    useUIStore.getState().setOverloadIds(data.violations.map(v => v.id));
    if (data.violations.length > 0) {
      const worst = data.violations[0];
      toastStore.getState().showToast(
        `Overload: ${worst.kind} drawing ${worst.value.toFixed(0)}mA (limit ${worst.limit*1000}mA)`,
        'warn'
      );
    }
    break;
  case 'OVERLOAD_CLEAR':
    useUIStore.getState().setOverloadIds([]);
    break;
  ```

### 3. uiStore.ts — store overloaded component IDs

In `store/uiStore.ts`:
- Add `overloadIds: string[]` field (default: `[]`)
- Add `setOverloadIds(ids: string[]) => void` action

### 4. Visual feedback in 3D scene

In `components/canvas/parts/ComponentRenderer.tsx` (or each individual part):
- Read `overloadIds` from uiStore
- If this component's ID is in overloadIds, apply a red emissive glow or red tint
- Use a pulsing animation (sin wave on emissiveIntensity) to indicate danger

Simplest implementation: in `ComponentRenderer.tsx`, wrap children with a `<group>`:
```tsx
const overloadIds = useUIStore(s => s.overloadIds);
const isOverloaded = overloadIds.includes(componentId);
// pass isOverloaded down as prop to child parts, or use context
```

For each part (Resistor.tsx, LED.tsx, etc.): accept optional `overloaded?: boolean` prop.
When overloaded, set mesh material emissive to red (#ff2200) with pulsing intensity.

If it's complex to thread props, a simpler approach:
- In ComponentRenderer.tsx, when overloaded, render an additional `<mesh>` around the component
  as a red glowing indicator (small sphere or ring at the component center).

### 5. Toast message

The toast already exists in the project (`store/toastStore.ts`, `components/Toast.tsx`).
Use `toastStore.getState().showToast(message, 'warn')` — do NOT create new notification system.

---

## Implementation Notes

- Throttle OVERLOAD messages to avoid flooding — post at most once per second
- Clear overload state when no violations (post OVERLOAD_CLEAR)
- Toast should show the most severe violation only
- Visual red glow is the priority — even a simple color change is fine
- Do NOT break any existing build — run `pnpm build` and fix TypeScript errors
- Do NOT add new npm dependencies
