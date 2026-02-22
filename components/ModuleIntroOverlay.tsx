'use client';

import { useEffect, useState } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES } from '@/features/modules/definitions';

export default function ModuleIntroOverlay() {
  const { activeModuleId, activeStepIndex } = useModuleStore((s) => ({
    activeModuleId: s.activeModuleId,
    activeStepIndex: s.activeStepIndex,
  }));
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when a new module starts
  useEffect(() => {
    setDismissed(false);
  }, [activeModuleId]);

  if (!activeModuleId || activeStepIndex > 0 || dismissed) return null;
  const mod = MODULES.find((m) => m.id === activeModuleId);
  if (!mod) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="bg-[#111113] border border-white/[0.12] rounded-xl p-7 max-w-md shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#7c6fff] mb-2">
          Module {mod.title.split('.')[0].replace(/\D/g, '')}
        </p>
        <h2 className="text-white text-xl font-semibold mb-1">{mod.title.split('. ')[1]}</h2>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">{mod.concept}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-full bg-[#7c6fff] hover:bg-[#6b5fee] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Start Building →
        </button>
      </div>
    </div>
  );
}
