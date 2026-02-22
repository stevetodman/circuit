'use client';

import { useModuleStore } from '@/store/moduleStore';
import { MODULES } from '@/features/modules/definitions';

export default function StepCard() {
  const activeModuleId = useModuleStore((s) => s.activeModuleId);
  const activeStepIndex = useModuleStore((s) => s.activeStepIndex);
  const exitModule = useModuleStore((s) => s.exitModule);

  if (!activeModuleId) return null;
  const mod = MODULES.find((m) => m.id === activeModuleId);
  if (!mod) return null;
  const step = mod.steps[activeStepIndex];
  if (!step) return null;
  const total = mod.steps.length;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-sm w-full px-4">
      <div className="bg-[#111113]/95 border border-[#7c6fff]/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {mod.steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < activeStepIndex ? 'bg-[#7c6fff]' :
                  i === activeStepIndex ? 'bg-[#7c6fff]/70' :
                    'bg-white/10'
              }`}
            />
          ))}
          <span className="text-white/30 text-[10px] font-mono ml-2 shrink-0">
            {activeStepIndex + 1}/{total}
          </span>
        </div>

        <p className="text-white/90 text-sm font-medium mb-1">{step.instruction}</p>
        {step.hint && (
          <p className="text-white/40 text-xs mt-1.5">{step.hint}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={exitModule}
            className="text-white/25 hover:text-white/50 text-xs transition-colors"
          >
            Exit lesson
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#7c6fff] animate-pulse" />
            <span className="text-white/30 text-[10px]">Watching for progress…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
