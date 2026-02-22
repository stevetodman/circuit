/**
 * Analog simulation worker.
 *
 * Receives UPDATE_NETLIST messages from the main thread, runs a DC or
 * transient operating-point solve, then writes net voltages into the shared
 * buffer so the main thread can read them.
 *
 * Message protocol (main → worker):
 *   { type: 'UPDATE_NETLIST', nodes, components, wires, sab }
 *
 * Message protocol (worker → main):
 *   { type: 'VOLTAGES_READY', singular?: boolean }
 *   { type: 'OVERLOAD', violations: Array<{ id: string; kind: string; value: number; limit: number }> }
 *   { type: 'OVERLOAD_CLEAR' }
 *   { type: 'SIM_ERROR', message: string }
 */
import { buildNetlist } from '../mna/NetlistBuilder';
import { solveDC, type Netlist, type NetlistElement, type SolveResult } from '../mna/MNASolver';
import type { CircuitNode, PlacedComponent, Wire } from '../../types/circuit';
import {
  MAX_NETS, MAX_BRANCHES,
  SAB_VOLTAGE_OFFSET, SAB_CURRENT_OFFSET, SAB_TIMESTAMP_OFFSET,
} from '../../types/circuit';

const DT_MS = 1;
const OVERLOAD_THROTTLE_MS = 1_000;
const RESISTOR_POWER_LIMIT_W = 0.25;
const LED_CURRENT_LIMIT_A = 0.03;
const DIODE_CURRENT_LIMIT_A = 1;
const WIRE_CURRENT_LIMIT_A = 2;

type DiodeKind = 'diode' | 'led';

interface OverloadViolation {
  id: string;
  kind: string;
  value: number;
  limit: number;
}

interface UpdateNetlistMsg {
  type:       'UPDATE_NETLIST';
  nodes:      Record<string, CircuitNode>;
  components: Record<string, PlacedComponent>;
  wires:      Record<string, Wire>;
  sab:        SharedArrayBuffer;
}

function buildComponentKindByElementId(
  components: Record<string, PlacedComponent>,
): Record<string, DiodeKind> {
  const out: Record<string, DiodeKind> = {};
  for (const component of Object.values(components)) {
    if (component.type === 'led') {
      out[component.id] = 'led';
      continue;
    }

    if (component.type === 'diode' || component.type === 'schottky' || component.type === 'zener') {
      out[component.id] = 'diode';
      if (component.type === 'zener') {
        out[`${component.id}-fwd`] = 'diode';
        out[`${component.id}-rev`] = 'diode';
      }
    }
  }

  return out;
}

function buildBranchIndexByElementId(elements: readonly NetlistElement[]): Record<string, number> {
  let branchIndex = 0;
  const map: Record<string, number> = {};

  for (const element of elements) {
    if (
      element.kind === 'resistor' ||
      element.kind === 'vsource' ||
      element.kind === 'opamp' ||
      element.kind === 'inductor' ||
      element.kind === 'diode'
    ) {
      map[element.id] = branchIndex;
      branchIndex += 1;
    }
  }

  return map;
}

function getDiodeKind(elementId: string, kinds: Record<string, DiodeKind>): DiodeKind {
  return kinds[elementId] ?? 'diode';
}

function gatherOverloadViolations(
  netlist: Netlist,
  voltages: Float32Array,
  branchCurrents: Float32Array,
  branchIndexByElementId: Record<string, number>,
  diodeKindByElementId: Record<string, DiodeKind>,
): OverloadViolation[] {
  const violations: OverloadViolation[] = [];

  for (const element of netlist.elements) {
    if (element.kind === 'resistor') {
      const vA = element.netA >= 0 && element.netA < voltages.length ? voltages[element.netA] : 0;
      const vB = element.netB >= 0 && element.netB < voltages.length ? voltages[element.netB] : 0;
      const drop = vA - vB;
      const power = (drop * drop) / Math.max(element.value, 1e-12);
      if (power > RESISTOR_POWER_LIMIT_W && Number.isFinite(power)) {
        const branchIndex = branchIndexByElementId[element.id];
        const branchCurrent = Math.abs(branchCurrents[branchIndex] ?? drop / Math.max(element.value, 1e-12));
        violations.push({
          id: element.id,
          kind: 'resistor',
          value: branchCurrent * 1000,
          limit: Math.sqrt(RESISTOR_POWER_LIMIT_W / Math.max(element.value, 1e-12)),
        });
      }
      continue;
    }

    if (element.kind !== 'diode') continue;

    const branchIndex = branchIndexByElementId[element.id];
    const branchCurrent = Math.abs(branchCurrents[branchIndex] ?? 0);
    const kind = getDiodeKind(element.id, diodeKindByElementId);
    const limit = kind === 'led' ? LED_CURRENT_LIMIT_A : DIODE_CURRENT_LIMIT_A;
    if (branchCurrent > limit) {
      violations.push({
        id: element.id,
        kind,
        value: branchCurrent * 1000,
        limit,
      });
    }
  }

  for (const [wireId, wireBranchIndex] of Object.entries(netlist.wireBranchIndex ?? {})) {
    const branchIndex = Number(wireBranchIndex);
    if (!Number.isFinite(branchIndex)) continue;
    const current = Math.abs(branchCurrents[branchIndex] ?? 0);
    if (current > WIRE_CURRENT_LIMIT_A) {
      violations.push({
        id: wireId,
        kind: 'wire',
        value: current * 1000,
        limit: WIRE_CURRENT_LIMIT_A,
      });
    }
  }

  return violations.sort((a, b) => (b.value / b.limit) - (a.value / a.limit));
}

