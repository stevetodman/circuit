import type { CircuitNode, PlacedComponent, Wire } from '@/types/circuit';

function toSPICENet(netId: number | null): string {
  if (netId == null) return '0';
  return String(netId);
}

function pinNet(nodes: Record<string, CircuitNode>, comp: PlacedComponent, pinName: string): number | null {
  const pin = comp.pins.find((p) => p.name === pinName);
  if (!pin) return null;
  return nodes[pin.nodeId]?.netId ?? null;
}

export function exportSPICE(
  nodes: Record<string, CircuitNode>,
  components: Record<string, PlacedComponent>,
  _wires: Record<string, Wire>,
  title = 'Circuit',
): string {
  const lines: string[] = [
    `.title ${title}`,
  ];

  let resistorIndex = 1;
  let voltageIndex = 1;
  let diodeIndex = 1;
  let capacitorIndex = 1;

  for (const comp of Object.values(components)) {
    if (comp.type === 'resistor') {
      const netA = pinNet(nodes, comp, 'p1');
      const netB = pinNet(nodes, comp, 'p2');
      if (netA == null || netB == null || netA === netB) continue;

      const valueRaw = comp.props.resistance;
      const value = typeof valueRaw === 'number' ? valueRaw : 1000;
      lines.push(`R${resistorIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ${value}`);
      continue;
    }

    if (comp.type === 'battery') {
      const netA = pinNet(nodes, comp, 'pos');
      const netB = pinNet(nodes, comp, 'neg');
      if (netA == null || netB == null || netA === netB) continue;

      const valueRaw = comp.props.voltage;
      const value = typeof valueRaw === 'number' ? valueRaw : 9;
      lines.push(`V${voltageIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} DC ${value}`);
      continue;
    }

    if (comp.type === 'led') {
      const netA = pinNet(nodes, comp, 'anode');
      const netB = pinNet(nodes, comp, 'cathode');
      if (netA == null || netB == null || netA === netB) continue;

      lines.push(`D${diodeIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} DLED`);
      continue;
    }

    if (comp.type === 'capacitor') {
      const netA = pinNet(nodes, comp, 'pos');
      const netB = pinNet(nodes, comp, 'neg');
      if (netA == null || netB == null || netA === netB) continue;

      const valueRaw = comp.props.capacitance;
      const value = typeof valueRaw === 'number' ? valueRaw : 1;
      lines.push(`C${capacitorIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ${value}u`);
    }
  }

  lines.push('.tran 0.1m 10m');
  lines.push('.model DLED D(Is=1e-14 N=1.5)');
  lines.push('.end');

  return `${lines.join('\n')}\n`;
}
