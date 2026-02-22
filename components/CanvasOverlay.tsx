'use client';

import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';

export default function CanvasOverlay() {
  const requestZoomIn = useUIStore((s) => s.requestZoomIn);
  const requestZoomOut = useUIStore((s) => s.requestZoomOut);
  const requestZoomToFit = useUIStore((s) => s.requestZoomToFit);
  const componentCount = useCircuitStore((s) => Object.keys(s.components).length);

  const btnClass = 'w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors text-sm select-none';

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
      {componentCount > 0 && (
        <div className="text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded-full pointer-events-none">
          {componentCount} part{componentCount !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex flex-col bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden pointer-events-auto">
        <button onClick={requestZoomIn} className={btnClass} title="Zoom in">
          +
        </button>
        <div className="h-px bg-white/10" />
        <button onClick={requestZoomToFit} className={btnClass} title="Zoom to fit (F)">
          ⊡
        </button>
        <div className="h-px bg-white/10" />
        <button onClick={requestZoomOut} className={btnClass} title="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}
