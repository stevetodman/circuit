'use client';

import { useEffect, useRef, useState } from 'react';
import { useCircuitStore, pausePropertyUndo, resumePropertyUndo } from '@/store/circuitStore';
import { voltageView } from '@/simulation/SimBridge';
import type { ComponentType, PlacedComponent } from '@/types/circuit';
import { useScopeStore } from '@/store/scopeStore';

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

interface LogNumberField {
  kind: 'log-number';
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  unit?: string;
}

interface ToggleField {
  kind: 'toggle';
  key: string;
  label: string;
  default: number; // 0 = off, 1 = on
  onLabel?: string;
  offLabel?: string;
}

type PropField = NumericField | ColorField;
type PropOrLogField = PropField | LogNumberField | ToggleField;

function fmtV(v: number): string {
  const a = Math.abs(v);
  if (a < 0.001) return '0 V';
  if (a < 1) return `${(v * 1000).toFixed(1)} mV`;
  return `${v.toFixed(3)} V`;
}
function fmtI(i: number): string {
  const a = Math.abs(i);
  if (a < 1e-6) return '0 A';
  if (a < 0.001) return `${(i * 1e6).toFixed(1)} µA`;
  if (a < 1) return `${(i * 1000).toFixed(2)} mA`;
  return `${i.toFixed(3)} A`;
}
function fmtP(p: number): string {
  const a = Math.abs(p);
  if (a < 0.001) return `${(p * 1000).toFixed(2)} mW`;
  return `${p.toFixed(3)} W`;
}
function fmtR(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)}MΩ`;
  if (r >= 1000) return `${(r / 1000).toFixed(2)}kΩ`;
  return `${r.toFixed(0)}Ω`;
}

function engNotation(value: number, unit: string): string {
  const safeUnit = unit ?? '';
  const abs = Math.abs(value);
  const baseUnit = safeUnit.replace(/^[kMmnµ]/, '');

  if (!Number.isFinite(value)) return `${value}`;
  if (safeUnit === '') return `${value.toFixed(1)}`;

  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M${baseUnit}`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k${baseUnit}`;
  if (safeUnit.includes('F') && abs <= 1e-9) return `${(value / 1e-9).toFixed(1)}n${baseUnit}`;
  if (safeUnit.includes('F') && abs <= 1e-6) return `${(value / 1e-6).toFixed(1)}µ${baseUnit}`;
  if (abs < 1e-3) return `${(value * 1_000).toFixed(1)}m${baseUnit}`;

  return `${value.toFixed(1)}${baseUnit}`;
}

const PROP_DEFS: Partial<Record<ComponentType, PropOrLogField[]>> = {
  resistor: [
    { kind: 'number', key: 'resistance', label: 'Resistance', default: 1000, min: 1, max: 10_000_000, unit: 'Ω' },
  ],
  led: [
    { kind: 'color',  key: 'color',          label: 'Color',           default: '#ff2020' },
    { kind: 'number', key: 'forwardVoltage',  label: 'Forward voltage', default: 2.0, min: 1.5, max: 4.0, step: 0.1, unit: 'V' },
  ],
  diode: [
    { kind: 'number', key: 'forwardVoltage', label: 'Forward voltage', default: 0.7, min: 0.5, max: 1.5, step: 0.05, unit: 'V' },
  ],
  mosfet: [
    { kind: 'log-number', key: 'rdsOn', label: 'Rds(on)', default: 0.1, min: 0.01, max: 10, unit: 'Ω' },
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
  inductor: [
    { kind: 'number', key: 'inductance', label: 'Inductance', default: 1e-3, min: 1e-7, max: 1, step: 1e-4, unit: 'H' },
  ],
  potentiometer: [
    { kind: 'number', key: 'resistance', label: 'Resistance', default: 10_000, min: 10, max: 1_000_000, step: 10, unit: 'Ω' },
    { kind: 'number', key: 'wiper', label: 'Wiper', default: 0.5, min: 0, max: 1, step: 0.01 },
  ],
  timer555: [
    { kind: 'number', key: 'r1', label: 'R1 (timing)', default: 1000, min: 100, max: 1e6, step: 100, unit: 'Ω' },
    { kind: 'number', key: 'r2', label: 'R2 (timing)', default: 1000, min: 100, max: 1e6, step: 100, unit: 'Ω' },
    { kind: 'number', key: 'capacitance', label: 'Capacitance', default: 1, min: 0.001, max: 10_000, step: 0.1, unit: 'µF' },
  ],
  motor: [
    { kind: 'number', key: 'rpm', label: 'Target RPM', default: 1000, min: 0, max: 10000, step: 100, unit: 'rpm' },
    { kind: 'number', key: 'resistance', label: 'Winding R', default: 10, min: 0.1, max: 1000, step: 0.1, unit: 'Ω' },
  ],
  tactileSwitch: [
    { kind: 'toggle' as const, key: 'closed', label: 'Switch state', default: 0, onLabel: 'Closed (ON)', offLabel: 'Open (OFF)' },
  ],
  arduino: [
    { kind: 'number', key: 'clockMhz', label: 'Clock speed', default: 16, min: 1, max: 20, step: 1, unit: 'MHz' },
  ],
  pnp: [
    { kind: 'number', key: 'hFE', label: 'Current gain (β)', default: 100, min: 10, max: 1000 },
  ],
  zener: [
    { kind: 'number', key: 'breakdownVoltage', label: 'Breakdown voltage', default: 5.1, min: 1.5, max: 200, step: 0.1, unit: 'V' },
  ],
  schottky: [
    { kind: 'number', key: 'forwardVoltage', label: 'Forward voltage', default: 0.3, min: 0.1, max: 0.5, step: 0.05, unit: 'V' },
  ],
};
const E12_VALUES = [100, 220, 470, 1000, 2200, 4700, 10000, 22000, 47000];
const CAP_PRESETS    = [0.1, 1, 10, 100, 470, 1000];
const BATTERY_PRESETS = [1.5, 3, 5, 9, 12];
const INDUCTOR_PRESETS = [1e-3, 10e-3, 100e-3];

const LED_PRESETS = [
  { label: 'Red',    color: '#ff3333', vf: 2.0 },
  { label: 'Green',  color: '#33cc33', vf: 2.1 },
  { label: 'Blue',   color: '#3366ff', vf: 3.4 },
  { label: 'Yellow', color: '#ffcc00', vf: 2.1 },
  { label: 'White',  color: '#ffffff', vf: 3.2 },
  { label: 'IR',     color: '#660066', vf: 1.6 },
];

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
  diode:        'Diode (1N4148)',
  zener:        'Zener Diode',
  schottky:     'Schottky Diode',
  pnp:          'PNP Transistor',
  mosfet:       'MOSFET',
  opamp:        'Op-Amp',
  inductor:     'Inductor',
  potentiometer:'Potentiometer',
};

// ── Sub-components ────────────────────────────────────────────────────────────
interface Reading { label: string; value: string; formula?: string; warn?: boolean }

function getPinVoltage(nodes: Record<string, { netId: number | null }>, nodeId: string): number {
  const netId = nodes[nodeId]?.netId;
  return netId != null ? (voltageView[netId] ?? 0) : 0;
}

function computeReadings(comp: PlacedComponent, nodes: Record<string, { netId: number | null }>): Reading[] {
  const pinV = (name: string) => {
    const pin = comp.pins.find((p) => p.name === name);
    return pin ? getPinVoltage(nodes, pin.nodeId) : 0;
  };
  const pin0V = comp.pins[0] ? getPinVoltage(nodes, comp.pins[0].nodeId) : 0;
  const pin1V = comp.pins[1] ? getPinVoltage(nodes, comp.pins[1].nodeId) : 0;

  switch (comp.type) {
    case 'resistor': {
      const R = typeof comp.props.resistance === 'number' ? comp.props.resistance : 1000;
      const Vd = pin0V - pin1V;
      const I = Vd / Math.max(R, 1e-9);
      const P = Vd * I;
      return [
        { label: 'Voltage', value: fmtV(Vd) },
        { label: 'Current', value: fmtI(I), formula: `I = V/R = ${fmtV(Math.abs(Vd))} ÷ ${fmtR(R)} = ${fmtI(Math.abs(I))}` },
        { label: 'Power', value: fmtP(P), warn: P > 0.25, formula: P > 0.25 ? '⚠ Exceeds ¼W rating' : undefined },
      ];
    }
    case 'led': {
      const Va = pinV('anode');
      const Vc = pinV('cathode');
      const Vd = Va - Vc;
      return [
        { label: 'Forward V', value: fmtV(Math.max(0, Vd)) },
        { label: 'State', value: Vd > 0.5 ? '✓ Conducting' : 'Off (reverse or zero)' },
      ];
    }
    case 'battery': {
      const Vp = pinV('positive');
      const Vn = pinV('negative');
      return [{ label: 'Terminal V', value: fmtV(Vp - Vn) }];
    }
    case 'capacitor': {
      const Vd = pin0V - pin1V;
      const C = typeof comp.props.capacitance === 'number' ? comp.props.capacitance : 1; // µF
      return [
        { label: 'Voltage', value: fmtV(Vd) },
        { label: 'Charge', value: `${(C * Math.abs(Vd) * 1000).toFixed(2)} µC`, formula: `Q = C × V = ${C}µF × ${fmtV(Math.abs(Vd))}` },
      ];
    }
    case 'bjt':
    case 'pnp': {
      const Vb = pinV('base');
      const Vc2 = pinV('collector');
      const Ve = pinV('emitter');
      return [
        { label: 'VBE', value: fmtV(Vb - Ve) },
        { label: 'VCE', value: fmtV(Vc2 - Ve) },
        { label: 'State', value: (Vb - Ve) > 0.55 ? '✓ Active (conducting)' : 'Off' },
      ];
    }
    case 'diode':
    case 'schottky':
    case 'zener': {
      const Va = pinV('anode');
      const Vc2 = pinV('cathode');
      const Vd = Va - Vc2;
      return [
        { label: 'V across', value: fmtV(Vd) },
        { label: 'State', value: Vd > 0.2 ? '✓ Forward biased' : Vd < -0.1 ? 'Reverse biased' : 'Off' },
      ];
    }
    case 'potentiometer': {
      const Va = pinV('a');
      const Vb2 = pinV('b');
      const Vw = pinV('wiper');
      return [
        { label: 'V (a→b)', value: fmtV(Va - Vb2) },
        { label: 'V at wiper', value: fmtV(Vw) },
      ];
    }
    default: {
      if (comp.pins.length >= 2) {
        return [{ label: 'V across', value: fmtV(pin0V - pin1V) }];
      }
      return [];
    }
  }
}

function LiveReadings({ componentId }: { componentId: string }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const comp = useCircuitStore((s) => s.components[componentId]);
  const nodes = useCircuitStore((s) => s.nodes);

  useEffect(() => {
    if (!comp) return;
    const id = setInterval(() => {
      setReadings(computeReadings(comp, nodes));
    }, 100);
    return () => clearInterval(id);
  }, [comp, nodes]);

  if (!readings.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.08]">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2">
        Live Readings
      </p>
      <div className="space-y-1.5">
        {readings.map((r, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline">
              <span className="text-white/40 text-xs">{r.label}</span>
              <span className={`font-mono text-xs ${r.warn ? 'text-yellow-400' : 'text-white/80'}`}>
                {r.value}
              </span>
            </div>
            {r.formula && (
              <p className="text-[10px] text-white/25 font-mono mt-0.5 leading-relaxed">{r.formula}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [wasClamped, setWasClamped] = useState(false);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) {
              const clamped = Math.max(field.min, Math.min(field.max, n));
              onChange(clamped);
              setWasClamped(clamped !== n);
            }
          }}
          onFocus={() => { pausePropertyUndo(); setWasClamped(false); }}
          onBlur={resumePropertyUndo}
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
      {wasClamped && (
        <span className="text-[9px] text-amber-400/70 font-mono">
          Clamped to {engNotation(value, field.unit ?? '')}
        </span>
      )}
      {!wasClamped && (Math.abs(value) >= 1000 || (Math.abs(value) < 0.1 && value !== 0)) ? (
        <span className="text-[9px] text-white/30 font-mono">{engNotation(value, field.unit ?? '')}</span>
      ) : null}
    </div>
  );
}

function LogNumberInput({
  field,
  value,
  onChange,
}: {
  field: LogNumberField;
  value: number;
  onChange: (v: number) => void;
}) {
  const minLog = Math.log10(field.min);
  const maxLog = Math.log10(field.max);
  const range = maxLog - minLog;
  const clamped = Math.min(field.max, Math.max(field.min, value));
  const sliderValue = range <= 0 ? 0 : ((Math.log10(clamped) - minLog) / range) * 100;

  return (
    <div className="space-y-1.5">
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={sliderValue}
        onMouseDown={pausePropertyUndo}
        onMouseUp={resumePropertyUndo}
        onTouchStart={pausePropertyUndo}
        onTouchEnd={resumePropertyUndo}
        onChange={(e) => {
          const t = parseFloat(e.target.value);
          if (Number.isNaN(t)) return;
          const next = Math.pow(10, minLog + (t / 100) * range);
          onChange(Math.max(field.min, Math.min(field.max, next)));
        }}
        className="w-full accent-[#7c6fff]"
      />
      <div className="flex justify-between text-[10px] text-white/50">
        <span>{field.min}{field.unit ? `${field.unit}` : ''}</span>
        <span>{field.max}{field.unit ? `${field.unit}` : ''}</span>
      </div>
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
        onFocus={pausePropertyUndo}
        onBlur={resumePropertyUndo}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-white/[0.12] bg-transparent cursor-pointer p-0.5"
      />
      <span className="text-[11px] font-mono text-white/40">{value}</span>
    </div>
  );
}

function ToggleInput({
  field,
  value,
  onChange,
}: {
  field: ToggleField;
  value: number;
  onChange: (v: number) => void;
}) {
  const isOn = value !== 0;
  return (
    <button
      onClick={() => onChange(isOn ? 0 : 1)}
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-[11px] font-semibold w-full transition-colors ${
        isOn
          ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
          : 'bg-white/[0.05] text-white/40 border border-white/[0.1] hover:bg-white/[0.09]'
      }`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOn ? 'bg-green-400' : 'bg-white/20'}`} />
      {isOn ? (field.onLabel ?? 'ON') : (field.offLabel ?? 'OFF')}
    </button>
  );
}

function BatchInspector({ components }: { components: PlacedComponent[] }) {
  const setProperty = useCircuitStore((s) => s.setProperty);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const setSelectedComponentIds = useCircuitStore((s) => s.setSelectedComponentIds);

  const type = components[0].type;
  const typeLabel = TYPE_LABELS[type] ?? type;
  const fields = PROP_DEFS[type] ?? [];

  function getBatchValue(field: PropOrLogField): string | number | '—' {
    const values = components.map((c) => {
      const stored = c.props[field.key];
      return stored !== undefined ? stored : field.default;
    });
    const first = values[0];
    return values.every((v) => v === first) ? first : '—';
  }

  function setBatchValue(key: string, value: number) {
    for (const component of components) {
      setProperty(component.id, key, value);
    }
  }

  return (
    <div className="border-t border-white/[0.06]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-white/60 tracking-wide">
          {typeLabel} ×{components.length}
        </span>
        <button
          onClick={() => {
            selectComponent(null);
            setSelectedComponentIds([]);
          }}
          className="text-white/25 hover:text-white/60 text-[14px] leading-none transition-colors"
          title="Deselect all"
        >
          ✕
        </button>
      </div>

      {fields
        .filter((f): f is NumericField | LogNumberField => f.kind === 'number' || f.kind === 'log-number')
        .map((field) => {
          const batchVal = getBatchValue(field);
          const displayVal = batchVal === '—' ? '' : String(batchVal);

          return (
            <div key={field.key} className="px-4 pb-2">
              <label className="text-[10px] text-white/40 block mb-1">
                {field.label}{field.unit ? ` (${field.unit})` : ''}
              </label>
              <input
                type="number"
                placeholder={batchVal === '—' ? '— (mixed)' : undefined}
                defaultValue={displayVal}
                min={field.min}
                max={field.max}
                step={'step' in field ? (field.step ?? 1) : 1}
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded px-2 py-1 text-[11px] text-white font-mono"
                onBlur={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setBatchValue(field.key, v);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const v = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(v)) setBatchValue(field.key, v);
                  }
                }}
              />
            </div>
          );
        })}

      <div className="px-4 pb-3">
        <p className="text-[10px] text-white/30">
          {components.length} {typeLabel}s selected — editing applies to all
        </p>
      </div>
    </div>
  );
}

// ── Main inspector ─────────────────────────────────────────────────────────────
function Inspector({ component }: { component: PlacedComponent }) {
  const ref = useRef<HTMLDivElement>(null);
  // F4.1: scroll sidebar to show inspector when a component is selected
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const setProperty    = useCircuitStore((s) => s.setProperty);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const deleteSelected  = useCircuitStore((s) => s.deleteSelected);
  const nodes = useCircuitStore((s) => s.nodes);
  const channels = useScopeStore((s) => s.channels);

  const fields = PROP_DEFS[component.type] ?? [];
  const typeLabel = TYPE_LABELS[component.type] ?? component.type;

  function getValue(field: PropOrLogField): string | number {
    const stored = component.props[field.key];
    if (stored !== undefined) return stored;
    return field.default;
  }

  return (
    <div ref={ref} className="border-t border-white/[0.06]">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-semibold text-white/60 tracking-wide">
          {typeLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { deleteSelected(); selectComponent(null); }}
            className="text-[10px] text-red-500/40 hover:text-red-400 font-mono transition-colors leading-none"
            title="Delete component"
          >
            Delete
          </button>
          <button
            onClick={() => selectComponent(null)}
            className="text-white/25 hover:text-white/60 text-[14px] leading-none transition-colors"
            title="Deselect"
          >
            ✕
          </button>
        </div>
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
                <>
                  <NumberInput
                    field={field}
                    value={getValue(field) as number}
                    onChange={(v) => setProperty(component.id, field.key, v)}
                  />
                  {component.type === 'resistor' && field.key === 'resistance' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {E12_VALUES.map((value) => (
                        <button
                          key={value}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
                          onClick={() => setProperty(component.id, 'resistance', value)}
                        >
                          {value >= 1000 ? `${value / 1000}k` : `${value}`}
                        </button>
                      ))}
                    </div>
                  )}
                  {component.type === 'capacitor' && field.key === 'capacitance' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {CAP_PRESETS.map((value) => (
                        <button
                          key={value}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
                          onClick={() => setProperty(component.id, 'capacitance', value)}
                        >
                          {value < 1 ? `${Math.round(value * 1000)}nF` : value >= 1000 ? `${value / 1000}mF` : `${value}µF`}
                        </button>
                      ))}
                    </div>
                  )}
                  {component.type === 'battery' && field.key === 'voltage' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {BATTERY_PRESETS.map((value) => (
                        <button
                          key={value}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
                          onClick={() => setProperty(component.id, 'voltage', value)}
                        >
                          {value}V
                        </button>
                      ))}
                    </div>
                  )}
                  {component.type === 'inductor' && field.key === 'inductance' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {INDUCTOR_PRESETS.map((value) => (
                        <button
                          key={value}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-white/50 font-mono"
                          onClick={() => setProperty(component.id, 'inductance', value)}
                        >
                          {value < 0.01 ? `${Math.round(value * 1000)}mH` : `${Math.round(value * 1000)}mH`}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : field.kind === 'log-number' ? (
                <LogNumberInput
                  field={field}
                  value={getValue(field) as number}
                  onChange={(v) => setProperty(component.id, field.key, v)}
                />
              ) : field.kind === 'toggle' ? (
                <ToggleInput
                  field={field}
                  value={getValue(field) as number}
                  onChange={(v) => setProperty(component.id, field.key, v)}
                />
              ) : (
                <>
                  <ColorInput
                    field={field}
                    value={getValue(field) as string}
                    onChange={(v) => setProperty(component.id, field.key, v)}
                  />
                  {component.type === 'led' && field.key === 'color' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {LED_PRESETS.map(({ label, color, vf }) => (
                        <button
                          key={label}
                          className="text-[9px] px-1.5 py-0.5 rounded font-mono border border-white/10"
                          style={{ background: color + '33', color }}
                          onClick={() => {
                            setProperty(component.id, 'color', color);
                            setProperty(component.id, 'forwardVoltage', vf);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {field.kind === 'number' && component.type === 'potentiometer' && field.key === 'wiper' && (
                <>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={Math.max(0, Math.min(1, getValue(field) as number))}
                    onMouseDown={pausePropertyUndo}
                    onMouseUp={resumePropertyUndo}
                    onTouchStart={pausePropertyUndo}
                    onTouchEnd={resumePropertyUndo}
                    onChange={(e) => setProperty(component.id, field.key, parseFloat(e.target.value))}
                    className="w-full accent-[#7c6fff]"
                  />
                </>
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
                {(() => {
                  const netId = nodes[pin.nodeId]?.netId ?? null;
                  const isInScope = netId != null && channels.some((ch) => ch.netId === netId);
                  const isDisabled = netId == null || channels.length >= 4;

                  return (
                    <span className="text-white/20 inline-flex items-center">
                      <span>{pin.nodeId}</span>
                      {netId != null && (
                        <button
                          type="button"
                          onClick={() => {
                            const SCOPE_COLORS = ['#7c6fff', '#4ecdc4', '#ff6b6b', '#ffd93d'];
                            const usedCount = useScopeStore.getState().channels.length;
                            useScopeStore.getState().addChannel(
                              netId,
                              SCOPE_COLORS[usedCount % SCOPE_COLORS.length],
                            );
                          }}
                          title="Add to oscilloscope"
                          disabled={isDisabled}
                          className={`ml-1 text-[10px] transition-opacity ${isInScope ? 'opacity-90 text-[#7c6fff]' : 'opacity-35 hover:opacity-80'}`}
                        >
                          📊
                        </button>
                      )}
                    </span>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
      <LiveReadings componentId={component.id} />
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export default function PropertiesInspector() {
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const components  = useCircuitStore((s) => s.components);
  const hasAny      = useCircuitStore((s) => Object.keys(s.components).length > 0);

  if (selectedComponentIds.length >= 2) {
    const types = selectedComponentIds
      .map((id) => components[id]?.type)
      .filter(Boolean) as string[];
    const allSameType = types.length > 0 && types.every((t) => t === types[0]);
    if (allSameType) {
      const comps = selectedComponentIds
        .map((id) => components[id])
        .filter(Boolean) as PlacedComponent[];
      return <BatchInspector components={comps} />;
    }
  }

  if (!selectedComponentId) {
    return (
      <div className="border-t border-white/[0.06] px-4 py-4">
        <p className="text-[10px] text-white/20 italic leading-relaxed">
          {hasAny
            ? 'Click a component to inspect its properties.'
            : 'Drag a part from the panel above onto the breadboard to get started.'}
        </p>
      </div>
    );
  }
  const component = components[selectedComponentId];
  if (!component) return null;

  return <Inspector component={component} />;
}
