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
import { useCircuitStore } from '@/store/circuitStore';
import { init as initSimBridge } from '@/simulation/SimBridge';
import { SAB_TOTAL_BYTES } from '@/types/circuit';
import { useUIStore } from '@/store/uiStore';
import { useScopeStore } from '@/store/scopeStore';
import { pushSample } from '@/features/oscilloscope/scopeBuffer';
import { voltages } from '@/simulation/SimBridge';

export default function SimController() {
  const workerRef = useRef<Worker | null>(null);
  const sabRef    = useRef<SharedArrayBuffer | null>(null);
  const readyRef  = useRef(false);   // true once worker is initialised

  const nodes         = useCircuitStore((s) => s.nodes);
  const components    = useCircuitStore((s) => s.components);
  const setSimStatus  = useUIStore((s) => s.setSimStatus);

  // ── Create worker + SAB on mount ────────────────────────────────────────────
  useEffect(() => {
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('[SimController] SharedArrayBuffer unavailable — check COOP/COEP headers');
      return;
    }

    const sab    = new SharedArrayBuffer(SAB_TOTAL_BYTES);
    sabRef.current = sab;
    initSimBridge(sab);   // wire up main-thread typed views

    const worker = new Worker(
      new URL('../simulation/workers/analog.worker.ts', import.meta.url),
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, message } = e.data as { type: string; message?: string };
      if (type === 'VOLTAGES_READY') {
        setSimStatus('running');
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

    workerRef.current.postMessage({
      type:       'UPDATE_NETLIST',
      nodes,
      components,
      sab:        sabRef.current,
    });
  }, [nodes, components]);

  return null;
}
