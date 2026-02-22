'use client';

import { memo } from 'react';
import Wire from './Wire';
import { useCircuitStore } from '@/store/circuitStore';

// P2-22: memo prevents re-render when unrelated store slices change
function WireLayer() {
  const wires             = useCircuitStore((s) => s.wires);
  const wireBranchIndices = useCircuitStore((s) => s.wireBranchIndices);

  return (
    <>
      {Object.values(wires).map((wire) => (
        <Wire key={wire.id} wire={wire} branchIndex={wireBranchIndices[wire.id]} />
      ))}
    </>
  );
}

export default memo(WireLayer);
