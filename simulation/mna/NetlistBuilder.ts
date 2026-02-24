/**
 * NetlistBuilder — converts the Zustand circuit topology into a Netlist
 * that MNASolver can consume.
 *
 * Supported component types for simulation:
 *   resistor    → conductance stamp
 *   battery     → ideal voltage source
 *   led         → Shockley diode (NR-linearised)
 *   capacitor   → transient companion (Backward Euler)
 *   bjt         → simplified Ebers-Moll
 *   diode       → plain diode (Shockley model)
 *   motor       → winding resistance + stateful back-EMF
 *   mosfet      → voltage-controlled switch (rdsOn / Roff)
 *   opamp       → behavioral gain clamp
 *   inductor    → DC short, transient companion
 *   tactileSwitch → closed/open resistance model
 *   555 / arduino → skipped (future milestones)
 */
import type { CircuitNode, PlacedComponent, Wire } from '@/types/circuit';
import { MAX_NETS } from '@/types/circuit';
import type { NetlistElement, Netlist } from './MNASolver';

export function buildNetlist(
  nodes:      Record<string, CircuitNode>,
  components: Record<string, PlacedComponent>,
  wires:      Record<string, Wire>,
): Netlist {
  const elements: NetlistElement[] = [];
  const wireBranchIndex: Record<string, number> = {};
  const branchElements: NetlistElement[] = [];

  // Determine netCount = max assigned netId + 1
  let maxNet = 0;
  for (const node of Object.values(nodes)) {
    if (node.netId != null && node.netId > maxNet) maxNet = node.netId;
  }
  const netCount = maxNet + 1;

  // P0-4: guard against exceeding SAB capacity
  if (netCount > MAX_NETS) {
    throw new Error(`Circuit exceeds maximum net count (${MAX_NETS}). Simplify the circuit.`);
  }

  // Lookup: given a component and pin name, return the netId (or null)
  function pinNet(comp: PlacedComponent, pinName: string): number | null {
    const pin  = comp.pins.find(p => p.name === pinName);
    if (!pin) return null;
    const node = nodes[pin.nodeId];
    return node?.netId ?? null;
  }

  for (const comp of Object.values(components)) {
    const props = comp.props;

    switch (comp.type) {
      case 'resistor': {
        const netA = pinNet(comp, 'p1');
        const netB = pinNet(comp, 'p2');
        if (netA == null || netB == null || netA === netB) break;
        const R = typeof props.resistance === 'number' ? props.resistance : 1000;
        const element: NetlistElement = { id: comp.id, kind: 'resistor', netA, netB, value: R };
        elements.push(element);
        branchElements.push(element);
        break;
      }

      case 'battery': {
        const netA = pinNet(comp, 'pos'); // positive terminal
        const netB = pinNet(comp, 'neg'); // negative terminal
        if (netA == null || netB == null || netA === netB) break;
        const V = typeof props.voltage === 'number' ? props.voltage : 9;
        const element: NetlistElement = { id: comp.id, kind: 'vsource', netA, netB, value: V };
        elements.push(element);
        branchElements.push(element);
        break;
      }

    case 'led': {
      const netA = pinNet(comp, 'anode');
      const netB = pinNet(comp, 'cathode');
      if (netA == null || netB == null || netA === netB) break;
      const Vf = typeof props.forwardVoltage === 'number' ? props.forwardVoltage : 2.0;
      elements.push({ id: comp.id, kind: 'diode', netA, netB, value: Vf });
      break;
    }

    case 'diode': {
      const netA = pinNet(comp, 'anode');
      const netB = pinNet(comp, 'cathode');
      if (netA == null || netB == null || netA === netB) break;
      const Vf = typeof (props as { forwardVoltage?: number }).forwardVoltage === 'number'
        ? (props as { forwardVoltage?: number }).forwardVoltage
        : 0.7;
      const element = { id: comp.id, kind: 'diode' as const, netA, netB, value: Vf ?? 0.7 };
      elements.push(element);
      branchElements.push(element);
      break;
    }

    case 'schottky': {
      const netA = pinNet(comp, 'anode');
      const netB = pinNet(comp, 'cathode');
      if (netA == null || netB == null || netA === netB) break;
      const Vf = typeof (props as { forwardVoltage?: number }).forwardVoltage === 'number'
        ? ((props as { forwardVoltage?: number }).forwardVoltage ?? 0.3)
        : 0.3;
      elements.push({ id: comp.id, kind: 'diode' as const, netA, netB, value: Vf });
      break;
    }

    case 'zener': {
      const netA = pinNet(comp, 'anode');
      const netB = pinNet(comp, 'cathode');
      if (netA == null || netB == null || netA === netB) break;
      const Vz = typeof (props as { breakdownVoltage?: number }).breakdownVoltage === 'number'
        ? ((props as { breakdownVoltage?: number }).breakdownVoltage ?? 5.1)
        : 5.1;
      elements.push({ id: comp.id, kind: 'zener' as const, netA, netB, value: Vz });
      break;
    }

    case 'pnp': {
      const netC = pinNet(comp, 'collector');
      const netB = pinNet(comp, 'base');
      const netE = pinNet(comp, 'emitter');
      if (netC == null || netB == null || netE == null) break;
      const hFE = typeof props.hFE === 'number' ? props.hFE : 100;
      // PNP: swap collector/emitter relative to NPN model
      elements.push({ id: comp.id, kind: 'bjt', netA: netE, netB, netC, value: hFE });
      break;
    }

    case 'mosfet': {
      const netGate = pinNet(comp, 'gate');
      const netD = pinNet(comp, 'drain');
      const netS = pinNet(comp, 'source');
      if (netGate == null || netD == null || netS == null || netD === netS) break;
      const rdsOn = (props as { rdsOn?: number }).rdsOn ?? 0.1;
      elements.push({
        id: comp.id,
        kind: 'mosfet' as const,
        netA: netD,
        netB: netS,
        netC: netGate,
        value: Math.max(1e-9, rdsOn),
      });
      break;
    }

    case 'opamp': {
      const netInP = pinNet(comp, 'in+');
      const netInN = pinNet(comp, 'in-');
      const netOut = pinNet(comp, 'out');
      const netVcc = pinNet(comp, 'vcc');
      const netGnd = pinNet(comp, 'gnd');
      if (netInP == null || netInN == null || netOut == null || netVcc == null || netGnd == null) break;
      elements.push({
        id: comp.id,
        kind: 'opamp',
        netA: netOut,
        netB: netInP,
        netC: netInN,
        netD: netVcc,
        netE: netGnd,
        value: 100000,
      });
      break;
    }

    case 'voltageRegulator': {
      const netGnd = pinNet(comp, 'gnd');
      const netOut = pinNet(comp, 'out');
      const netIn = pinNet(comp, 'in');
      if (netOut == null || netGnd == null) break;
      const V = (props as { voltage?: number }).voltage ?? 5;
      const element: NetlistElement = { id: comp.id, kind: 'vsource', netA: netOut, netB: netGnd, value: V };
      elements.push(element);
      branchElements.push(element);
      if (netIn != null && netIn !== netGnd) {
        elements.push({ id: `${comp.id}_in`, kind: 'resistor', netA: netIn, netB: netGnd, value: 10 });
      }
      break;
    }

    case 'inductor': {
      const netA = pinNet(comp, 'a');
      const netB = pinNet(comp, 'b');
      if (netA == null || netB == null || netA === netB) break;
      const inductance = (props as { inductance?: number }).inductance ?? 0.001;
      elements.push({
        id: comp.id,
        kind: 'inductor' as const,
        netA,
        netB,
        value: Math.max(1e-9, inductance),
      });
      break;
    }

    case 'potentiometer': {
      const netA = pinNet(comp, 'a');
      const netW = pinNet(comp, 'wiper');
      const netB = pinNet(comp, 'b');
      if (netA == null || netW == null || netB == null || netA === netB) break;
      const resistance = (props as { resistance?: number }).resistance ?? 10_000;
      const rawWiper = (props as { wiper?: number }).wiper ?? 0.5;
      const wiper = Math.max(0, Math.min(1, rawWiper));
      const rA = Math.max(1e-9, resistance * wiper);
      const rB = Math.max(1e-9, resistance * (1 - wiper));
      elements.push({ id: `${comp.id}-a`, kind: 'resistor' as const, netA, netB: netW, value: rA });
      elements.push({ id: `${comp.id}-b`, kind: 'resistor' as const, netA: netW, netB, value: rB });
      break;
    }

    case 'capacitor':
      // Backward-Euler model handled in transient solver
      {
        const netA = pinNet(comp, 'p1') ?? pinNet(comp, 'pos');
        const netB = pinNet(comp, 'p2') ?? pinNet(comp, 'neg');
        if (netA == null || netB == null || netA === netB) break;
        const C = (typeof props.capacitance === 'number' ? props.capacitance : 1) * 1e-6;
        elements.push({ id: comp.id, kind: 'capacitor', netA, netB, value: C });
        break;
      }

      case 'bjt': {
        const netC = pinNet(comp, 'collector');
        const netB = pinNet(comp, 'base');
        const netE = pinNet(comp, 'emitter');
        if (netC == null || netB == null || netE == null) break;
        const hFE = typeof props.hFE === 'number' ? props.hFE : 100;
        elements.push({ id: comp.id, kind: 'bjt', netA: netC, netB, netC: netE, value: hFE });
        break;
      }

      case 'motor':
        {
          const netA = pinNet(comp, 'p1');
          const netB = pinNet(comp, 'p2');
          if (netA == null || netB == null || netA === netB) break;
          const resistance = typeof (props as { resistance?: number }).resistance === 'number'
            ? (props as { resistance?: number }).resistance ?? 10
            : 10;
          const element: NetlistElement = {
            id: comp.id,
            kind: 'motor',
            netA,
            netB,
            value: resistance,
          };
          elements.push(element);
          branchElements.push(element);
          break;
        }

      case 'tactileSwitch': {
        const netA = pinNet(comp, 'p1');
        const netB = pinNet(comp, 'p2');
        if (netA == null || netB == null || netA === netB) break;
        const closed = typeof props.closed === 'boolean'
          ? props.closed
          : (props as { closed?: number }).closed === 1;
        const value = closed ? 0.001 : 1e9;
        elements.push({ id: comp.id, kind: 'resistor', netA, netB, value });
        break;
      }

      // timer555, arduino: future milestones
      default:
        break;
      }
  }

  for (const wire of Object.values(wires)) {
    const fromNode = nodes[wire.fromNodeId];
    const toNode = nodes[wire.toNodeId];
    if (!fromNode || !toNode) continue;
    const netA = fromNode.netId;
    const netB = toNode.netId;
    if (netA == null || netB == null) continue;

    const foundIndex = branchElements.findIndex((element) =>
      element.kind !== 'diode' &&
      ((element.netA === netA && element.netB === netB) || (element.netA === netB && element.netB === netA))
    );
    if (foundIndex >= 0) {
      wireBranchIndex[wire.id] = foundIndex;
    }
  }

  return { elements, netCount, wireBranchIndex };
}