interface Timer555Model {
  outNetId:  number;
  vccNetId:  number;
  frequency: number;
  startedAt: number;
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentNetlist: Netlist | null = null;
let netlistNeedsTransientLoop = false;
let prevVoltages: Float32Array | null = null;
let prevInductorCurrents: Record<string, number> = {};
let timer555Components: Timer555Model[] = [];
// P1-12: cumulative sim time — avoids wall-clock drift under CPU load
let simTimeMs = 0;
let lastOverloadPostMs = 0;

let voltageView: Float32Array | null = null;
let branchCurrentView: Float32Array | null = null;
let timestampView: Float64Array | null = null;
let branchIndexByElementId: Record<string, number> = {};
let diodeKindByElementId: Record<string, DiodeKind> = {};

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function pinNet(
  nodes: Record<string, CircuitNode>,
  comp: PlacedComponent,
  pinName: string,
): number | null {
  const pin = comp.pins.find((p) => p.name === pinName);
  if (!pin) return null;
  const node = nodes[pin.nodeId];
  return node?.netId ?? null;
}

function loadTimerModels(
  nodes: Record<string, CircuitNode>,
  components: Record<string, PlacedComponent>,
): Timer555Model[] {
  const timers: Timer555Model[] = [];

  for (const comp of Object.values(components)) {
    if (comp.type !== 'timer555') continue;
    const outNetId = pinNet(nodes, comp, 'out');
    const vccNetId = pinNet(nodes, comp, 'vcc');
    if (outNetId == null || vccNetId == null) continue;

    const r1          = asNumber(comp.props.r1, 1000);
    const r2          = asNumber(comp.props.r2, 1000);
    const capacitance = asNumber(comp.props.capacitance, 1) * 1e-6;
    const denominator = (r1 + 2 * r2) * capacitance;
    const frequency   = denominator > 0 ? 1.44 / denominator : 0;
    timers.push({ outNetId, vccNetId, frequency, startedAt: simTimeMs });
  }

  return timers;
}

function writeVoltages(voltages: Float32Array): void {
  if (!voltageView) return;
  voltageView.fill(0);
  const len = Math.min(voltages.length, MAX_NETS);
  for (let i = 0; i < len; i++) voltageView[i] = voltages[i];
}

function writeBranchCurrents(currents: Float32Array): void {
  if (!branchCurrentView) return;
  branchCurrentView.fill(0);
  const len = Math.min(currents.length, MAX_BRANCHES);
  for (let i = 0; i < len; i++) branchCurrentView[i] = currents[i];
}

function applyTimerOutputs(now: number): void {
  if (!voltageView || timer555Components.length === 0) return;

  for (const timer of timer555Components) {
    if (timer.outNetId < 0 || timer.outNetId >= MAX_NETS) continue; // P0-2: bounds guard
    if (timer.frequency <= 0) {
      voltageView[timer.outNetId] = 0;
      continue;
    }
    const periodMs = 1000 / timer.frequency;
    const phase    = (now - timer.startedAt) / periodMs;
    const high     = (phase % 1) > 0.5;
    const vcc      = timer.vccNetId >= 0 && timer.vccNetId < MAX_NETS
      ? voltageView[timer.vccNetId]
      : 0;
    voltageView[timer.outNetId] = high ? vcc : 0;
  }
}

function publishOverload(result: SolveResult | null): void {
  const now = Date.now();
  if (now - lastOverloadPostMs < OVERLOAD_THROTTLE_MS) return;

  if (!currentNetlist || !branchCurrentView) {
    lastOverloadPostMs = now;
    self.postMessage({ type: 'OVERLOAD_CLEAR' });
    return;
  }

  if (!result) {
    lastOverloadPostMs = now;
    self.postMessage({ type: 'OVERLOAD_CLEAR' });
    return;
  }

  const violations = gatherOverloadViolations(
    currentNetlist,
    result.voltages,
    result.branchCurrents,
    branchIndexByElementId,
    diodeKindByElementId,
  );

  lastOverloadPostMs = now;
  if (violations.length > 0) {
    self.postMessage({ type: 'OVERLOAD', violations });
  } else {
    self.postMessage({ type: 'OVERLOAD_CLEAR' });
  }
}

function tick(): void {
  if (!currentNetlist || !voltageView) return;
  // P1-12: advance cumulative sim time rather than using wall clock
  simTimeMs += DT_MS;

  if (netlistNeedsTransientLoop) {
    const result = solveDC(
      currentNetlist,
      DT_MS / 1000,
      prevVoltages ?? undefined,
      prevInductorCurrents,
    );
    if (!result) {
      publishOverload(null);
      return;
    }

    prevVoltages = result.voltages;
    prevInductorCurrents = result.inductorCurrents ?? {};
    writeVoltages(result.voltages);
    writeBranchCurrents(result.branchCurrents);
    publishOverload(result);
  } else if (prevVoltages) {
    writeVoltages(prevVoltages);
  }

  applyTimerOutputs(simTimeMs);
  if (timestampView) timestampView[0] = simTimeMs / 1000; // SAB timestamp in seconds
  self.postMessage({ type: 'VOLTAGES_READY', singular: false });
}

function startLoop() {
  if (intervalId) return;
  intervalId = setInterval(tick, DT_MS);
}

function stopLoop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

self.onmessage = (e: MessageEvent<UpdateNetlistMsg>) => {
  const msg = e.data;
  if (msg.type !== 'UPDATE_NETLIST') return;

  if (!voltageView || voltageView.buffer !== msg.sab) {
    voltageView       = new Float32Array(msg.sab, SAB_VOLTAGE_OFFSET, MAX_NETS);
    branchCurrentView = new Float32Array(msg.sab, SAB_CURRENT_OFFSET, MAX_BRANCHES);
    timestampView     = new Float64Array(msg.sab, SAB_TIMESTAMP_OFFSET, 1);
  }

  try {
    simTimeMs             = 0; // P1-12: reset cumulative time on new netlist
    lastOverloadPostMs    = 0;
    currentNetlist        = buildNetlist(msg.nodes, msg.components, msg.wires);
    branchIndexByElementId = buildBranchIndexByElementId(currentNetlist.elements);
    diodeKindByElementId  = buildComponentKindByElementId(msg.components);
    netlistNeedsTransientLoop = currentNetlist.elements.some((el) =>
      el.kind === 'capacitor' || el.kind === 'inductor',
    );
    timer555Components    = loadTimerModels(msg.nodes, msg.components);

    const result  = solveDC(currentNetlist, undefined, undefined, undefined);
    prevVoltages  = result ? result.voltages : null;
    prevInductorCurrents = result?.inductorCurrents ?? {};

    if (result) {
      writeVoltages(result.voltages);
      writeBranchCurrents(result.branchCurrents);
      if (!result.converged) { // P1-15: surface NR non-convergence to main thread
        self.postMessage({ type: 'SIM_WARN', message: 'Simulation may be inaccurate: Newton-Raphson solver did not converge. Check diode/BJT connections.' });
      }
      publishOverload(result);
    } else {
      voltageView?.fill(0);
      branchCurrentView?.fill(0);
      publishOverload(null);
    }

    applyTimerOutputs(simTimeMs);

    if (netlistNeedsTransientLoop || timer555Components.length > 0) {
      startLoop();
      tick();
    } else {
      stopLoop();
      self.postMessage({ type: 'VOLTAGES_READY', singular: false });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    voltageView?.fill(0);
    branchCurrentView?.fill(0);
    self.postMessage({ type: 'SIM_ERROR', message });
    lastOverloadPostMs = Date.now();
    self.postMessage({ type: 'OVERLOAD_CLEAR' });
  }
};
