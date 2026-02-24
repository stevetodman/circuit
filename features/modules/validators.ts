import type { ValidatorState, ComponentKind } from './types';

/** True if at least one component of the given kind exists */
export function hasComponent(state: ValidatorState, kind: ComponentKind): boolean {
  return Object.values(state.components).some((c) => c.type === kind);
}

/** True if at least N components of the given kind exist */
export function hasNComponents(state: ValidatorState, kind: ComponentKind, n: number): boolean {
  return Object.values(state.components).filter((c) => c.type === kind).length >= n;
}

/** True if two components are connected (share a net via wires or breadboard) */
export function areConnected(state: ValidatorState, kindA: ComponentKind, kindB: ComponentKind): boolean {
  const compsA = Object.values(state.components).filter((c) => c.type === kindA);
  const compsB = Object.values(state.components).filter((c) => c.type === kindB);
  if (!compsA.length || !compsB.length) return false;

  const netIdsA = new Set<number>();
  for (const comp of compsA) {
    for (const pin of comp.pins) {
      const netId = state.nodes[pin.nodeId]?.netId;
      if (netId != null) netIdsA.add(netId);
    }
  }

  for (const comp of compsB) {
    for (const pin of comp.pins) {
      const netId = state.nodes[pin.nodeId]?.netId;
      if (netId != null && netIdsA.has(netId)) return true;
    }
  }

  return false;
}

/** True if the circuit has a complete path (at least one net has non-zero voltage) */
export function hasCurrentFlow(state: ValidatorState): boolean {
  return Array.from(state.voltages).some((v) => Math.abs(v) > 0.1);
}

/** True if an LED is forward biased (positive voltage across it) */
export function isLEDLit(state: ValidatorState): boolean {
  for (const comp of Object.values(state.components)) {
    if (comp.type !== 'led') continue;
    const anodePin = comp.pins.find((p) => p.name === 'anode');
    const cathodePin = comp.pins.find((p) => p.name === 'cathode');
    if (!anodePin || !cathodePin) continue;
    const va = state.nodes[anodePin.nodeId]?.netId;
    const vc = state.nodes[cathodePin.nodeId]?.netId;
    if (va == null || vc == null) continue;
    const vdrop = (state.voltages[va] ?? 0) - (state.voltages[vc] ?? 0);
    if (vdrop > 0.5) return true;
  }
  return false;
}

/** True if a resistor is in series with an LED (they share exactly one net) */
export function hasCurrentLimitingResistor(state: ValidatorState): boolean {
  return areConnected(state, 'resistor', 'led');
}

/** True if the oscilloscope has at least one channel */
export function scopeIsOpen(state: ValidatorState): boolean {
  return state.scopeChannels.length > 0;
}

/** True if the potentiometer wiper is at a non-default position */
export function potIsAdjusted(state: ValidatorState): boolean {
  return Object.values(state.components).some(
    (c) =>
      c.type === 'potentiometer' &&
      typeof c.props.wiper === 'number' &&
      c.props.wiper !== 0.5,
  );
}

/** True if switch is toggled (closed) */
export function switchIsClosed(state: ValidatorState): boolean {
  return Object.values(state.components).some(
    (c) => (c.type === 'switch' || c.type === 'tactileSwitch') && Boolean(c.props.closed),
  );
}

/** True if BJT is in circuit with LED (NPN switch demo) */
export function bjtSwitchWorks(state: ValidatorState): boolean {
  return hasComponent(state, 'bjt') && isLEDLit(state);
}

/** True if a standard diode has forward voltage drop > 0.3V */
export function isDiodeForwardBiased(state: ValidatorState): boolean {
  for (const comp of Object.values(state.components)) {
    if (comp.type !== 'diode') continue;
    const anodePin = comp.pins.find((p) => p.name === 'anode');
    const cathodePin = comp.pins.find((p) => p.name === 'cathode');
    if (!anodePin || !cathodePin) continue;
    const va = state.nodes[anodePin.nodeId]?.netId;
    const vc = state.nodes[cathodePin.nodeId]?.netId;
    if (va == null || vc == null) continue;
    if ((state.voltages[va] ?? 0) - (state.voltages[vc] ?? 0) > 0.3) return true;
  }
  return false;
}

/** True if diode is present but NOT forward conducting */
export function isDiodeBlocking(state: ValidatorState): boolean {
  return hasComponent(state, 'diode') && !isDiodeForwardBiased(state);
}

/** True if MOSFET is in the circuit */
export function hasMosfet(state: ValidatorState): boolean {
  return hasComponent(state, 'mosfet');
}

/** True if Zener diode is in the circuit */
export function hasZener(state: ValidatorState): boolean {
  return hasComponent(state, 'zener');
}
