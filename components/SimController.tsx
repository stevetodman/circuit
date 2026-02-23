'use client';

/**
 * SimController — manages the analog simulation WebWorker lifecycle.
 *
 * - Creates the SharedArrayBuffer and calls SimBridge.init() once on mount.
 * - Subscribes to circuit topology changes; posts UPDATE_NETLIST to the worker.
 * - Cleans up the worker on unmount.
 *
 * Mount this component once in app/page.tsx (outside the Canvas).
 */
import { useEffect, useRef } from 'react';
import { CIRCUIT_SAVE_KEY, useCircuitStore } from '@/store/circuitStore';
import { init as initSimBridge } from '@/simulation/SimBridge';
import { SAB_TOTAL_BYTES } from '@/types/circuit';
import { useUIStore } from '@/store/uiStore';
import { useScopeStore } from '@/store/scopeStore';
import { pushSample } from '@/features/oscilloscope/scopeBuffer';
import { branchCurrents, voltages } from '@/simulation/SimBridge';
import { buildNetlist } from '@/simulation/mna/NetlistBuilder';
import type { NetlistElement } from '@/simulation/mna/MNASolver';
import { useToastStore } from '@/store/toastStore';
import { CIRCUIT_URL_PARAM, decompressCircuit } from '@/features/sharing/circuitUrl';

interface ResistiveBranch {
  branchIndex: number;
  netA: number;
  netB: number;
}

const POWER_REFRESH_MS = 500;
const HEALTH_CHECK_INTERVAL_MS = 3000;
const FLOATING_NET_GRACE_MS = 3000;
const NO_CURRENT_VOLTAGE_EPSILON = 0.01;

const hasNonZeroVoltage = () => {
  for (let i = 0; i < voltages.length; i += 1) {
    const value = voltages[i];
    if (Number.isFinite(value) && Math.abs(value) > NO_CURRENT_VOLTAGE_EPSILON) {
      return true;
    }
  }
  return false;
};

function buildResistiveBranchMap(elements: readonly NetlistElement[]): ResistiveBranch[] {
  const branches: ResistiveBranch[] = [];
  let branchIndex = 0;

  for (const element of elements) {
    if (element.kind === 'resistor') {
      branches.push({
        branchIndex,
        netA: element.netA,
        netB: element.netB,
      });
      branchIndex += 1;
      continue;
    }

    if (element.kind === 'vsource') {
      branchIndex += 1;
    }
  }

  return branches;
}

function computeTotalDissipatedPower(
  voltageReadings: Float32Array,
  currentReadings: Float32Array,
  branches: readonly ResistiveBranch[],
): number {
  let total = 0;

  for (const branch of branches) {
    if (branch.branchIndex < 0 || branch.branchIndex >= currentReadings.length) continue;
    if (branch.netA < 0 || branch.netA >= voltageReadings.length) continue;
    if (branch.netB < 0 || branch.netB >= voltageReadings.length) continue;
    const current = currentReadings[branch.branchIndex] ?? 0;
    const a = voltageReadings[branch.netA] ?? 0;
    const b = voltageReadings[branch.netB] ?? 0;
    const drop = a - b;
    const term = Math.abs(drop * current);
    if (Number.isFinite(term)) total += term;
  }

  return total;
}

