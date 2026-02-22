'use client';

import Wire from './Wire';
import { useCircuitStore } from '@/store/circuitStore';

export default function WireLayer() {
  const wires = useCircuitStore((s) => s.wires);

  return (
    <>
      {Object.values(wires).map((wire, index) => (
        <Wire key={wire.id} wire={wire} branchIndex={index} />
      ))}
    </>
  );
}
