'use client';

import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import type { ComponentType, PlacedComponent } from '@/types/circuit';

function parseEngValue(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  const m = s.match(/^([+-]?\d*\.?\d+)\s*([kKmMuUnNpP]?)$/);
  if (!m) return null;

  const base = parseFloat(m[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = m[2];
  if (suffix === 'M') return base * 1e6;

  const multipliers: Record<string, number> = { k: 1e3, K: 1e3, m: 1e-3, M: 1e6, u: 1e-6, U: 1e-6, n: 1e-9, N: 1e-9, p: 1e-12, P: 1e-12 };
  return base * (multipliers[suffix] ?? 1);
}

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType | 'dcVoltage', string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'voltage',
  timer555: 'r1',
  dcVoltage: 'voltage',
};

const DEFAULT_PRIMARY_VALUE: Partial<Record<ComponentType | 'dcVoltage', number>> = {
  resistor: 1000,
  capacitor: 1,
  battery: 9,
  inductor: 1e-3,
  potentiometer: 10_000,
  timer555: 1000,
  zener: 5.1,
  dcVoltage: 5,
};

function resolvePrimaryValueKey(component: PlacedComponent): string | null {
  const key = PRIMARY_VALUE_KEY[component.type];
  if (!key) return null;

  if (component.type === 'zener') {
    if (component.props.voltage != null) return 'voltage';
    if (component.props.breakdownVoltage != null) return 'breakdownVoltage';
    return 'breakdownVoltage';
  }

  if (key in component.props) return key;
  return key;
}

function resolvePrimaryValue(component: PlacedComponent, key: string): number | string | null {
  const value = component.props[key];
  if (value != null) return value;
  return DEFAULT_PRIMARY_VALUE[component.type] ?? null;
}

export default function InlineValueEditor() {
  const id = useUIStore((s) => s.inlineEditComponentId);
  const pos = useUIStore((s) => s.inlineEditScreenPos);
  const closeInlineEdit = useUIStore((s) => s.closeInlineEdit);
  const components = useCircuitStore((s) => s.components);
  const setProperty = useCircuitStore((s) => s.setProperty);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const comp = id ? components[id] : null;
  const propKey = comp ? resolvePrimaryValueKey(comp) : null;

  useEffect(() => {
    if (!comp || !propKey) {
      setValue('');
      return;
    }

    const nextValue = resolvePrimaryValue(comp, propKey);
    if (nextValue == null) {
      setValue('');
      return;
    }

    setValue(String(nextValue));
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);

    return () => window.clearTimeout(timeoutId);
  }, [id]);

  const commit = () => {
    if (!id || !propKey) {
      closeInlineEdit();
      return;
    }

    const parsed = parseEngValue(value);
    if (parsed != null && Number.isFinite(parsed) && parsed > 0) {
      setProperty(id, propKey, parsed);
    }
    closeInlineEdit();
  };

  if (!id || !pos || !comp || !propKey) return null;

  const x = Math.min(Math.max(pos.x - 70, 8), window.innerWidth - 148);
  const y = Math.min(Math.max(pos.y - 52, 8), window.innerHeight - 80);

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{ left: x, top: y, animation: 'toastIn 0.15s ease-out both' }}
    >
      <div className="bg-[#18181c] border border-white/15 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.7)] px-2 py-1.5 flex flex-col gap-1 min-w-[140px]">
        <p className="text-[10px] text-white/40 capitalize">{comp.type} value</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              closeInlineEdit();
            }
          }}
          onBlur={commit}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white font-mono w-full outline-none focus:border-[#7c6fff]/60"
          placeholder="e.g. 10k, 100n, 4.7u"
        />
        <p className="text-[9px] text-white/25">Enter to confirm · Esc to cancel</p>
      </div>
    </div>
  );
}
