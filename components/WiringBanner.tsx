'use client';

import { useCircuitStore } from '@/store/circuitStore';

export default function WiringBanner() {
  const { wiringMode, selectedNodeId } = useCircuitStore((s) => ({
    wiringMode: s.wiringMode,
    selectedNodeId: s.selectedNodeId,
  }));

  if (!wiringMode) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3
                    bg-[#7c6fff]/20 border border-[#7c6fff]/60 rounded-full
                    px-5 py-2 text-sm text-white/90 backdrop-blur-sm shadow-lg
                    pointer-events-none select-none">
      <span className="w-2 h-2 rounded-full bg-[#7c6fff] animate-pulse" />
      Wiring — click a destination pin to connect
      <span className="text-white/40 ml-2">Esc to cancel</span>
    </div>
  );
}

