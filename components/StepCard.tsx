'use client';

import { useEffect, useState } from 'react';
import { MODULES } from '@/features/modules/definitions';
import { useModuleStore } from '@/store/moduleStore';

const SPOTLIGHT_LABELS = {
  'sidebar-parts': '← Add a component from the Parts panel',
  'breadboard': '↑ Place it on the breadboard',
  'oscilloscope': 'Open the oscilloscope (key O)',
  'properties': '← Check the Properties inspector',
} as const;

export default function StepCard() {
  const activeModule = useModuleStore((s) => s.activeModule);
  const activeModuleId = useModuleStore((s) => s.activeModuleId);
  const activeStepIndex = useModuleStore((s) => s.activeStepIndex);
  const activeStep = useModuleStore((s) => s.activeStep);
  const justCompleted = useModuleStore((s) => s.justCompleted);
  const completedModuleIds = useModuleStore((s) => s.completedModuleIds);
  const exitModule = useModuleStore((s) => s.exitModule);
  const validationFailed = useModuleStore((s) => s.validationFailed);
  const startModule = useModuleStore((s) => s.startModule);
  const [hintVisible, setHintVisible] = useState(false);
  const [completedModuleTitle, setCompletedModuleTitle] = useState<string | null>(null);

  useEffect(() => {
    setHintVisible(false);
  }, [activeModuleId, activeStepIndex]);

  useEffect(() => {
    if (!activeStep?.hint) return;
    const timer = setTimeout(() => setHintVisible(true), 15_000);
    return () => clearTimeout(timer);
  }, [activeModuleId, activeStepIndex, activeStep?.hint]);

  useEffect(() => {
    if (activeModule?.title) {
      setCompletedModuleTitle(activeModule.title);
    }
  }, [activeModule]);

  if (!activeModuleId && !justCompleted) return null;
  if (!activeModule && !justCompleted) return null;

  const modTitle = activeModule?.title ?? completedModuleTitle ?? '';
  const nextModule = MODULES.find(
    (m) => !completedModuleIds.includes(m.id) && m.id !== activeModuleId
  );

  if (justCompleted) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-sm w-full px-4">
        <div className="bg-[#111113]/95 border border-[#7c6fff]/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm text-center">
          <div className="text-[#7c6fff] text-xl leading-none">✓</div>
          <p className="text-white/95 text-sm font-semibold mt-2">Module complete!</p>
          <p className="text-white/75 text-sm mt-1">{modTitle}</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              type="button"
              onClick={exitModule}
              className="text-white/35 hover:text-white/60 text-xs transition-colors"
            >
              Done
            </button>
            {nextModule && (
              <button
                type="button"
                onClick={() => startModule(nextModule.id)}
                className="text-[#7c6fff] hover:text-[#9b8fff] text-xs font-medium transition-colors"
              >
                {nextModule.title} →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!activeStep || !activeModule) return null;
  const total = activeModule.steps.length;

  const step = activeStep;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto max-w-sm w-full px-4">
      <div className="bg-[#111113]/95 border border-[#7c6fff]/40 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {activeModule.steps.map((_, i) => (
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
        {step.spotlightTarget && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-[#7c6fff]/10 border border-[#7c6fff]/20 rounded-full px-2.5 py-0.5">
            <span className="text-[#7c6fff]/80 text-[10px]">{SPOTLIGHT_LABELS[step.spotlightTarget]}</span>
          </div>
        )}
        {step.hint && (
          <div>
            <button
              type="button"
              onClick={() => setHintVisible((v) => !v)}
              className="text-white/55 hover:text-white/85 text-[11px] transition-colors"
            >
              Need a hint?
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${hintVisible ? 'max-h-40 opacity-100 mt-1.5' : 'max-h-0 opacity-0'}`}>
              <p className="text-white/40 text-xs">{step.hint}</p>
            </div>
          </div>
        )}

        {validationFailed && step.failHint && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <p className="text-amber-300/80 text-[11px] leading-snug">Not quite — {step.failHint}</p>
          </div>
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
