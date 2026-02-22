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
  const lastFloatWarnRef = useRef(0); // throttle floating-net toasts

  const nodes         = useCircuitStore((s) => s.nodes);
  const components    = useCircuitStore((s) => s.components);
  const wires         = useCircuitStore((s) => s.wires);
  const loadFromJSON  = useCircuitStore((s) => s.loadFromJSON);
  const setSimStatus  = useUIStore((s) => s.setSimStatus);
  const setSimError   = useUIStore((s) => s.setSimError);
  const setPower      = useUIStore((s) => s.setPower);
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
        if (singular) {
          setSimStatus('running');
          const now = performance.now();
          if (now - lastFloatWarnRef.current > 8000) {
            addToast('Floating net — connect all components to a ground path', 'warn');
            lastFloatWarnRef.current = now;
          }
        } else {
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
      } else if (type === 'SIM_WARN') {
        if (typeof message === 'string') addToast(message, 'warn');
      } else if (type === 'OVERLOAD') {
        useUIStore.getState().setOverloadIds((violations ?? []).map((v) => v.id));
        if (violations && violations.length > 0) {
          const worst = violations[0];
          addToast(`Overload: ${worst.kind} drawing ${worst.value.toFixed(0)}mA (limit ${worst.limit * 1000}mA)`, 'warn');
        }
      } else if (type === 'OVERLOAD_CLEAR') {
        useUIStore.getState().setOverloadIds([]);
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

  // ── Post netlist whenever topology changes ──────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !workerRef.current || !sabRef.current) return;

    // T1.7 + F6.1: pre-sim validation (debounced 2 s to avoid toast floods while building)
    if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
    validationTimerRef.current = setTimeout(() => {
      const componentList = Object.values(useCircuitStore.getState().components);
      if (componentList.length === 0) return;
      const liveNodes = useCircuitStore.getState().nodes;
      const getDesignator = useCircuitStore.getState().getDesignator;

      // F6.1: warn about floating (off-board) pins
      const floating = componentList.filter((c) =>
        c.pins.some((pin) => !pin.nodeId || liveNodes[pin.nodeId]?.netId === null)
      );
      if (floating.length > 0) {
        const labels = floating.slice(0, 2).map((c) => getDesignator(c.id)).join(', ');
        const suffix = floating.length > 2 ? ` +${floating.length - 2} more` : '';
        addToast(`Unconnected pin on ${labels}${suffix} — place on the breadboard`, 'warn');
      }

      // T1.7a: warn if no voltage source is present
      const hasVSource = componentList.some((c) => c.type === 'battery');
      if (!hasVSource && componentList.length > 1) {
        addToast('No battery in circuit — add a battery to power it', 'warn');
      } else if (hasVSource) {
        // T1.7b: warn if battery exists but no ground rail is connected
        const hasGround = Object.values(liveNodes).some((n) => n.netId === 0);
        if (!hasGround) {
          addToast('No ground — connect the battery negative (–) to the board', 'warn');
        }
      }
    }, 2000);

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
  }, [nodes, components, wires, addToast]);

  return null;
}
