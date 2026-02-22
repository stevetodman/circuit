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
 *   motor       → winding resistance
 *   555 / arduino / tactileSwitch → skipped (future milestones)
 */
import type { CircuitNode, PlacedComponent } from '@/types/circuit';
import type { NetlistElement, Netlist } from './MNASolver';

export function buildNetlist(
  nodes:      Record<string, CircuitNode>,
  components: Record<string, PlacedComponent>,
): Netlist {
  const elements: NetlistElement[] = [];

  // Determine netCount = max assigned netId + 1
  let maxNet = 0;
  for (const node of Object.values(nodes)) {
    if (node.netId != null && node.netId > maxNet) maxNet = node.netId;
  }
  const netCount = maxNet + 1;

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
        elements.push({ id: comp.id, kind: 'resistor', netA, netB, value: R });
        break;
      }

      case 'battery': {
        const netA = pinNet(comp, 'pos'); // positive terminal
        const netB = pinNet(comp, 'neg'); // negative terminal
        if (netA == null || netB == null || netA === netB) break;
        const V = typeof props.voltage === 'number' ? props.voltage : 9;
        elements.push({ id: comp.id, kind: 'vsource', netA, netB, value: V });
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

      case 'capacitor':
        // Backward-Euler model handled in transient solver
      {
        const netA = pinNet(comp, 'p1') ?? pinNet(comp, 'pos');
        const netB = pinNet(comp, 'p2') ?? pinNet(comp, 'neg');
        if (netA == null || netB == null || netA === netB) break;
        const C = typeof props.capacitance === 'number' ? props.capacitance : 1e-6;
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
        // Model as winding resistance only
        {
          const netA = pinNet(comp, 'p1');
          const netB = pinNet(comp, 'p2');
          if (netA == null || netB == null || netA === netB) break;
          elements.push({ id: comp.id, kind: 'resistor', netA, netB, value: 10 });
          break;
        }

      // timer555, arduino, tactileSwitch: future milestones
      default:
        break;
    }
  }

  return { elements, netCount };
}
