import type { PlacedComponent } from '@/types/circuit';
import type { ComponentType } from '@/types/circuit';

function formatValue(comp: PlacedComponent): string {
  const p = comp.props as Record<string, unknown>;
  switch (comp.type) {
    case 'resistor': {
      const r = Number(p.resistance ?? 220);
      if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(1)}MΩ`;
      if (r >= 1_000) return `${(r / 1_000).toFixed(r % 1000 === 0 ? 0 : 1)}kΩ`;
      return `${r}Ω`;
    }
    case 'capacitor': {
      const c = Number(p.capacitance ?? 0.0001);
      if (c >= 0.001) return `${(c * 1000).toFixed(0)}mF`;
      if (c >= 1e-6) return `${(c * 1e6).toFixed(0)}µF`;
      return `${(c * 1e9).toFixed(0)}nF`;
    }
    case 'inductor': {
      const l = Number(p.inductance ?? 0.001);
      if (l >= 1) return `${l.toFixed(1)}H`;
      if (l >= 0.001) return `${(l * 1000).toFixed(0)}mH`;
      return `${(l * 1e6).toFixed(0)}µH`;
    }
    case 'battery':
      return `${Number(p.voltage ?? 9)}V`;
    case 'led':
      return (p.color as string | undefined) ?? '#ff0000';
    case 'zener':
      return `${Number(p.breakdownVoltage ?? 5.1)}V Vz`;
    case 'diode':
    case 'schottky':
      return `Vf=${Number(p.forwardVoltage ?? 0.7)}V`;
    case 'bjt':
    case 'pnp':
      return `β=${Number(p.hFE ?? 100)}`;
    case 'mosfet':
      return `Rds=${Number(p.rdsOn ?? 0.1)}Ω`;
    case 'potentiometer': {
      const r = Number(p.resistance ?? 10000);
      return r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`;
    }
    case 'timer555':
      return '555';
    case 'arduino':
      return 'ATmega328P';
    case 'opamp':
      return 'LM741';
    case 'motor':
      return `${Number(p.resistance ?? 10)}Ω`;
    case 'tactileSwitch':
      return 'SPST';
    default:
      return '';
  }
}

const TYPE_LABELS: Record<ComponentType, string> = {
  resistor: 'Resistor',
  capacitor: 'Capacitor',
  inductor: 'Inductor',
  battery: 'Battery',
  diode: 'Diode',
  zener: 'Zener Diode',
  schottky: 'Schottky Diode',
  led: 'LED',
  motor: 'DC Motor',
  tactileSwitch: 'Tactile Switch',
  bjt: 'NPN BJT',
  pnp: 'PNP BJT',
  mosfet: 'N-MOSFET',
  potentiometer: 'Potentiometer',
  timer555: '555 Timer',
  arduino: 'Arduino Uno',
  opamp: 'Op-Amp',
};

export interface BOMRow {
  designators: string[];
  type: string;
  value: string;
  count: number;
}

export function buildBOM(
  components: Record<string, PlacedComponent>,
  getDesignator: (id: string) => string,
): BOMRow[] {
  const groups = new Map<string, { designators: string[]; type: string; value: string }>();

  for (const comp of Object.values(components)) {
    const value = formatValue(comp);
    const key = `${comp.type}::${value}`;
    if (!groups.has(key)) {
      groups.set(key, {
        designators: [],
        type: TYPE_LABELS[comp.type] ?? comp.type,
        value,
      });
    }
    groups.get(key)?.designators.push(getDesignator(comp.id));
  }

  return Array.from(groups.values())
    .map((g) => ({ ...g, count: g.designators.length }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export function exportBOMAsCSV(rows: BOMRow[], circuitName: string): void {
  const header = 'Designators,Type,Value,Count\n';
  const body = rows.map((r) => `"${r.designators.join(', ')}","${r.type}","${r.value}",${r.count}`).join('\n');
  const blob = new Blob([header + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${circuitName || 'circuit'}-bom.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
