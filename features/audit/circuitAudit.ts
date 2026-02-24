import type { PlacedComponent, CircuitNode } from '@/types/circuit';

export interface AuditIssue {
  id: string;
  severity: 'error' | 'warn' | 'info';
  message: string;
  componentId?: string;
  componentLabel?: string;
}

export function runAudit(
  components: Record<string, PlacedComponent>,
  nodes: Record<string, CircuitNode>,
  getDesignator: (id: string) => string,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const compList = Object.values(components);

  // 1. No power source
  const hasPower = compList.some(
    (c) => c.type === 'battery' || (c.type as string) === 'voltageRegulator'
  );
  if (compList.length > 0 && !hasPower) {
    issues.push({
      id: 'no-power',
      severity: 'error',
      message: 'No power source — add a Battery or Voltage Regulator to your circuit.',
    });
  }

  // 2. No ground
  const groundNodes = Object.values(nodes).filter(
    (n) => n.id.startsWith('bb-tn-') || n.id.startsWith('bb-bn-')
  );
  const hasGround = groundNodes.some((n) => n.netId != null);
  if (compList.length > 0 && !hasGround) {
    issues.push({
      id: 'no-ground',
      severity: 'error',
      message: 'No ground connection — connect a wire to the − rail (ground) to complete the circuit.',
    });
  }

  const isPowerSource = (component: PlacedComponent) =>
    component.type === 'battery' || (component.type as string) === 'voltageRegulator';

  // 5. Short-circuit on power source terminals
  for (const component of compList) {
    if (!isPowerSource(component)) continue;

    const positivePin = component.pins.find((pin) => pin.name === 'pos' || pin.name === '+' || pin.name === 'vcc');
    const negativePin = component.pins.find((pin) => pin.name === 'neg' || pin.name === '-' || pin.name === 'gnd');
    if (!positivePin || !negativePin) continue;

    const positiveNode = nodes[positivePin.nodeId];
    const negativeNode = nodes[negativePin.nodeId];
    if (!positiveNode || !negativeNode) continue;
    if (positiveNode.netId == null || negativeNode.netId == null) continue;
    if (positiveNode.netId !== negativeNode.netId) continue;

    const label = getDesignator(component.id);
    issues.push({
      id: `short-circuit-${component.id}`,
      severity: 'warn',
      message: `${label} has positive and negative pins shorted together directly.`,
      componentId: component.id,
      componentLabel: label,
    });
  }

  // 3. Floating components: all pins have netId === null
  for (const comp of compList) {
    const allPinsFloating = comp.pins.every((pin) => {
      const node = nodes[pin.nodeId];
      return !node || node.netId == null;
    });
    if (comp.pins.length > 0 && allPinsFloating) {
      const label = getDesignator(comp.id);
      issues.push({
        id: `floating-${comp.id}`,
        severity: 'warn',
        message: `${label} is not connected to any net — all its pins are floating.`,
        componentId: comp.id,
        componentLabel: label,
      });
    }
  }

  // 4. Single-pin nets (isolated connection)
  const netPinCount = new Map<number, number>();
  for (const comp of compList) {
    for (const pin of comp.pins) {
      const node = nodes[pin.nodeId];
      if (!node || node.netId == null) continue;
      netPinCount.set(node.netId, (netPinCount.get(node.netId) ?? 0) + 1);
    }
  }

  for (const comp of compList) {
    for (const pin of comp.pins) {
      const node = nodes[pin.nodeId];
      if (!node || node.netId == null) continue;
      const count = netPinCount.get(node.netId) ?? 0;
      if (count === 1) {
        const label = getDesignator(comp.id);
        issues.push({
          id: `open-pin-${comp.id}-${pin.name}`,
          severity: 'info',
          message: `${label} pin \"${pin.name}\" is connected to nothing else — open circuit.`,
          componentId: comp.id,
          componentLabel: label,
        });
        break;
      }
    }
  }

  return issues;
}
