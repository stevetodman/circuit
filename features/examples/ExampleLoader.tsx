'use client';

import { useState, type ChangeEvent } from 'react';
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
  const [selectedIndex, setSelectedIndex] = useState('');
  const [pendingIndex, setPendingIndex] = useState('');

  const hasContent = Object.keys(components).length > 0 || Object.keys(wires).length > 0;

  const loadExampleNow = (index: string) => {
    // Clear oscilloscope channels before loading to avoid stale probes
    for (const ch of scopeChannels) {
      clearChannel(ch.netId);
      removeScopeChannel(ch.netId);
    }

    const circuit: ExampleCircuit = EXAMPLE_CIRCUITS[Number(index)];
    loadExample(circuit);
    setSelectedIndex('');
    setPendingIndex('');
  };

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const index = event.target.value;
    setSelectedIndex(index);

    if (!index) {
      setPendingIndex('');
      return;
    }

    if (hasContent) {
      setPendingIndex(index);
      return;
    }

    loadExampleNow(index);
  };

  const onCancelLoad = () => {
    setPendingIndex('');
    setSelectedIndex('');
  };

  const onConfirmLoad = () => {
    if (!pendingIndex) return;
    loadExampleNow(pendingIndex);
  };

  return (
    <div className="px-2 pb-2">
      <label className="px-2 block text-[11px] font-semibold uppercase tracking-wide text-white/25 mb-1">
        Load Example
      </label>
      <select
        value={selectedIndex}
        onChange={onChange}
        className="w-full rounded border border-white/15 bg-[#1b1b1d] text-white px-2 py-1.5 text-sm"
      >
        <option value="" className="text-black">Select example…</option>
        {EXAMPLE_CIRCUITS.map((example, index) => (
          <option key={example.name} value={String(index)}>
            {example.name}
          </option>
        ))}
      </select>
      {pendingIndex && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          This will replace your current circuit.
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelLoad}
              className="px-2 py-1 rounded text-[10px] text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmLoad}
              className="px-2 py-1 rounded text-[10px] text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 font-semibold"
            >
              Load anyway
            </button>
          </div>
        </div>
      )}
      {selectedIndex && (
        <p className="px-1 pt-1.5 text-[11px] text-white/55 leading-tight">
          {EXAMPLE_CIRCUITS[Number(selectedIndex)]?.description}
        </p>
      )}
    </div>
  );
}
