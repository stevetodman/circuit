'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
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

  // ?autoload=N — auto-load example N on mount (used for screenshots/testing)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idx = params.get('autoload');
    if (idx === null) return;
    const circuit = EXAMPLE_CIRCUITS[Number(idx)];
    if (circuit) loadExample(circuit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const index = event.target.value;
    setSelectedIndex(index);

    if (!index) return;

    // Confirm before overwriting a non-empty circuit
    const hasContent = Object.keys(components).length > 0 || Object.keys(wires).length > 0;
    if (hasContent) {
      if (!window.confirm('Load example? This will clear your current circuit.')) {
        setSelectedIndex('');
        return;
      }
    }

    // Clear oscilloscope channels before loading to avoid stale probes
    for (const ch of scopeChannels) {
      clearChannel(ch.netId);
      removeScopeChannel(ch.netId);
    }

    const circuit: ExampleCircuit = EXAMPLE_CIRCUITS[Number(index)];
    loadExample(circuit);
    setSelectedIndex('');
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
      {selectedIndex && (
        <p className="px-1 pt-1.5 text-[11px] text-white/55 leading-tight">
          {EXAMPLE_CIRCUITS[Number(selectedIndex)]?.description}
        </p>
      )}
    </div>
  );
}
