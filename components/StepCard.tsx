'use client';

import { useEffect, useState } from 'react';
import { MODULES } from '@/features/modules/definitions';
import { useModuleStore } from '@/store/moduleStore';

const SPOTLIGHT_LABELS = {
  'sidebar-parts': 'Use the Parts panel on the left',
  'breadboard': 'Work on the breadboard above',
  'oscilloscope': 'Open the oscilloscope (key O)',
  'properties': 'Check the Properties panel on the left',
} as const;

const SPOTLIGHT_ARROWS = {
  'sidebar-parts': '←',
  'breadboard': '↑',
  'oscilloscope': '◎',
  'properties': '←',
} as const;

export default function StepCard() {
  const activeModule = useModuleStore((s) => s.activeModule);
  const activeModuleId = useModuleStore((s) => s.activeModuleId);
  const activeStepIndex = useModuleStore((s) => s.activeStepIndex);
  const activeStep = useModuleStore((s) => s.activeStep);
  const skippedStepIndices = useModuleStore((s) => s.skippedStepIndices);
  const justCompleted = useModuleStore((s) => s.justCompleted);
  const completedModuleIds = useModuleStore((s) => s.completedModuleIds);
  const exitModule = useModuleStore((s) => s.exitModule);
  const validationFailed = useModuleStore((s) => s.validationFailed);
  const startModule = useModuleStore((s) => s.startModule);
  const skipStep = useModuleStore((s) => s.skipStep);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintPulse, setHintPulse] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [completedModuleTitle, setCompletedModuleTitle] = useState<string | null>(null);

  useEffect(() => {
    setHintVisible(false);
    setConfirmSkip(false);
    setHintPulse(false);
  }, [activeModuleId, activeStepIndex]);

  useEffect(() => {
    if (!activeStep?.hint) return;
    const timer = setTimeout(() => {
      setHintVisible(true);
      setHintPulse(true);
    }, 5_000);
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
              className={`h-1 flex-1 rounded-full transition-colors ${i < activeStepIndex
                ? skippedStepIndices.includes(i) ? 'bg-amber-400' : 'bg-[#7c6fff]'
                : i === activeStepIndex ? 'bg-[#7c6fff]/70'
                  : 'bg-white/10'}`}
            />
          ))}
          <span className="text-white/30 text-[10px] font-mono ml-2 shrink-0">
            {activeStepIndex + 1}/{total}
          </span>
        </div>

        <p className="text-white/90 text-sm font-medium mb-1">{step.instruction}</p>
        {!confirmSkip ? (
          <button
            type="button"
            onClick={() => setConfirmSkip(true)}
            className="text-white/20 hover:text-amber-400/60 text-[10px] transition-colors mt-1"
          >
            Skip this step
          </button>
        ) : (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-white/40">Skip this step?</span>
            <button
              type="button"
              onClick={() => {
                skipStep();
                setConfirmSkip(false);
              }}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 hover:bg-amber-800/50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setConfirmSkip(false)}
              className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        )}
        {step.spotlightTarget && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#7c6fff]/15 animate-ping" />
              <span className="relative text-[#7c6fff] text-sm leading-none animate-bounce">
                {SPOTLIGHT_ARROWS[step.spotlightTarget]}
              </span>
            </div>
            <span className="text-[#7c6fff]/80 text-[10px]">{SPOTLIGHT_LABELS[step.spotlightTarget]}</span>
          </div>
        )}
        {step.hint && (
          <div>
            <button
              type="button"
              onClick={() => setHintVisible((v) => !v)}
              className={`text-white/55 hover:text-white/85 text-[11px] transition-colors relative ${hintPulse && !hintVisible ? 'text-amber-400/80' : ''}`}
            >
              {hintPulse && !hintVisible && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
              Need a hint?
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${hintVisible ? 'max-h-40 opacity-100 mt-1.5' : 'max-h-0 opacity-0'}`}>
              <p className="text-white/40 text-xs">{step.hint}</p>
            </div>
          </div>
        )}

        {validationFailed && (
          <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
            <p className="text-amber-300/80 text-[11px] leading-snug">
              {step.failHint
                ? `Not quite — ${step.failHint}`
                : 'Not quite — check your circuit and try again'}
            </p>
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
