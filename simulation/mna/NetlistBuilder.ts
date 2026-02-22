/**
 * NetlistBuilder — converts the Zustand circuit topology into a Netlist
 * that MNASolver can consume.
 *
 * Supported component types for simulation:
 *   resistor    → conductance stamp
 *   battery     → ideal voltage source
 *   led         → Shockley diode (NR-linearised)
 *   capacitor   → open circuit (DC)
 *   bjt / 555 / arduino / motor / tactileSwitch → skipped (future milestones)
 */
import type { CircuitNode, PlacedComponent, Wire } from '@/types/circuit';
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

      case 'capacitor':
        // DC → open circuit; skip
        break;

      // bjt, timer555, arduino, motor, tactileSwitch: future milestones
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
