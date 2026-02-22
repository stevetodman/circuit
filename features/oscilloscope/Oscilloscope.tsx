'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSamples, SCOPE_SAMPLES, MAX_CHANNELS } from '@/features/oscilloscope/scopeBuffer';
import { type Channel } from '@/store/scopeStore';

interface OscilloscopeProps {
  open: boolean;
  channels: Channel[];
  onClose: () => void;
  onAddChannel: (netId: number) => void;
  onRemoveChannel: (netId: number) => void;
}

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 220;
const DEFAULT_Y_MIN = -1;
const DEFAULT_Y_MAX = 15;
const H_DIVISIONS = 10;
const V_DIVISIONS = 8;
const MARGIN = { left: 34, right: 8, top: 24, bottom: 18 };
const BUFFER_SIZE = SCOPE_SAMPLES;

function drawGrid(
  ctx: CanvasRenderingContext2D,
  plot: { left: number; top: number; width: number; height: number }
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= H_DIVISIONS; i++) {
    const y = plot.top + (plot.height * i) / H_DIVISIONS;
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
  }
  for (let i = 0; i <= V_DIVISIONS; i++) {
    const x = plot.left + (plot.width * i) / V_DIVISIONS;
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plot.height);
  }
  ctx.stroke();
}

function valueToPixel(v: number, min: number, max: number, plot: { top: number; height: number }) {
  const clamped = Math.min(max, Math.max(min, v));
  return plot.top + plot.height - ((clamped - min) / (max - min)) * plot.height;
}

export default function Oscilloscope({
  open,
  channels,
  onClose,
  onAddChannel,
  onRemoveChannel,
}: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelsRef = useRef<Channel[]>(channels);
  const autoScaleRef = useRef(false);
  const [autoScale, setAutoScale] = useState(false);

  const handleAdd = useCallback(() => {
    if (channels.length >= MAX_CHANNELS) return; // P1-19: enforce channel limit before prompting
    const raw = window.prompt('Enter a net ID (0-255) to probe');
    if (raw === null) return;
    const parsed = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0 || parsed > 255) return;
    onAddChannel(parsed);
  }, [onAddChannel, channels.length]);

  channelsRef.current = channels;
  autoScaleRef.current = autoScale;

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = PANEL_WIDTH * dpr;
    canvas.height = PANEL_HEIGHT * dpr;
    const plot = {
      left: MARGIN.left,
      top: MARGIN.top,
      width: PANEL_WIDTH - MARGIN.left - MARGIN.right,
      height: PANEL_HEIGHT - MARGIN.top - MARGIN.bottom,
    };

    const render = () => {
      if (!open) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

      ctx.fillStyle = '#10131a';
      ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(`SCOPE`, 8, 12);

      drawGrid(ctx, plot);

      let yMin = DEFAULT_Y_MIN;
      let yMax = DEFAULT_Y_MAX;

      if (autoScaleRef.current && channelsRef.current.length > 0) {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        for (const channel of channelsRef.current) {
          const samples = getSamples(channel.netId);
          for (let i = 0; i < samples.length; i++) {
            const value = samples[i];
            if (value < min) min = value;
            if (value > max) max = value;
          }
        }

        if (Number.isFinite(min) && Number.isFinite(max) && min !== max) {
          const pad = (max - min) * 0.1;
          yMin = min - pad;
          yMax = max + pad;
        }
      }

      const valueRange = yMax - yMin || 1;
      const minV = yMin;
      const maxV = yMax;

      // Y-axis labels (left side)
      const labelCount = 5;
      const voltageRange = maxV - minV;
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      for (let i = 0; i <= labelCount; i++) {
        const v = minV + (voltageRange * i) / labelCount;
        const y = plot.top + plot.height - (plot.height * i) / labelCount;
        ctx.fillText(`${v.toFixed(1)}V`, 38, y + 3);
      }

      // draw traces
      for (const channel of channelsRef.current) {
        const samples = getSamples(channel.netId);
        if (samples.length === 0) continue;

        const xStep = samples.length > 1 ? plot.width / (samples.length - 1) : plot.width;
        ctx.strokeStyle = channel.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();

        for (let i = 0; i < samples.length; i++) {
          const sample = samples[i];
          const x = plot.left + i * xStep;
          const y = valueToPixel(sample, yMin, yMax, plot);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      // clip to plot window for safety
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(plot.left, plot.top, plot.width, plot.height);
      ctx.restore();

      // sample marker / debug text
      const sampleText = channelsRef.current[0]
        ? `samples: ${getSamples(channelsRef.current[0].netId).length}/${SCOPE_SAMPLES}`
        : `samples: 0/${SCOPE_SAMPLES}`;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText(sampleText, PANEL_WIDTH - ctx.measureText(sampleText).width - 8, PANEL_HEIGHT - 6);

      // X-axis: show sample count
      ctx.textAlign = 'center';
      ctx.fillText(`← ${BUFFER_SIZE} samples →`, PANEL_WIDTH / 2, PANEL_HEIGHT - 2);

      window.requestAnimationFrame(render);
    };

    const frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-20 h-[220px] w-[480px] rounded-md border border-white/15 bg-[#0f1117] shadow-2xl shadow-black/55 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={PANEL_WIDTH}
        height={PANEL_HEIGHT}
        className="h-full w-full block"
      />

      <div className="absolute left-2 top-1.5 z-10 flex flex-col gap-1">
        {channels.map((channel) => {
          const label = channel.label ? channel.label : `Net ${channel.netId}`;
          return (
            <div key={channel.netId} className="flex items-center gap-1">
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                style={{ color: channel.color, background: `${channel.color}22` }}
              >
                {label}
              </span>
              <button
                onClick={() => onRemoveChannel(channel.netId)}
                className="text-[10px] text-white/55 hover:text-white/90 border border-white/15 rounded-sm w-4 h-4"
                aria-label={`Remove channel ${label}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="absolute top-1.5 right-2 z-10 flex items-center gap-1">
        <button
          onClick={() => setAutoScale((prev) => !prev)}
          className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${autoScale ? 'border-cyan-300 text-cyan-200' : 'border-white/20 text-white/65'}`}
          title="Toggle auto-scale"
        >
          Auto
        </button>
        <button
          onClick={handleAdd}
          className="text-[10px] px-1.5 py-0.5 rounded-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40"
          title="Add a channel"
        >
          +
        </button>
        <button
          onClick={onClose}
          className="text-[10px] px-1.5 py-0.5 rounded-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40"
          title="Close scope"
        >
          ×
        </button>
      </div>
    </div>
  );
}
