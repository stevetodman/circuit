'use client';

import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import type { ComponentType } from '@/types/circuit';

const TWO_PIN: ComponentType[] = [
  'resistor',
  'capacitor',
  'inductor',
  'battery',
  'diode',
  'zener',
  'schottky',
  'led',
  'motor',
  'tactileSwitch',
];
const THREE_PIN: ComponentType[] = [
  'bjt',
  'pnp',
  'mosfet',
  'potentiometer',
];

function getPinGroup(type: ComponentType): ComponentType[] | null {
  if (TWO_PIN.includes(type)) return TWO_PIN;
  if (THREE_PIN.includes(type)) return THREE_PIN;
  return null;
}

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType, string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'voltage',
  voltageRegulator: 'voltage',
};

const TYPE_LABELS: Record<ComponentType, string> = {
  resistor: 'Resistor',
  capacitor: 'Capacitor',
  inductor: 'Inductor',
  battery: 'Battery',
  diode: 'Diode',
  zener: 'Zener',
  schottky: 'Schottky',
  led: 'LED',
  motor: 'Motor',
  tactileSwitch: 'Switch',
  bjt: 'NPN BJT',
  pnp: 'PNP BJT',
  mosfet: 'MOSFET',
  potentiometer: 'Pot',
  timer555: '555 Timer',
  arduino: 'Arduino',
  opamp: 'Op-Amp',
  voltageRegulator: 'Volt Reg',
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

  const options = group.filter((type) => type !== comp.type);
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