export default function SimController() {
  const workerRef = useRef<Worker | null>(null);
  const sabRef    = useRef<SharedArrayBuffer | null>(null);
  const readyRef  = useRef(false);   // true once worker is initialised
  const componentPlacedAtRef = useRef(new Map<string, number>());
  const lastHealthWarningRef = useRef<string | null>(null);
  const prevOverloadRef = useRef<string[]>([]);

  const nodes         = useCircuitStore((s) => s.nodes);
  const components    = useCircuitStore((s) => s.components);
  const wires         = useCircuitStore((s) => s.wires);
  const loadFromJSON  = useCircuitStore((s) => s.loadFromJSON);
  const setSimStatus  = useUIStore((s) => s.setSimStatus);
  const setSimError   = useUIStore((s) => s.setSimError);
  const setPower      = useUIStore((s) => s.setPower);
  const simSpeed      = useUIStore((s) => s.simSpeed);
  const simPaused     = useUIStore((s) => s.simPaused);
  const setCircuitHealthWarning = useUIStore((s) => s.setCircuitHealthWarning);
  const addToast      = useToastStore((s) => s.addToast);
  const resistorBranchesRef = useRef<ResistiveBranch[]>([]);
  const lastPowerSampleRef = useRef(0);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-load: ?c= URL param takes priority over localStorage (T1.2)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params  = new URLSearchParams(window.location.search);
    const encoded = params.get(CIRCUIT_URL_PARAM);
    if (encoded) {
      decompressCircuit(encoded)
        .then((json) => {
          loadFromJSON(json);
          // Clean the URL so refreshing doesn't re-load stale shared state
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(() => addToast('Invalid circuit link — could not decode', 'error'));
      return;
    }
    if (!window.localStorage.getItem('circuit-has-visited')) return;
    const savedJSON = window.localStorage.getItem(CIRCUIT_SAVE_KEY);
    if (savedJSON) loadFromJSON(savedJSON);
  }, [loadFromJSON, addToast]);

  // ── Create worker + SAB on mount ────────────────────────────────────────────
  useEffect(() => {
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('[SimController] SharedArrayBuffer unavailable — check COOP/COEP headers');
      return;
    }

    const sab    = new SharedArrayBuffer(SAB_TOTAL_BYTES);
    sabRef.current = sab;
    initSimBridge(sab);   // wire up main-thread typed views
    useUIStore.getState().setSAB(sab);

    const worker = new Worker(
      new URL('../simulation/workers/analog.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    const handleWorkerError = (message: string) => {
      setSimStatus('error');
      setSimError(message);
      setPower(0);
    };

    const handleWorkerMessageError = () => {
      handleWorkerError('Simulation worker crashed: failed to deserialize worker message');
    };

    const attachCrashHandlers = (workerInstance: Worker, label: string) => {
      workerInstance.onerror = (e) => {
        handleWorkerError(`Simulation ${label.toLowerCase()} worker crashed: ${e.message}`);
      };
      workerInstance.onmessageerror = () => {
        handleWorkerMessageError();
      };
    };

    attachCrashHandlers(worker, 'Analog');

    worker.onmessage = (e) => {
      const {
        type,
        message,
        singular,
        violations,
      } = e.data as {
        type: string;
        message?: string;
        singular?: boolean;
        violations?: Array<{ id: string; kind: string; value: number; limit: number }>;
      };
      if (type === 'VOLTAGES_READY') {
        if (useUIStore.getState().simStatus !== 'warn') {
          setSimStatus('running');
        }

        const { channels } = useScopeStore.getState();
        for (const ch of channels) {
          const value = voltages[ch.netId];
          if (Number.isFinite(value)) {
            pushSample(ch.netId, value);
          }
        }

        const now = performance.now();
        if (now - lastPowerSampleRef.current >= POWER_REFRESH_MS) {
          const nextPower = computeTotalDissipatedPower(
            voltages,
            branchCurrents,
            resistorBranchesRef.current,
          );
          setPower(nextPower);
          lastPowerSampleRef.current = now;
        }
      } else if (type === 'SIM_ERROR') {
        console.warn('[Sim] Solver error:', message);
        setSimStatus('error');
        setSimError(typeof message === 'string' ? message : 'Simulation error');
        setPower(0);
        useUIStore.getState().setOverloadIds([]);
        if (typeof message === 'string') addToast(message, 'error');
      } else if (type === 'SIM_NR_FAIL') {
        if (typeof message === 'string') {
          addToast(message, 'warn');
        }
        useUIStore.getState().setSimStatus('warn');
      } else if (type === 'SIM_OK') {
        if (useUIStore.getState().simStatus === 'warn') {
          setSimStatus('running');
        }
      } else if (type === 'SIM_WARN') {
        if (typeof message === 'string') addToast(message, 'warn');
      } else if (type === 'OVERLOAD') {
        const newOverloadIds = (violations ?? []).map((v) => v.id);
        const previousOverloadIds = prevOverloadRef.current;
        const newlyOverloadedIds = newOverloadIds.filter((id) => !previousOverloadIds.includes(id));

        useUIStore.getState().setOverloadIds(newOverloadIds);
        for (const id of newlyOverloadedIds) {
          const designator = useCircuitStore.getState().getDesignator(id);
          const violation = (violations ?? []).find((entry) => entry.id === id);
          if (violation) {
            const currentMa = Number.isFinite(violation.value) ? (violation.value * 1000).toFixed(0) : 'unknown';
            const limitMa = Number.isFinite(violation.limit) ? (violation.limit * 1000).toFixed(0) : 'unknown';
            const message = Number.isFinite(violation.value) && Number.isFinite(violation.limit)
              ? `${designator} overloaded: ${currentMa}mA (limit ${limitMa}mA)`
              : `${designator} overloaded — check current draw`;
            addToast(message, 'warn');
          } else {
            addToast(`${designator} overloaded — check current draw`, 'warn');
          }
        }

        prevOverloadRef.current = newOverloadIds;
      } else if (type === 'OVERLOAD_CLEAR') {
        useUIStore.getState().setOverloadIds([]);
        prevOverloadRef.current = [];
      }
    };

    const arduinoWorker = (window as { arduinoWorker?: Worker }).arduinoWorker;
    const serialOutputHandler = (e: MessageEvent) => {
      const { type, text } = e.data as { type?: string; text?: string };
      if (type === 'SERIAL_OUTPUT') {
        if (typeof text === 'string') {
          useUIStore.getState().appendSerialOutput(text);
        }
        return;
      }
      if (type === 'READY') {
        useUIStore.getState().clearSerialOutput();
      }
    };

    let currentArduinoWorker = arduinoWorker;
    const attachArduinoWorker = (nextWorker: Worker) => {
      if (currentArduinoWorker) {
        currentArduinoWorker.removeEventListener('message', serialOutputHandler);
      }
      currentArduinoWorker = nextWorker;
      nextWorker.addEventListener('message', serialOutputHandler);
      attachCrashHandlers(nextWorker, 'Arduino');
    };

    if (arduinoWorker) attachArduinoWorker(arduinoWorker);
    const arduinoWorkerPoll = setInterval(() => {
      const nextWorker = (window as { arduinoWorker?: Worker }).arduinoWorker;
      if (!nextWorker || nextWorker === currentArduinoWorker) return;
      attachArduinoWorker(nextWorker);
    }, 250);

    readyRef.current = true;

    return () => {
      worker.terminate();
      workerRef.current = null;
      clearInterval(arduinoWorkerPoll);
      if (currentArduinoWorker) {
        currentArduinoWorker.removeEventListener('message', serialOutputHandler);
      }
      readyRef.current  = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'SET_SPEED', speed: simSpeed });
  }, [simSpeed]);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: simPaused ? 'PAUSE' : 'RESUME' });
  }, [simPaused]);

  // ── Post netlist whenever topology changes ──────────────────────────────────
  const runCircuitHealthCheck = () => {
    const state = useCircuitStore.getState();
    const componentList = Object.values(state.components);
    const nodesMap = state.nodes;
    const now = Date.now();

    let warning: string | null = null;

    // 1) No current flowing (existing check with stronger copy)
    if (
      componentList.length >= 3
      && componentList.some((c) => c.type === 'battery')
      && componentList.some((c) => c.type === 'led')
      && !hasNonZeroVoltage()
    ) {
      warning = 'No current flowing — check that battery + and − both connect to the circuit';
    }

    // 2) LED without current-limiting resistor
    if (!warning) {
      const leds = componentList.filter((c) => c.type === 'led');
      if (leds.length > 0) {
        const resistorNets = new Set<number>();
        for (const resistor of componentList.filter((c) => c.type === 'resistor')) {
          for (const pin of resistor.pins) {
            const netId = nodesMap[pin.nodeId]?.netId;
            if (netId != null) resistorNets.add(netId);
          }
        }

        for (const led of leds) {
          const ledNetIds = led.pins
            .map((pin) => nodesMap[pin.nodeId]?.netId)
            .filter((netId): netId is number => netId != null);

          if (ledNetIds.length === 0) continue;
          const hasResistor = ledNetIds.some((ledNetId) => resistorNets.has(ledNetId));
          if (!hasResistor) {
            warning = 'LED connected without a resistor — add a 220–470Ω resistor to limit current';
            break;
          }
        }
      }
    }

    // 3) Short circuit (battery + and − directly connected)
    if (!warning) {
      const batteries = componentList.filter((c) => c.type === 'battery');
      for (const battery of batteries) {
        const posNet = nodesMap[battery.pins.find((pin) => pin.name === 'pos')?.nodeId ?? '']?.netId;
        const negNet = nodesMap[battery.pins.find((pin) => pin.name === 'neg')?.nodeId ?? '']?.netId;
        if (posNet != null && negNet != null && posNet === negNet) {
          warning = 'Short circuit detected — battery + and − are directly connected';
          break;
        }
      }
    }

    // 4) Floating net (with 3 s grace period for newly placed components)
    if (!warning) {
      const hasFloatingPin = componentList.length >= 2 && componentList.some((component) => {
        const placedAt = componentPlacedAtRef.current.get(component.id);
        if (!placedAt || now - placedAt < FLOATING_NET_GRACE_MS) return false;

        return component.pins.some((pin) => nodesMap[pin.nodeId]?.netId == null);
      });

      if (hasFloatingPin) {
        warning = "Some component pins aren't connected — check all pins have wires";
      }
    }

    if (warning !== lastHealthWarningRef.current) {
      lastHealthWarningRef.current = warning;
      setCircuitHealthWarning(warning);
    }
  };

  useEffect(() => {
    const now = Date.now();
    const currentComponentIds = Object.keys(useCircuitStore.getState().components);
    const seenComponentIds = componentPlacedAtRef.current;
    for (const componentId of currentComponentIds) {
      if (!seenComponentIds.has(componentId)) seenComponentIds.set(componentId, now);
    }
    for (const componentId of [...seenComponentIds.keys()]) {
      if (!currentComponentIds.includes(componentId)) seenComponentIds.delete(componentId);
    }

    lastHealthWarningRef.current = null;
    setCircuitHealthWarning(null);
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(() => {
      runCircuitHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);

    if (!readyRef.current || !workerRef.current || !sabRef.current) return;

    const netlist = buildNetlist(nodes, components, wires);
    useCircuitStore.getState().setWireBranchIndices(netlist.wireBranchIndex ?? {});
    resistorBranchesRef.current = buildResistiveBranchMap(netlist.elements);
    setPower(0);
    lastPowerSampleRef.current = 0;

    workerRef.current.postMessage({
      type:       'UPDATE_NETLIST',
      nodes,
      components,
      wires,
      sab:        sabRef.current,
    });

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
        validationTimerRef.current = null;
      }
    };
  }, [nodes, components, wires, setCircuitHealthWarning]);

  return null;
}
