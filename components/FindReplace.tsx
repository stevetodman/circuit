'use client';

import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { parseEngValue } from '@/lib/engineering';
import type { ComponentType, PlacedComponent } from '@/types/circuit';

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

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType, string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'breakdownVoltage',
  voltageRegulator: 'voltage',
};

const ALL_TYPES = Object.keys(TYPE_LABELS) as ComponentType[];

function getPrimaryValue(component: PlacedComponent): number | null {
  const key = PRIMARY_VALUE_KEY[component.type];
  if (!key) return null;

  const raw = component.props[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = parseEngValue(raw);
    return parsed != null ? parsed : null;
  }
  return null;
}

function valuesMatch(component: PlacedComponent, target: number | null): boolean {
  if (target == null) return false;
  const source = getPrimaryValue(component);
  if (source == null || !Number.isFinite(source)) return false;
  return Math.abs(source - target) < (Math.abs(source) + Math.abs(target)) * 1e-12 + 1e-12;
}

export default function FindReplace() {
  const open = useUIStore((s) => s.findReplaceOpen);
  const closeFindReplace = useUIStore((s) => s.closeFindReplace);
  const components = useCircuitStore((s) => s.components);
  const setSelectedComponents = useCircuitStore((s) => s.setSelectedComponents);
  const setProperty = useCircuitStore((s) => s.setProperty);
  const [findType, setFindType] = useState<ComponentType | 'all'>('all');
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const findValueInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => findValueInputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const allComponents = Object.values(components);
  const hasFindValue = findValue.trim().length > 0;
  const parsedFindValue = hasFindValue ? parseEngValue(findValue) : null;
  const matches = allComponents.filter((component) => {
    if (findType !== 'all' && component.type !== findType) return false;
    if (!hasFindValue) return true;
    if (parsedFindValue == null) return false;
    return valuesMatch(component, parsedFindValue);
  });

  const parsedReplaceValue = parseEngValue(replaceValue);
  const canReplace = parsedReplaceValue != null && Number.isFinite(parsedReplaceValue) && parsedReplaceValue > 0;

  const handleSelectAll = () => {
    setSelectedComponents(matches.map((component) => component.id));
  };

  const handleReplace = () => {
    if (!canReplace) return;
    const parsed = parseEngValue(replaceValue);
    if (parsed == null || !Number.isFinite(parsed) || parsed <= 0) return;
    for (const comp of matches) {
      const key = PRIMARY_VALUE_KEY[comp.type];
      if (key) setProperty(comp.id, key, parsed);
    }
    closeFindReplace();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeFindReplace} />
      <div
        className="fixed z-50 top-16 left-1/2 -translate-x-1/2 w-80 bg-[#18181c] border border-white/15 rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.8)]"
        style={{ animation: 'toastIn 0.15s ease-out both' }}
      >
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <p className="text-[10px] text-white/40 mb-2 font-medium">Find &amp; Replace</p>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/40 w-10 shrink-0">Type</label>
            <select
              value={findType}
              onChange={(event) => setFindType(event.target.value as ComponentType | 'all')}
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white outline-none"
            >
              <option value="all">All types</option>
              {ALL_TYPES.map((type) => (
                <option key={type} value={type}>{TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-[10px] text-white/40 w-10 shrink-0">Value</label>
            <input
              ref={findValueInputRef}
              value={findValue}
              onChange={(event) => setFindValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeFindReplace();
                }
              }}
              placeholder="e.g. 10k, 100n, 4.7u"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white font-mono outline-none placeholder-white/25"
            />
          </div>
          <p className="text-[10px] text-white/30 mt-1.5">
            {matches.length} component{matches.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-white/40 w-10 shrink-0">Replace</label>
            <input
              value={replaceValue}
              onChange={(event) => setReplaceValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleReplace();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeFindReplace();
                }
              }}
              placeholder="e.g. 10k, 100n, 4.7u"
              className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white font-mono outline-none focus:border-[#7c6fff]/60 placeholder-white/25"
            />
          </div>
        </div>
        <div className="px-3 py-2 flex gap-2">
          <button
            type="button"
            className="flex-1 text-[11px] text-white/60 border border-white/10 rounded px-2 py-1.5 hover:bg-white/5 transition-colors disabled:opacity-40"
            onClick={handleSelectAll}
            disabled={matches.length === 0}
          >
            Select all ({matches.length})
          </button>
          <button
            type="button"
            className="flex-1 text-[11px] text-white bg-[#7c6fff]/20 border border-[#7c6fff]/30 rounded px-2 py-1.5 hover:bg-[#7c6fff]/30 transition-colors disabled:opacity-40"
            onClick={handleReplace}
            disabled={matches.length === 0 || !canReplace}
          >
            Replace all
          </button>
        </div>
        <div className="px-3 pb-2">
          <p className="text-[9px] text-white/25">Enter to replace · Esc to close</p>
        </div>
      </div>
    </>
  );
}
