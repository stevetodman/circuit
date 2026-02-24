# SPEC: Swap Component Type (p8.a)

## Goal
Let users change a placed component's type in-place via right-click → "Swap type".
Keeps position, rotation, and any shared props. Then opens inline value editor.

## Acceptance Criteria
1. Right-click any component → context menu has "Swap type" item (between Duplicate and Properties)
2. Clicking "Swap type" opens a compact type-picker panel at the same screen position
3. The type picker shows only types with the same pin count as the current component
4. Selecting a type replaces the component in circuitStore keeping anchorPos + rotationY; props reset to {}
5. If the new type has a primary value key, opens inline edit immediately after swap
6. A toast "Swapped to [type] — Ctrl+Z to undo" confirms the action
7. Locked components: "Swap type" is disabled/grayed in menu

## Pin-count compatibility groups
- 2-pin: resistor, capacitor, inductor, battery, diode, zener, schottky, led, motor, tactileSwitch
- 3-pin: bjt, pnp, mosfet, potentiometer
- 5+ pin (timer555, arduino, opamp): do not show swap option at all — skip adding to menu for these types

## Implementation

### 1. `store/circuitStore.ts`
Add to the interface and implementation:
```ts
swapComponentType(id: string, newType: ComponentType): void;
```
Implementation:
```ts
swapComponentType(id, newType) {
  set((state) => {
    const comp = state.components[id];
    if (!comp || comp.locked) return state;
    const components = {
      ...state.components,
      [id]: { ...comp, type: newType, props: {} },
    };
    const nodes = runNetAnalysis(state.nodes, state.wires, components);
    return { components, nodes };
  });
  useToastStore.getState().addToast(`Swapped to ${newType} — Ctrl+Z to undo`, 'info');
},
```

### 2. `store/uiStore.ts`
Add to interface and state:
```ts
swapTypeMenuId: string | null;
swapTypeMenuPos: { x: number; y: number } | null;
openSwapTypeMenu: (id: string, x: number, y: number) => void;
closeSwapTypeMenu: () => void;
```
Init: `swapTypeMenuId: null, swapTypeMenuPos: null`
Actions:
```ts
openSwapTypeMenu: (id, x, y) => set({ swapTypeMenuId: id, swapTypeMenuPos: { x, y } }),
closeSwapTypeMenu: () => set({ swapTypeMenuId: null, swapTypeMenuPos: null }),
```
Do NOT add these to the partialize list (ephemeral UI state, not persisted).

### 3. `components/ContextMenu.tsx`
In MENU_ITEMS, add after 'duplicate':
```ts
{ key: 'swapType', label: 'Swap type', kbd: null },
```
In the run() switch for 'swapType':
```ts
case 'swapType': {
  const menuPos = useUIStore.getState().contextMenu;
  if (menuPos) useUIStore.getState().openSwapTypeMenu(componentId, menuPos.x, menuPos.y);
  break;
}
```
Disable the item when comp.locked is true OR when the type is timer555/arduino/opamp
(add a `disabled?: boolean` field to MENU_ITEMS or check inline before rendering).

### 4. New `components/SwapTypeMenu.tsx`
Create a new file. Floating panel showing compatible types:

```tsx
'use client';

import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import type { ComponentType } from '@/types/circuit';

const TWO_PIN: ComponentType[] = [
  'resistor','capacitor','inductor','battery','diode','zener','schottky','led','motor','tactileSwitch',
];
const THREE_PIN: ComponentType[] = ['bjt','pnp','mosfet','potentiometer'];

function getPinGroup(type: ComponentType): ComponentType[] | null {
  if ((TWO_PIN as ComponentType[]).includes(type)) return TWO_PIN;
  if ((THREE_PIN as ComponentType[]).includes(type)) return THREE_PIN;
  return null;
}

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType, string>> = {
  resistor: 'resistance', capacitor: 'capacitance', inductor: 'inductance',
  battery: 'voltage', potentiometer: 'resistance', zener: 'voltage',
};

const TYPE_LABELS: Record<ComponentType, string> = {
  resistor: 'Resistor', capacitor: 'Capacitor', inductor: 'Inductor',
  battery: 'Battery', diode: 'Diode', zener: 'Zener', schottky: 'Schottky',
  led: 'LED', motor: 'Motor', tactileSwitch: 'Switch',
  bjt: 'NPN BJT', pnp: 'PNP BJT', mosfet: 'MOSFET', potentiometer: 'Pot',
  timer555: '555 Timer', arduino: 'Arduino', opamp: 'Op-Amp',
};

export default function SwapTypeMenu() {
  const id = useUIStore((s) => s.swapTypeMenuId);
  const pos = useUIStore((s) => s.swapTypeMenuPos);
  const closeSwapTypeMenu = useUIStore((s) => s.closeSwapTypeMenu);
  const openInlineEdit = useUIStore((s) => s.openInlineEdit);
  const components = useCircuitStore((s) => s.components);
  const swapComponentType = useCircuitStore((s) => s.swapComponentType);

  if (!id || !pos) return null;
  const comp = components[id];
  if (!comp) return null;
  const group = getPinGroup(comp.type);
  if (!group) return null;
  const options = group.filter((t) => t !== comp.type);

  const x = Math.min(pos.x, window.innerWidth - 180);
  const y = Math.min(pos.y, window.innerHeight - 260);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeSwapTypeMenu} />
      <div
        className="fixed z-50 bg-[#18181c] border border-white/15 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.7)] p-2 min-w-[160px]"
        style={{ left: x, top: y, animation: 'toastIn 0.1s ease-out both' }}
      >
        <p className="text-[10px] text-white/40 px-1 pb-1">Swap type</p>
        <div className="flex flex-col gap-0.5">
          {options.map((type) => (
            <button
              key={type}
              className="text-left text-[12px] text-white/80 hover:bg-white/[0.08] rounded px-2 py-1.5 transition-colors"
              onClick={() => {
                swapComponentType(id, type);
                closeSwapTypeMenu();
                const propKey = PRIMARY_VALUE_KEY[type];
                if (propKey) {
                  openInlineEdit(id, pos.x, pos.y);
                }
              }}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
```

### 5. `app/page.tsx`
Import SwapTypeMenu and render it alongside ContextMenu:
```tsx
import SwapTypeMenu from '@/components/SwapTypeMenu';
// ... in JSX:
<SwapTypeMenu />
```

## Type Safety Reminders
- `PlacedComponent` has `locked?: boolean` — check `comp?.locked` not `comp.locked`
- `ComponentType` union — arrays typed as `ComponentType[]` are fine for `.includes()`
- `swapComponentType` must be added to BOTH the interface type and the implementation object in circuitStore.ts

## Verify
Run `pnpm build` — must pass with zero type errors.
