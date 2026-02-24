'use client';
import { useUIStore } from '@/store/uiStore';

const TIPS = [
  'Reversed diode or LED — check the + (anode) and − (cathode) labels',
  'LED without a current-limiting resistor — add a 220Ω–1kΩ resistor in series',
  'Missing ground connection — connect the − battery terminal to the GND rail',
  'Very large resistance (>1MΩ) next to very small resistance (<1Ω) can cause instability',
  'Directly shorted power rails — do not wire + and − rails together',
];

export default function NrFailTips() {
  const visible = useUIStore((s) => s.nrFailTipsVisible);
  const setNrFailTipsVisible = useUIStore((s) => s.setNrFailTipsVisible);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 bottom-20 left-1/2 -translate-x-1/2 w-80 bg-[#1e1a10] border border-amber-500/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-4 py-3"
      style={{ animation: 'toastIn 0.15s ease-out both' }}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold text-amber-400">⚠ Simulation may be inaccurate</p>
        <button
          onClick={() => setNrFailTipsVisible(false)}
          className="text-white/30 hover:text-white/60 text-[13px] leading-none ml-2"
        >
          ✕
        </button>
      </div>
      <p className="text-[10px] text-white/50 mb-2">Common causes to check:</p>
      <ul className="space-y-1">
        {TIPS.map((tip, i) => (
          <li key={i} className="text-[10px] text-white/60 flex gap-1.5">
            <span className="text-amber-500/70 shrink-0">·</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
