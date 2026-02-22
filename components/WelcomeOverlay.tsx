'use client';

import { useEffect, useState } from 'react';

const WELCOME_DISMISSED_KEY = 'circuit-welcome-dismissed';

interface WelcomeOverlayProps {
  autoLoaded: boolean;
}

export default function WelcomeOverlay({ autoLoaded }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!autoLoaded || typeof window === 'undefined') return;
    if (localStorage.getItem(WELCOME_DISMISSED_KEY)) return;
    setVisible(true);
  }, [autoLoaded]);

  if (!visible) return null;

  const dismiss = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1');
    setVisible(false);
  };

  const openExampleLoader = () => {
    if (typeof window === 'undefined') return;

    const trigger = document.querySelector<HTMLButtonElement>('[data-example-loader-trigger]');
    if (trigger) {
      trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
      trigger.click();
    }
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#111113] p-6 shadow-2xl mx-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-white text-lg font-semibold mb-3">Welcome to Circuit Sandbox</h2>
        <ol className="space-y-2 text-sm text-white/70 mb-5">
          <li className="flex items-start gap-3"><span className="text-base">🔌</span><span>Drag parts from the left panel onto the board</span></li>
          <li className="flex items-start gap-3"><span className="text-base">⚡</span><span>Click a pin, then click another pin to wire</span></li>
          <li className="flex items-start gap-3"><span className="text-base">👁</span><span>Watch voltages update live — hover a pin to read it</span></li>
        </ol>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openExampleLoader}
            className="rounded-lg border border-white/15 bg-white/5 py-2 px-3 text-sm font-semibold text-white/85 hover:bg-white/10"
          >
            Load an Example ▾
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-[#7c6fff] hover:bg-[#9d8fff] py-2 px-3 text-sm font-semibold text-white"
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
