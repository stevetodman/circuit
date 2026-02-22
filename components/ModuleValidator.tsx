'use client';

import { useEffect, useRef } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useScopeStore } from '@/store/scopeStore';
import { voltageView } from '@/simulation/SimBridge';
import { MODULES } from '@/features/modules/definitions';

export default function ModuleValidator() {
  const { activeModuleId, activeStepIndex, advanceStep } = useModuleStore((s) => ({
    activeModuleId: s.activeModuleId,
    activeStepIndex: s.activeStepIndex,
    advanceStep: s.advanceStep,
  }));
  const stepRef = useRef({ moduleId: activeModuleId, stepIndex: activeStepIndex });
  stepRef.current = { moduleId: activeModuleId, stepIndex: activeStepIndex };

  useEffect(() => {
    if (!activeModuleId) return;

    const interval = setInterval(() => {
      const { moduleId, stepIndex } = stepRef.current;
      if (!moduleId) return;

      const mod = MODULES.find((m) => m.id === moduleId);
      const step = mod?.steps[stepIndex];
      if (!step) return;

      // Build validator state snapshot
      const { components, nodes, wires } = useCircuitStore.getState();
      const scopeChannels = useScopeStore.getState().channels;

      const state = {
        components: Object.fromEntries(
          Object.entries(components).map(([id, c]) => [id, {
            type: c.type,
            props: c.props,
            pins: c.pins,
          }]),
        ),
        nodes: Object.fromEntries(
          Object.entries(nodes).map(([id, n]) => [id, { netId: n.netId }]),
        ),
        wires,
        voltages: voltageView,
        scopeChannels: scopeChannels.map((ch) => ({ netId: ch.netId })),
      };

      if (step.validate(state)) {
        advanceStep();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [activeModuleId, advanceStep]);

  return null; // no visual output
}
