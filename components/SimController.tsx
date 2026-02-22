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
      const { type, message } = e.data as { type: string; message?: string; singular?: boolean };
      if (type === 'VOLTAGES_READY') {
        if (e.data.singular) {
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
        if (typeof message === 'string') addToast(message, 'error');
      } else if (type === 'SIM_WARN') {
        if (typeof message === 'string') addToast(message, 'warn');
      }
    };

    const arduinoWorker = (window as { arduinoWorker?: Worker }).arduinoWorker;
    if (arduinoWorker) {
      attachCrashHandlers(arduinoWorker, 'Arduino');
    }

    readyRef.current = true;

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current  = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Post netlist whenever topology changes ──────────────────────────────────
  useEffect(() => {
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
  }, [nodes, components, wires]);

  return null;
}
