'use client';

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { getSamples, MAX_CHANNELS } from '@/features/oscilloscope/scopeBuffer';
import { useScopeStore, type Channel } from '@/store/scopeStore';
import { useUIStore } from '@/store/uiStore';
import { useCircuitStore } from '@/store/circuitStore';
import { voltages } from '@/simulation/SimBridge';

interface OscilloscopeProps {
  open: boolean;
  channels: Channel[];
  onClose: () => void;
  onAddChannel: (netId: number, label?: string) => void;
  onRemoveChannel: (netId: number) => void;
}

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 220;
const DEFAULT_Y_MIN = -1;
const DEFAULT_Y_MAX = 15;
const H_DIVISIONS = 10;
const V_DIVISIONS = 8;
const MARGIN = { left: 34, right: 8, top: 24, bottom: 18 };

type ChannelStats = {
  vmin: number;
  vmax: number;
  vpp: number;
  freqHz: number | null;
};

function computeStats(samples: Float32Array, sampleRateHz = 1000): ChannelStats {
  if (samples.length === 0) return { vmin: 0, vmax: 0, vpp: 0, freqHz: null };

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] < min) min = samples[i];
    if (samples[i] > max) max = samples[i];
  }

  const mid = (min + max) / 2;
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < mid) !== (samples[i] < mid)) crossings++;
  }

  const freqHz = crossings > 1 ? (crossings / 2) * (sampleRateHz / samples.length) : null;
  return { vmin: min, vmax: max, vpp: max - min, freqHz };
}

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
  const timeWindowRef = useRef(1000);
  const [autoScale, setAutoScale] = useState(false);
  const [timeWindow, setTimeWindow] = useState<number>(1000);
  const [addingChannel, setAddingChannel] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [invalidInput, setInvalidInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [liveV, setLiveV] = useState<number[]>([]);

  // Cursor state — ref for the render loop, state for the readout overlay
  const cursorXRef = useRef<number | null>(null);
  const [cursorReadout, setCursorReadout] = useState<{
    x: number; // CSS pixel x within the panel
    readings: { netId: number; color: string; voltage: number }[];
  } | null>(null);
  const [statsMap, setStatsMap] = useState<Record<number, ChannelStats>>({});

  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const clearChannels = useScopeStore((s) => s.clearChannels);
  const frozen = useScopeStore((s) => s.frozen);
  const toggleFrozen = useScopeStore((s) => s.toggleFrozen);
  const hoveredNetId  = useCircuitStore((s) =>
    hoveredNodeId ? (s.nodes[hoveredNodeId]?.netId ?? null) : null
  );

  useEffect(() => {
    timeWindowRef.current = timeWindow;
  }, [timeWindow]);

  useEffect(() => {
    if (addingChannel) {
      inputRef.current?.focus();
    }
  }, [addingChannel]);

  const handleStartAdd = useCallback(() => {
    if (channels.length >= MAX_CHANNELS) return;
    // If a pin is hovered, probe it immediately without showing the input
    if (hoveredNetId != null && Number.isFinite(hoveredNetId)) {
      onAddChannel(hoveredNetId, hoveredNodeId ?? undefined);
      return;
    }
    setInputValue('');
    setInvalidInput(false);
    setAddingChannel(true);
  }, [channels.length, hoveredNetId, onAddChannel]);

  const handleCancelAdd = useCallback(() => {
    setAddingChannel(false);
    setInputValue('');
    setInvalidInput(false);
  }, []);

  const handleConfirmAdd = useCallback(() => {
    const value = inputValue.trim();
    if (!/^\d+$/.test(value)) {
      setInvalidInput(true);
      return;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
      setInvalidInput(true);
      return;
    }

    onAddChannel(parsed);
    setAddingChannel(false);
    setInputValue('');
    setInvalidInput(false);
  }, [inputValue, onAddChannel]);

  const handleSubmitAdd = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleConfirmAdd();
  }, [handleConfirmAdd]);

  const handleAddInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleConfirmAdd();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelAdd();
    }
  }, [handleCancelAdd, handleConfirmAdd]);

  const handleCanvasMouseMove = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = PANEL_WIDTH / rect.width;
    const px = (e.clientX - rect.left) * scaleX;
    const plotLeft = MARGIN.left;
    const plotWidth = PANEL_WIDTH - MARGIN.left - MARGIN.right;
    if (px < plotLeft || px > plotLeft + plotWidth) {
      cursorXRef.current = null;
      setCursorReadout(null);
      return;
    }
    cursorXRef.current = px;
    const t = (px - plotLeft) / plotWidth;
    const readings = channelsRef.current
      .map((ch) => {
        const rawSamples = getSamples(ch.netId);
        const samples =
          rawSamples.length > timeWindowRef.current
            ? rawSamples.subarray(rawSamples.length - timeWindowRef.current)
            : rawSamples;
        if (samples.length === 0) return null;
        const idx = Math.min(Math.round(t * (samples.length - 1)), samples.length - 1);
        return { netId: ch.netId, color: ch.color, voltage: samples[idx] };
      })
      .filter((r): r is { netId: number; color: string; voltage: number } => r !== null);
    setCursorReadout(readings.length > 0 ? { x: px, readings } : null);
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    cursorXRef.current = null;
    setCursorReadout(null);
  }, []);

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'oscilloscope.png';
    a.click();
  }, []);

  channelsRef.current = channels;
  autoScaleRef.current = autoScale;

  useEffect(() => {
    const id = setInterval(() => {
      const next: typeof statsMap = {};
      for (const ch of channels) {
        const s = getSamples(ch.netId);
        next[ch.netId] = computeStats(s);
      }
      setStatsMap(next);
    }, 500);

    return () => clearInterval(id);
  }, [channels]);

  useEffect(() => {
    if (!open) return;
    if (frozen) return; // leave canvas as-is when paused
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
      ctx.fillStyle = '#0d0d0f';
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
          const rawSamples = getSamples(channel.netId);
          const samples =
            rawSamples.length > timeWindowRef.current
              ? rawSamples.subarray(rawSamples.length - timeWindowRef.current)
              : rawSamples;
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

      setLiveV(
        channelsRef.current.map((channel) => {
          const value = voltages[channel.netId];
          return Number.isFinite(value) ? value : NaN;
        }),
      );

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
        const rawSamples = getSamples(channel.netId);
        const samples =
          rawSamples.length > timeWindowRef.current
            ? rawSamples.subarray(rawSamples.length - timeWindowRef.current)
            : rawSamples;
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

      // Cursor vertical line
      const cursorX = cursorXRef.current;
      if (cursorX != null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cursorX, plot.top);
        ctx.lineTo(cursorX, plot.top + plot.height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // clip to plot window for safety
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(plot.left, plot.top, plot.width, plot.height);
      ctx.restore();

      // X-axis label
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'center';
      ctx.fillText('← Time →', PANEL_WIDTH / 2, PANEL_HEIGHT - 2);

      window.requestAnimationFrame(render);
    };

    const frame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, frozen]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-20 h-[220px] w-[480px] rounded-md border border-white/15 bg-[#0f1117] shadow-2xl shadow-black/55 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={PANEL_WIDTH}
        height={PANEL_HEIGHT}
        className="h-full w-full block cursor-crosshair"
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
      />
      <div className="absolute left-0 right-0 bottom-0 z-10 text-[9px] font-mono text-white/25 text-center mt-0.5 pointer-events-none">
        {timeWindow < 1000 ? `${timeWindow}ms` : `${timeWindow / 1000}s`} window ·{' '}
        {(timeWindow / 10).toFixed(0)}ms/div
      </div>

      <div className="absolute left-2 top-1.5 z-10 flex flex-col gap-1">
        {channels.map((channel, i) => {
          const label = channel.label ? channel.label : `Net ${channel.netId}`;
          const liveVoltage = liveV[i];
          const stats = statsMap[channel.netId];
          return (
            <div key={channel.netId} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm"
                  style={{ color: channel.color, background: `${channel.color}22` }}
                >
                  {label}
                </span>
                <span className="text-[9px] font-mono text-white/65 tabular-nums">
                  {liveVoltage !== undefined ? `${liveVoltage.toFixed(2)}V` : ''}
                </span>
                <button
                  onClick={() => onRemoveChannel(channel.netId)}
                  className="text-[10px] text-white/55 hover:text-white/90 border border-white/15 rounded-sm w-4 h-4"
                  aria-label={`Remove channel ${label}`}
                >
                  ×
                </button>
              </div>
              {stats && stats.vpp > 0.01 && (
                <span className="text-[8px] font-mono text-white/35 ml-1">
                  {stats.vpp.toFixed(2)}Vpp
                  {stats.freqHz != null &&
                    ` ${stats.freqHz >= 1000
                      ? `${(stats.freqHz / 1000).toFixed(1)}kHz`
                      : `${stats.freqHz.toFixed(0)}Hz`}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {cursorReadout && (
        <div
          className="absolute z-10 pointer-events-none flex flex-col gap-0.5 rounded border border-white/15 bg-black/80 px-1.5 py-1"
          style={{
            // Flip to left of cursor when near right edge
            ...(cursorReadout.x > PANEL_WIDTH - 90
              ? { right: PANEL_WIDTH - cursorReadout.x + 4 }
              : { left: cursorReadout.x + 4 }),
            bottom: 22,
          }}
        >
          {cursorReadout.readings.map((r) => (
            <span key={r.netId} className="text-[9px] font-mono whitespace-nowrap" style={{ color: r.color }}>
              Net {r.netId}: {Math.abs(r.voltage) < 0.001 ? '0.000' : r.voltage.toFixed(3)} V
            </span>
          ))}
        </div>
      )}

      <div className="absolute top-1.5 right-2 z-10 flex items-center gap-1">
        <button
          onClick={toggleFrozen}
          className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
            frozen
              ? 'border-amber-400/60 text-amber-300'
              : 'border-white/20 text-white/65 hover:text-white/90'
          }`}
          title={frozen ? 'Resume (▶)' : 'Freeze waveform (⏸)'}
        >
          {frozen ? '▶' : '⏸'}
        </button>
        {[50, 200, 1000, 4000].map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => setTimeWindow(ms)}
            className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
              timeWindow === ms
                ? 'bg-violet-500/25 text-violet-300'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}
          </button>
        ))}
        <button
          onClick={() => setAutoScale((prev) => !prev)}
          className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${autoScale ? 'border-cyan-300 text-cyan-200' : 'border-white/20 text-white/65'}`}
          title="Toggle auto-scale"
        >
          Auto
        </button>
        {addingChannel ? (
          <form onSubmit={handleSubmitAdd} className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="number"
              min={0}
              max={255}
              step={1}
              inputMode="numeric"
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                if (invalidInput) setInvalidInput(false);
              }}
              onKeyDown={handleAddInputKeyDown}
              className={`h-4 w-14 rounded-sm border bg-[#131720] text-[10px] px-1 text-white outline-none ${invalidInput ? 'border-red-400' : 'border-white/30'}`}
              placeholder="0-255"
            />
            <button
              type="submit"
              className="h-4 w-4 rounded-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-[10px]"
              title="Add"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="h-4 w-4 rounded-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-[10px]"
              title="Cancel"
            >
              ×
            </button>
          </form>
        ) : (
          <button
            onClick={handleStartAdd}
            disabled={channels.length >= MAX_CHANNELS}
            className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${channels.length >= MAX_CHANNELS ? 'border-white/8 text-white/30' : hoveredNetId != null ? 'border-cyan-400/60 text-cyan-300 hover:border-cyan-300' : 'border-white/20 text-white/80 hover:text-white hover:border-white/40'}`}
            title={hoveredNetId != null ? `Probe net ${hoveredNetId}` : 'Hover a pin on the board, then click here'}
          >
            {hoveredNetId != null ? '+ Probe' : '+'}
          </button>
        )}
        <button
          onClick={clearChannels}
          disabled={channels.length === 0}
          className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${channels.length === 0 ? 'border-white/8 text-white/30' : 'border-white/20 text-white/80 hover:text-white hover:border-white/40'}`}
          title="Clear all channels"
        >
          ✕ all
        </button>
        <button
          onClick={onClose}
          className="text-[10px] px-1.5 py-0.5 rounded-sm border border-white/20 text-white/80 hover:text-white hover:border-white/40"
          title="Close scope"
        >
          ×
        </button>
        <button
          type="button"
          onClick={handleExportPNG}
          title="Save waveform as PNG"
          className="w-7 h-7 rounded flex items-center justify-center text-white/35 hover:text-white/80 hover:bg-white/10 transition-colors text-[13px]"
        >
          ↓
        </button>
      </div>
    </div>
  );
}
