'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';

function safeFilename(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'circuit';
  return trimmed.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '-').slice(0, 64) || 'circuit';
}

export default function CanvasOverlay() {
  const requestZoomIn = useUIStore((s) => s.requestZoomIn);
  const requestZoomOut = useUIStore((s) => s.requestZoomOut);
  const requestZoomToFit = useUIStore((s) => s.requestZoomToFit);
  const componentCount = useCircuitStore((s) => Object.keys(s.components).length);
  const circuitName = useCircuitStore((s) => s.circuitName);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const btnClass = 'w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors text-sm select-none';
  const handleScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename(circuitName)}.png`;
    a.click();
  };

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
      {componentCount > 0 && (
        <div className="text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded-full pointer-events-none">
          {componentCount} part{componentCount !== 1 ? 's' : ''}
        </div>
      )}
      <div className="flex flex-col bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden pointer-events-auto">
        <button onClick={handleScreenshot} className={btnClass} title="Take screenshot">
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 1L5 3H2a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1h-3L10 1H6zm2 3a3 3 0 110 6 3 3 0 010-6z" />
          </svg>
        </button>
        <div className="h-px bg-white/10" />
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
        <div className="h-px bg-white/10" />
        <button
          onClick={toggleFullscreen}
          className={btnClass}
          title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
        >
          ⛶
        </button>
      </div>
    </div>
  );
}
