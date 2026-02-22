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
import { voltages } from '@/simulation/SimBridge';
import { buildNetlist } from '@/simulation/mna/NetlistBuilder';
import { useToastStore } from '@/store/toastStore';

export default function SimController() {
  const workerRef = useRef<Worker | null>(null);
  const sabRef    = useRef<SharedArrayBuffer | null>(null);
  const readyRef  = useRef(false);   // true once worker is initialised

  const nodes         = useCircuitStore((s) => s.nodes);
  const components    = useCircuitStore((s) => s.components);
  const wires         = useCircuitStore((s) => s.wires);
  const loadFromJSON  = useCircuitStore((s) => s.loadFromJSON);
  const setSimStatus  = useUIStore((s) => s.setSimStatus);
  const addToast      = useToastStore((s) => s.addToast);

  // Auto-load circuit from localStorage on mount (P0-1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedJSON = window.localStorage.getItem(CIRCUIT_SAVE_KEY);
    if (!savedJSON) return;
    loadFromJSON(savedJSON);
  }, [loadFromJSON]);

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

    worker.onmessage = (e) => {
      const { type, message } = e.data as { type: string; message?: string; singular?: boolean };
      if (type === 'VOLTAGES_READY') {
        if (e.data.singular) {
          setSimStatus('error', 'Floating net');
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
      } else if (type === 'SIM_ERROR') {
        console.warn('[Sim] Solver error:', message);
        setSimStatus('error', message);
        if (typeof message === 'string') addToast(message, 'error');
      } else if (type === 'SIM_WARN') {
        if (typeof message === 'string') addToast(message, 'warn');
      }
    };

    worker.onerror = (err) => {
      console.error('[SimController] Worker crashed:', err.message);
    };

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
