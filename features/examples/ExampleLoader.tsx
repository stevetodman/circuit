'use client';

import { useState, type ChangeEvent } from 'react';
import { EXAMPLE_CIRCUITS, type ExampleCircuit } from '@/features/examples/circuits';
import { useCircuitStore } from '@/store/circuitStore';

export default function ExampleLoader() {
  const loadExample = useCircuitStore((state) => state.loadExample);
  const [selectedIndex, setSelectedIndex] = useState('');

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const index = event.target.value;
    setSelectedIndex(index);

    if (!index) return;

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
