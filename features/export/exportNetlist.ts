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
  let bjtIndex = 1;
  let timer555Index = 1;
  let motorIndex = 1;
  let switchIndex = 1;

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
      continue;
    }

    if (comp.type === 'bjt') {
      const netC = pinNet(nodes, comp, 'collector');
      const netB = pinNet(nodes, comp, 'base');
      const netE = pinNet(nodes, comp, 'emitter');
      if (netC == null || netB == null || netE == null) continue;
      lines.push(`Q${bjtIndex++} ${toSPICENet(netC)} ${toSPICENet(netB)} ${toSPICENet(netE)} NPN_GENERIC`);
      continue;
    }

    if (comp.type === 'timer555') {
      const vcc = pinNet(nodes, comp, 'vcc');
      const gnd = pinNet(nodes, comp, 'gnd');
      const out = pinNet(nodes, comp, 'out');
      const trig = pinNet(nodes, comp, 'trig');
      if (vcc == null || gnd == null) continue;
      lines.push(`* U${timer555Index++} 555 TIMER: VCC=${toSPICENet(vcc)} GND=${toSPICENet(gnd)} OUT=${toSPICENet(out)} TRIG=${toSPICENet(trig)} (behavioral model — not SPICE-native)`);
      continue;
    }

    if (comp.type === 'motor') {
      const netA = pinNet(nodes, comp, 'p1');
      const netB = pinNet(nodes, comp, 'p2');
      if (netA == null || netB == null || netA === netB) continue;
      const resistance = typeof comp.props.resistance === 'number' ? comp.props.resistance : 10;
      lines.push(`R_MOTOR${motorIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ${resistance} * DC Motor (modeled as resistor)`);
      continue;
    }

    if (comp.type === 'tactileSwitch') {
      const netA = pinNet(nodes, comp, 'p1');
      const netB = pinNet(nodes, comp, 'p2');
      if (netA == null || netB == null || netA === netB) continue;
      lines.push(`SW${switchIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} SWITCH_CTRL 0 MYSW`);
      continue;
    }
  }

  lines.push('.tran 0.1m 10m');
  lines.push('.model DLED D(Is=1e-14 N=1.5)');
  lines.push('.model NPN_GENERIC NPN(Is=1e-14 Bf=100)');
  lines.push('.model MYSW SW(Ron=0.01 Roff=1e9 Vt=0.5 Vh=0)');
  lines.push('.end');

  return `${lines.join('\n')}\n`;
}
