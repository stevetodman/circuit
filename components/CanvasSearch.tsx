'use client';

import { useEffect, useRef, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
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
};

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType | 'dcVoltage', string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'breakdownVoltage',
  timer555: 'r1',
  motor: 'resistance',
  dcVoltage: 'voltage',
};

const DEFAULT_PRIMARY_VALUE: Partial<Record<ComponentType | 'dcVoltage', number>> = {
  resistor: 1000,
  capacitor: 1,
  inductor: 0.001,
  battery: 9,
  potentiometer: 10_000,
  zener: 5.1,
  timer555: 1000,
  motor: 20,
  dcVoltage: 5,
};

function resolveNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatResistance(ohms: number): string {
  if (!Number.isFinite(ohms) || ohms <= 0) return '';
  if (ohms >= 1_000_000) return `${(ohms / 1_000_000).toFixed(1)}MΩ`;
  if (ohms >= 1_000) return `${(ohms / 1_000).toFixed(ohms % 1000 === 0 ? 0 : 1)}kΩ`;
  return `${ohms}Ω`;
}

function formatCapacitance(farads: number): string {
  if (!Number.isFinite(farads) || farads <= 0) return '';
  if (farads >= 1) return `${farads.toFixed(1)}F`;
  if (farads >= 0.001) return `${(farads * 1_000).toFixed(0)}mF`;
  if (farads >= 1e-6) return `${(farads * 1e6).toFixed(0)}µF`;
  return `${(farads * 1e9).toFixed(0)}nF`;
}

function formatInductance(henries: number): string {
  if (!Number.isFinite(henries) || henries <= 0) return '';
  if (henries >= 1) return `${henries.toFixed(1)}H`;
  if (henries >= 0.001) return `${(henries * 1_000).toFixed(0)}mH`;
  return `${(henries * 1e6).toFixed(0)}µH`;
}

function getPrimaryValueKey(type: ComponentType): string | null {
  const key = PRIMARY_VALUE_KEY[type];
  if (!key) return null;
  return key;
}

function formatComponentValueSummary(component: PlacedComponent): string {
  const key = getPrimaryValueKey(component.type);
  if (!key) return '';

  const rawValue = key in component.props ? component.props[key as keyof typeof component.props] : undefined;
  const defaultValue = DEFAULT_PRIMARY_VALUE[component.type];
  const resolvedValue = resolveNumeric(rawValue) ?? defaultValue;
  if (resolvedValue == null) return '';

  switch (component.type) {
    case 'resistor':
    case 'potentiometer':
    case 'motor':
      return formatResistance(resolvedValue);
    case 'capacitor':
      return formatCapacitance(resolvedValue);
    case 'battery':
    case 'zener':
      return `${resolvedValue}V`;
    case 'inductor':
      return formatInductance(resolvedValue);
    case 'timer555': {
      const r1 = formatResistance(resolveNumeric(component.props.r1) ?? DEFAULT_PRIMARY_VALUE.timer555!);
      const c = formatCapacitance(resolveNumeric(component.props.capacitance) ?? 1);
      return `${r1}/${c}`;
    }
    default:
      return '';
  }
}

export default function CanvasSearch() {
  const open = useUIStore((s) => s.canvasSearchOpen);
  const closeCanvasSearch = useUIStore((s) => s.closeCanvasSearch);
  const setSelectedComponent = useCircuitStore((s) => s.selectComponent);
  const components = useCircuitStore((s) => s.components);
  const getDesignator = useCircuitStore((s) => s.getDesignator);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const allComponents = Object.values(components) as PlacedComponent[];
  const normalizedQuery = query.trim().toLowerCase();
  const results = normalizedQuery
    ? allComponents.filter((component) => {
      const label = TYPE_LABELS[component.type]?.toLowerCase() ?? component.type;
      const designator = getDesignator(component.id).toLowerCase();
      return label.includes(normalizedQuery) || component.type.toLowerCase().includes(normalizedQuery) || designator.includes(normalizedQuery);
    })
    : allComponents;
  const maxCursor = Math.max(0, results.length - 1);
  const clampedCursor = Math.max(0, Math.min(cursor, maxCursor));

  const select = (id: string) => {
    setSelectedComponent(id);
    useUIStore.getState().requestZoomToComponent?.(id);
    closeCanvasSearch();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeCanvasSearch} />
      <div
        className="fixed z-50 top-16 left-1/2 -translate-x-1/2 w-80 bg-[#18181c] border border-white/15 rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.8)]"
        style={{ animation: 'toastIn 0.15s ease-out both' }}
      >
        <div className="px-3 py-2 border-b border-white/10">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setCursor(0); }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeCanvasSearch();
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                setCursor((prev) => Math.min(prev + 1, maxCursor));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setCursor((prev) => Math.max(prev - 1, 0));
              }
              if (event.key === 'Enter' && results[clampedCursor]) {
                event.preventDefault();
                event.stopPropagation();
                select(results[clampedCursor].id);
              }
            }}
            className="w-full bg-transparent text-white text-[13px] outline-none placeholder-white/30"
            placeholder="Search components... (e.g. resistor, LED)"
          />
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {results.length === 0 && (
            <p className="text-[11px] text-white/30 px-3 py-2">No components found</p>
          )}
          {results.map((comp, index) => {
            const label = TYPE_LABELS[comp.type];
            const designator = getDesignator(comp.id);
            const summary = formatComponentValueSummary(comp);
            const valueText = summary ? `${designator} · ${summary}` : designator;
            return (
              <button
                type="button"
                key={comp.id}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                  index === clampedCursor ? 'bg-[#7c6fff]/20 text-white' : 'text-white/70 hover:bg-white/5'
                }`}
                onClick={() => select(comp.id)}
              >
                <span className="font-medium">{label}</span>
                <span className="text-white/40 ml-2 text-[11px]">{valueText}</span>
              </button>
            );
          })}
        </div>
        <div className="px-3 py-1.5 border-t border-white/10">
          <p className="text-[9px] text-white/25">↑↓ navigate · Enter zoom · Esc cancel</p>
        </div>
      </div>
    </>
  );
}
