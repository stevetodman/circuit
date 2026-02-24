'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#7c6fff', '#00e676', '#ff9800', '#f44336'];
const MAX_POINTS = 200;

interface Props {
  data: number[][];
  onClear: () => void;
}

export default function SerialPlotter({ data, onClear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = '#ffffff0d';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (H * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const activeChannels = data.filter((ch) => ch.length > 0);
    if (activeChannels.length === 0) {
      ctx.fillStyle = '#ffffff30';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for numeric serial data...', W / 2, H / 2);
      return;
    }

    // Find data range across all active channels
    const allValues = activeChannels.flat();
    let minV = Math.min(...allValues);
    let maxV = Math.max(...allValues);
    if (minV === maxV) {
      minV -= 1;
      maxV += 1;
    }
    const range = maxV - minV;

    // Y axis labels
    ctx.fillStyle = '#ffffff40';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(maxV.toFixed(1), 2, 10);
    ctx.fillText(minV.toFixed(1), 2, H - 3);

    // Draw each channel
    data.forEach((ch, ci) => {
      if (ch.length < 2) return;
      ctx.strokeStyle = COLORS[ci];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ch.forEach((v, i) => {
        const x = (i / (MAX_POINTS - 1)) * W;
        const y = H - ((v - minV) / range) * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [data]);

  const hasData = data.some((ch) => ch.length > 0);

  return (
    <div className="flex flex-col gap-1">
      <canvas
        ref={canvasRef}
        width={220}
        height={120}
        className="w-full rounded border border-white/10"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {COLORS.map((color, i) => (
            data[i]?.length > 0 && (
              <span key={i} className="text-[9px]" style={{ color }}>
                ch{i + 1}
              </span>
            )
          ))}
        </div>
        {hasData && (
          <button
            onClick={onClear}
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
