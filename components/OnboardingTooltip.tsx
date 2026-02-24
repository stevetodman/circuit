'use client';

import { useEffect, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';

export default function OnboardingTooltip() {
  const [step, setStep] = useState<1 | 2 | 'done'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('circuit-onboarded')) return 'done';
    return 1;
  });
  const components = useCircuitStore((s) => s.components);

  useEffect(() => {
    if (step === 1 && Object.keys(components).length > 0) {
      setStep(2);
    }
  }, [components, step]);

  const dismiss = () => {
    localStorage.setItem('circuit-onboarded', '1');
    setStep('done');
  };

  if (step === 'done') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {step === 1 && (
        <div
          className="absolute bottom-24 left-[50%] -translate-x-1/2 pointer-events-auto"
          style={{ animation: 'toastIn 0.4s ease-out both' }}
        >
          <div className="relative bg-[#18181c] border border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] px-5 py-4 max-w-[280px] text-center">
            <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 border-y-8 border-y-transparent border-r-8 border-r-[#18181c]" />
            <div className="text-2xl mb-2">👋</div>
            <p className="text-white/80 text-[13px] font-medium mb-1">Welcome to Circuit Simulator</p>
            <p className="text-white/45 text-[11px] mb-3">
              Drag a component from the panel on the left to get started. Press
              <kbd className="text-[10px] bg-white/10 rounded px-1 py-0.5 ml-1">?</kbd>
              for keyboard shortcuts.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full text-[12px] py-1.5 rounded-lg bg-[#7c6fff]/20 text-[#b8b0ff] hover:bg-[#7c6fff]/35 transition-colors"
            >
              Got it →
            </button>
          </div>
        </div>
      )}
      {step === 2 && (
        <div
          className="absolute bottom-24 left-[50%] -translate-x-1/2 pointer-events-auto"
          style={{ animation: 'toastIn 0.4s ease-out both' }}
        >
          <div className="relative bg-[#18181c] border border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] px-5 py-4 max-w-[280px] text-center">
            <span className="absolute left-[calc(50%-8px)] top-full border-x-8 border-x-transparent border-t-8 border-t-[#18181c]" />
            <div className="text-2xl mb-2">🔌</div>
            <p className="text-white/80 text-[13px] font-medium mb-1">Now wire it up</p>
            <p className="text-white/45 text-[11px] mb-3">
              Click any pin hole on the breadboard to start drawing a wire. Click a second pin to connect them.
            </p>
            <button
              onClick={dismiss}
              className="w-full text-[12px] py-1.5 rounded-lg bg-[#22cc66]/15 text-[#6fffaa] hover:bg-[#22cc66]/25 transition-colors"
            >
              Got it ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
