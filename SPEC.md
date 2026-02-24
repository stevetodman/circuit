# P6.a — Onboarding Tooltip Sequence

## Goal
Show a brief 2-step guided overlay to first-time visitors that smoothly introduces the app without blocking the UI.

## Acceptance Criteria
1. On first visit (no `circuit-onboarded` in localStorage), show step 1 of the overlay
2. Step 1: empty canvas hint — floating card bottom-center pointing ← at the sidebar with text "Drag a component from the panel to get started" + "Press ? for keyboard shortcuts" + a "Got it →" button
3. Step 2: shown automatically after the user places their first component (circuitStore.components goes from empty to non-empty) — floating card pointing ↓ at the breadboard with text "Click any pin hole to start drawing a wire" + a "Got it ✓" button
4. After step 2 "Got it", write `localStorage.setItem('circuit-onboarded', '1')` and never show again
5. "Got it →" on step 1 advances to step 2 immediately (skip step 1 without waiting)
6. Overlay is pointer-events-none on the backdrop; only the card is interactive
7. Cards fade in with `toastIn` CSS animation (already in globals.css)
8. No new Zustand store needed — use local `useState` in the component

## Files to Create
- `components/OnboardingTooltip.tsx` — new component

## Files to Modify
- `app/page.tsx` — import and render `<OnboardingTooltip />` (dynamic import, ssr:false)

## Implementation Details

### `components/OnboardingTooltip.tsx`
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useCircuitStore } from '@/store/circuitStore';

export default function OnboardingTooltip() {
  const [step, setStep] = useState<1 | 2 | 'done'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('circuit-onboarded')) return 'done';
    return 1;
  });
  const components = useCircuitStore(s => s.components);

  // Auto-advance from step 1 to step 2 when first component is placed
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
          className="absolute bottom-24 left-[50%] -translate-x-[50%] pointer-events-auto"
          style={{ animation: 'toastIn 0.4s ease-out both' }}
        >
          <div className="bg-[#18181c] border border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] px-5 py-4 max-w-[280px] text-center">
            <div className="text-2xl mb-2">👋</div>
            <p className="text-white/80 text-[13px] font-medium mb-1">Welcome to Circuit Simulator</p>
            <p className="text-white/45 text-[11px] mb-3">Drag a component from the panel on the left to get started. Press <kbd className="text-[10px] bg-white/10 rounded px-1 py-0.5">?</kbd> for all shortcuts.</p>
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
          className="absolute bottom-24 left-[50%] -translate-x-[50%] pointer-events-auto"
          style={{ animation: 'toastIn 0.4s ease-out both' }}
        >
          <div className="bg-[#18181c] border border-white/10 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7)] px-5 py-4 max-w-[280px] text-center">
            <div className="text-2xl mb-2">🔌</div>
            <p className="text-white/80 text-[13px] font-medium mb-1">Now wire it up</p>
            <p className="text-white/45 text-[11px] mb-3">Click any pin hole on the breadboard to start drawing a wire. Click a second pin to connect them.</p>
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
```

### `app/page.tsx`
Add near the top with other dynamic imports:
```tsx
const OnboardingTooltip = dynamic(() => import('@/components/OnboardingTooltip'), { ssr: false });
```
Render inside the main JSX alongside `<Toast />` and `<HelpOverlay />`.

## Notes
- `toastIn` keyframe is already defined in `app/globals.css` — reuse it
- Don't add any Zustand store — local state is sufficient for this component
- `pnpm build` must pass without TypeScript errors
