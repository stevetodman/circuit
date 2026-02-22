# SPEC: Live Inline Math in PropertiesInspector

## Goal
When a component is selected, show live simulation data (V, I, P) plus the
Ohm's Law formula written out, directly in the PropertiesInspector panel.

Run `pnpm build` — must pass with zero errors.

---

## Read first
- `components/sidebar/PropertiesInspector.tsx` — full file, understand structure
- `simulation/SimBridge.ts` — exports voltageView Float32Array
- `store/circuitStore.ts` — selectedComponentId, components, nodes
- `types/circuit.ts` — pin definitions, component types

---

## Implementation

### Add `LiveReadings` section to PropertiesInspector

At the bottom of the inspector (after all existing fields), add a "Live Readings" section.

**Format helpers** (add near top of file):
```typescript
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
```

**LiveReadings component** (add inside PropertiesInspector.tsx file):
```tsx
import { voltageView } from '@/simulation/SimBridge';

interface Reading { label: string; value: string; formula?: string; warn?: boolean }

function getPinVoltage(nodes: Record<string, { netId: number | null }>, nodeId: string): number {
  const netId = nodes[nodeId]?.netId;
  return netId != null ? (voltageView[netId] ?? 0) : 0;
}

function computeReadings(comp: PlacedComponent, nodes: Record<string, { netId: number | null }>): Reading[] {
  const pinV = (name: string) => {
    const pin = comp.pins.find(p => p.name === name);
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
    case 'bjt': {
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
  const comp = useCircuitStore(s => s.components[componentId]);
  const nodes = useCircuitStore(s => s.nodes);

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
```

### Integration

Find the return statement in `PropertiesInspector` where component fields are rendered.
After all fields, add:
```tsx
<LiveReadings componentId={selectedComponentId} />
```

The `selectedComponentId` — find where it's read from the store in the file.
The `useState` and `useEffect` imports — add if not already imported.

---

## Implementation Notes
- Read PropertiesInspector.tsx fully before editing — it's complex
- `voltageView` is a module-level Float32Array — reads are synchronous and safe
- The poll at 100ms is fast enough to feel live, cheap enough to not hurt perf
- Pin names: check comp.pins array — names vary by component type
- Handle missing pins gracefully (pin?.nodeId ?? fallback)
- Run `pnpm build` — fix all TypeScript errors
