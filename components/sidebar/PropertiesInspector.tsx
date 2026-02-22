'use client';

import { useCircuitStore } from '@/store/circuitStore';
import type { ComponentType, PlacedComponent } from '@/types/circuit';

// ── Property field definitions per component type ─────────────────────────────
interface NumericField {
  kind: 'number';
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}
interface ColorField {
  kind: 'color';
  key: string;
  label: string;
  default: string;
}
type PropField = NumericField | ColorField;

const PROP_DEFS: Partial<Record<ComponentType, PropField[]>> = {
  resistor: [
    { kind: 'number', key: 'resistance', label: 'Resistance', default: 1000, min: 1, max: 10_000_000, unit: 'Ω' },
  ],
  led: [
    { kind: 'color',  key: 'color',          label: 'Color',           default: '#ff2020' },
    { kind: 'number', key: 'forwardVoltage',  label: 'Forward voltage', default: 2.0, min: 1.5, max: 4.0, step: 0.1, unit: 'V' },
  ],
  battery: [
    { kind: 'number', key: 'voltage', label: 'Voltage', default: 9, min: 1, max: 30, step: 0.5, unit: 'V' },
  ],
  capacitor: [
    { kind: 'number', key: 'capacitance', label: 'Capacitance', default: 1, min: 0.001, max: 100_000, step: 0.1, unit: 'µF' },
  ],
  bjt: [
    { kind: 'number', key: 'hFE', label: 'Current gain (β)', default: 100, min: 10, max: 1000 },
  ],
  timer555: [
    { kind: 'number', key: 'r1', label: 'R1 (timing)', default: 1000, min: 100, max: 1e6, step: 100, unit: 'Ω' },
    { kind: 'number', key: 'r2', label: 'R2 (timing)', default: 1000, min: 100, max: 1e6, step: 100, unit: 'Ω' },
    { kind: 'number', key: 'capacitance', label: 'Capacitance', default: 1e-6, min: 1e-9, max: 1e-3, step: 1e-7, unit: 'F' },
  ],
  motor: [
    { kind: 'number', key: 'rpm', label: 'Target RPM', default: 1000, min: 0, max: 10000, step: 100, unit: 'rpm' },
    { kind: 'number', key: 'resistance', label: 'Winding R', default: 10, min: 1, max: 1000, step: 1, unit: 'Ω' },
  ],
  tactileSwitch: [
    { kind: 'number', key: 'closed', label: 'State', default: 0, min: 0, max: 1, step: 1, unit: '' },
  ],
  arduino: [
    { kind: 'number', key: 'clockMhz', label: 'Clock speed', default: 16, min: 1, max: 20, step: 1, unit: 'MHz' },
  ],
};

const TYPE_LABELS: Record<ComponentType, string> = {
  resistor:     'Resistor',
  led:          'LED',
  battery:      'Battery',
  capacitor:    'Capacitor',
  bjt:          'NPN Transistor',
  timer555:     '555 Timer',
  arduino:      'Arduino Uno',
  motor:        'DC Motor',
  tactileSwitch:'Tactile Switch',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium text-white/40 leading-none">
      {children}
    </span>
  );
}

function NumberInput({
  field,
  value,
  onChange,
}: {
  field: NumericField;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(Math.max(field.min, Math.min(field.max, n)));
        }}
        className="flex-1 bg-white/[0.06] text-white/80 text-[12px] font-mono
                   rounded px-2 py-1 border border-white/[0.08]
                   focus:outline-none focus:border-[#7c6fff]/60
                   [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      {field.unit && (
        <span className="text-[10px] text-white/30 font-mono w-5 text-right flex-shrink-0">
          {field.unit}
        </span>
      )}
    </div>
  );
}

function ColorInput({
  field,
  value,
  onChange,
}: {
  field: ColorField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-white/[0.12] bg-transparent cursor-pointer p-0.5"
      />
      <span className="text-[11px] font-mono text-white/40">{value}</span>
    </div>
  );
}

// ── Main inspector ─────────────────────────────────────────────────────────────
function Inspector({ component }: { component: PlacedComponent }) {
  const setProperty    = useCircuitStore((s) => s.setProperty);
  const selectComponent = useCircuitStore((s) => s.selectComponent);

  const fields = PROP_DEFS[component.type] ?? [];
  const typeLabel = TYPE_LABELS[component.type] ?? component.type;

  function getValue(field: PropField): string | number {
    const stored = component.props[field.key];
    if (stored !== undefined) return stored;
    return field.default;
  }

  return (
    <div className="border-t border-white/[0.06]">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-white/60 tracking-wide">
          {typeLabel}
        </span>
        <button
          onClick={() => selectComponent(null)}
          className="text-white/25 hover:text-white/60 text-[14px] leading-none transition-colors"
          title="Deselect"
        >
          ✕
        </button>
      </div>

      {/* Property fields */}
      {fields.length === 0 ? (
        <p className="px-4 pb-3 text-[10px] text-white/20 italic">No configurable properties</p>
      ) : (
        <div className="px-4 pb-4 space-y-3">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label>{field.label}</Label>
              {field.kind === 'number' ? (
                <NumberInput
                  field={field}
                  value={getValue(field) as number}
                  onChange={(v) => setProperty(component.id, field.key, v)}
                />
              ) : (
                <ColorInput
                  field={field}
                  value={getValue(field) as string}
                  onChange={(v) => setProperty(component.id, field.key, v)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pin connections */}
      {component.pins.length > 0 && (
        <div className="px-4 pb-3 border-t border-white/[0.04] pt-2">
          <Label>Pins</Label>
          <div className="mt-1.5 space-y-0.5">
            {component.pins.map((pin) => (
              <div key={pin.name} className="flex justify-between text-[10px] font-mono">
                <span className="text-white/30">{pin.name}</span>
                <span className="text-white/20">{pin.nodeId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function PropertiesInspector() {
  const selectedId  = useCircuitStore((s) => s.selectedComponentId);
  const components  = useCircuitStore((s) => s.components);

  if (!selectedId) return null;
  const component = components[selectedId];
  if (!component) return null;

  return <Inspector component={component} />;
}
