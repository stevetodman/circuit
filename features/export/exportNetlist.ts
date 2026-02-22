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
  let pnpIndex = 1;
  let timer555Index = 1;
  let motorIndex = 1;
  let switchIndex = 1;
  let diodeSimpleIndex = 1;
  let zenerIndex = 1;
  let schottkyIndex = 1;
  let mosfetIndex = 1;
  let opampIndex = 1;
  let inductorIndex = 1;
  let potentiometerIndex = 1;

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

    if (comp.type === 'diode') {
      const netA = pinNet(nodes, comp, 'anode');
      const netB = pinNet(nodes, comp, 'cathode');
      if (netA == null || netB == null || netA === netB) continue;
      lines.push(`D${diodeSimpleIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} DIODE_1N4148`);
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

    if (comp.type === 'pnp') {
      const netC = pinNet(nodes, comp, 'collector');
      const netB = pinNet(nodes, comp, 'base');
      const netE = pinNet(nodes, comp, 'emitter');
      if (netC == null || netB == null || netE == null) continue;
      lines.push(`Q${pnpIndex++} ${toSPICENet(netC)} ${toSPICENet(netB)} ${toSPICENet(netE)} PNP_GENERIC`);
      continue;
    }

    if (comp.type === 'zener') {
      const netA = pinNet(nodes, comp, 'anode');
      const netB = pinNet(nodes, comp, 'cathode');
      if (netA == null || netB == null || netA === netB) continue;
      const Vz = typeof comp.props.breakdownVoltage === 'number' ? comp.props.breakdownVoltage : 5.1;
      lines.push(`D${zenerIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ZENER_${Vz}V`);
      continue;
    }

    if (comp.type === 'schottky') {
      const netA = pinNet(nodes, comp, 'anode');
      const netB = pinNet(nodes, comp, 'cathode');
      if (netA == null || netB == null || netA === netB) continue;
      lines.push(`D${schottkyIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} DIODE_SCHOTTKY`);
      continue;
    }

    if (comp.type === 'mosfet') {
      const netD = pinNet(nodes, comp, 'drain');
      const netG = pinNet(nodes, comp, 'gate');
      const netS = pinNet(nodes, comp, 'source');
      if (netD == null || netG == null || netS == null) continue;
      lines.push(`M${mosfetIndex++} ${toSPICENet(netD)} ${toSPICENet(netG)} ${toSPICENet(netS)} ${toSPICENet(netS)} NMOS_SIMPLE`);
      continue;
    }

    if (comp.type === 'opamp') {
      const netInP = pinNet(nodes, comp, 'in+');
      const netInN = pinNet(nodes, comp, 'in-');
      const netOut = pinNet(nodes, comp, 'out');
      const netVcc = pinNet(nodes, comp, 'vcc');
      const netGnd = pinNet(nodes, comp, 'gnd');
      if (netInP == null || netInN == null || netOut == null || netVcc == null || netGnd == null) continue;
      lines.push(`X${opampIndex++} ${toSPICENet(netInP)} ${toSPICENet(netInN)} ${toSPICENet(netOut)} ${toSPICENet(netVcc)} ${toSPICENet(netGnd)} LM741`);
      continue;
    }

    if (comp.type === 'inductor') {
      const netA = pinNet(nodes, comp, 'a');
      const netB = pinNet(nodes, comp, 'b');
      if (netA == null || netB == null || netA === netB) continue;
      const valueRaw = comp.props.inductance;
      const inductance = typeof valueRaw === 'number' ? valueRaw : 0.001;
      lines.push(`L${inductorIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ${inductance}H`);
      continue;
    }

    if (comp.type === 'potentiometer') {
      const netA = pinNet(nodes, comp, 'a');
      const netW = pinNet(nodes, comp, 'wiper');
      const netB = pinNet(nodes, comp, 'b');
      if (netA == null || netW == null || netB == null) continue;
      const resRaw = comp.props.resistance;
      const resistance = typeof resRaw === 'number' ? resRaw : 10_000;
      const rawWiper = comp.props.wiper;
      const wiper = typeof rawWiper === 'number' ? Math.max(0, Math.min(1, rawWiper)) : 0.5;
      const rA = Math.max(1e-9, resistance * wiper);
      const rB = Math.max(1e-9, resistance * (1 - wiper));
      lines.push(`R${potentiometerIndex}a ${toSPICENet(netA)} ${toSPICENet(netW)} ${rA}`);
      lines.push(`R${potentiometerIndex}b ${toSPICENet(netW)} ${toSPICENet(netB)} ${rB}`);
      potentiometerIndex += 1;
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
      const mid = `MOTOR${motorIndex}`;
      lines.push(`R${motorIndex}_Ra ${toSPICENet(netA)} ${mid} ${resistance}`);
      lines.push(`V${motorIndex}_bemf ${mid} ${toSPICENet(netB)} 0`);
      motorIndex += 1;
      continue;
    }

    if (comp.type === 'tactileSwitch') {
      const netA = pinNet(nodes, comp, 'p1');
      const netB = pinNet(nodes, comp, 'p2');
      if (netA == null || netB == null || netA === netB) continue;
      const closed = typeof comp.props.closed === 'boolean'
        ? comp.props.closed
        : (comp.props.closed as number | undefined) === 1;
      const value = closed ? 0.001 : 1e9;
      lines.push(`R${switchIndex++} ${toSPICENet(netA)} ${toSPICENet(netB)} ${value}`);
      continue;
    }
  }

  lines.push('.tran 0.1m 10m');
  lines.push('.model DLED D(Is=1e-14 N=1.5)');
  lines.push('.model DIODE_1N4148 D(Is=1e-14 N=1.5)');
  lines.push('.model DIODE_SCHOTTKY D(Is=5e-7 N=1.0 Rs=0.01)');
  lines.push('.model NMOS_SIMPLE NMOS(Level=1 VTO=2.0 Beta=1e-3 L=1u W=1u)');
  lines.push('.model NPN_GENERIC NPN(Is=1e-14 Bf=100)');
  lines.push('.model PNP_GENERIC PNP(Is=1e-14 Bf=100)');
  lines.push('.end');

  return `${lines.join('\n')}\n`;
}
