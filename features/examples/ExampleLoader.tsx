'use client';

import { useEffect, useRef, useState } from 'react';
import { EXAMPLE_CIRCUITS, type ExampleCircuit } from '@/features/examples/circuits';
import { useCircuitStore } from '@/store/circuitStore';
import { useScopeStore } from '@/store/scopeStore';
import { clearChannel } from '@/features/oscilloscope/scopeBuffer';

export default function ExampleLoader() {
  const loadExample = useCircuitStore((state) => state.loadExample);
  const components  = useCircuitStore((state) => state.components);
  const wires       = useCircuitStore((state) => state.wires);
  const scopeChannels = useScopeStore((state) => state.channels);
  const removeScopeChannel = useScopeStore((state) => state.removeChannel);
  const [expanded, setExpanded] = useState(false);
  const [pendingCircuit, setPendingCircuit] = useState<ExampleCircuit | null>(null);
  const lastAutoloadRef = useRef<string | null>(null);

  const doLoad = (circuit: ExampleCircuit) => {
    // Clear oscilloscope channels before loading to avoid stale probes
    for (const ch of scopeChannels) {
      clearChannel(ch.netId);
      removeScopeChannel(ch.netId);
    }

    loadExample(circuit);
    setExpanded(false);
    setPendingCircuit(null);
  };

  const handleSelect = (circuit: ExampleCircuit) => {
    const hasContent = Object.keys(components).length > 0 || Object.keys(wires).length > 0;
    if (hasContent) {
      setPendingCircuit(circuit);
      return;
    }
    doLoad(circuit);
  };

  const confirmLoad = () => {
    if (!pendingCircuit) return;
    doLoad(pendingCircuit);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autoload = params.get('autoload');
    if (!autoload || Number.isNaN(Number(autoload))) return;
    if (lastAutoloadRef.current === autoload) return;
    const circuit = EXAMPLE_CIRCUITS[Number(autoload)];
    if (!circuit) return;
    lastAutoloadRef.current = autoload;
    doLoad(circuit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleExpanded = () => {
    setExpanded((current) => !current);
  };

  return (
    <div className="px-2 pb-2">
      <label className="px-2 block text-[11px] font-semibold uppercase tracking-wide text-white/25 mb-1">
        Load Example
      </label>
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12px] text-white/50 hover:text-white/70 hover:bg-white/[0.05] transition-colors font-medium"
      >
        <span>Load Example</span>
        <span className="text-[10px]">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div className="mt-2 grid gap-2">
          {EXAMPLE_CIRCUITS.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => handleSelect(example)}
              className="rounded-md border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.14] cursor-pointer transition-colors p-2.5 text-left"
            >
              <p className="text-[12px] font-semibold text-white">{example.name}</p>
              <p className="text-[10px] text-white/50 leading-tight">{example.description}</p>
            </button>
          ))}
        </div>
      )}
      {pendingCircuit && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          <p>
            Replace current circuit with <span className="font-semibold">{pendingCircuit.name}</span>?
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={confirmLoad}
              className="rounded border border-amber-400/50 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setPendingCircuit(null)}
              className="rounded border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10"
            >
              Keep
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
