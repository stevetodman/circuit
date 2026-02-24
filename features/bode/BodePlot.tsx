'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useBodeStore } from '@/store/bodeStore';
import { useCircuitStore } from '@/store/circuitStore';
import { buildNetlist } from '@/simulation/mna/NetlistBuilder';
import { acSweep } from '@/simulation/mna/ACSolver';

const RANGE_PRESETS = [
  { label: '1 Hz – 1 kHz', fMin: 1, fMax: 1000 },
  { label: '1 Hz – 1 MHz', fMin: 1, fMax: 1e6 },
  { label: '1 kHz – 1 MHz', fMin: 1000, fMax: 1e6 },
  { label: '1 kHz – 100 MHz', fMin: 1000, fMax: 1e8 },
] as const;

function drawGainChart(
  canvas: HTMLCanvasElement,
  points: Array<{ freq: number; gainDB: number }>,
  sweepMin: number,
  sweepMax: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || 400;
  const height = canvas.clientHeight || 140;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d0d10';
  ctx.fillRect(0, 0, width, height);
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (points.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('No frequency points', width / 2, height / 2);
    return;
  }

  const plot = {
    left: 52,
    right: 12,
    top: 12,
    bottom: 22,
  };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;

  const minGain = points.reduce((m, p) => Math.min(m, p.gainDB), points[0]!.gainDB);
  const maxGain = points.reduce((m, p) => Math.max(m, p.gainDB), points[0]!.gainDB);
  let yMin = minGain - 10;
  let yMax = maxGain + 10;
  if (yMin === yMax) {
    yMin -= 10;
    yMax += 10;
  }

  const xMinLog = Math.log10(sweepMin);
  const xRangeLog = Math.log10(sweepMax) - xMinLog;
  const toX = (freq: number) => plot.left + ((Math.log10(freq) - xMinLog) / xRangeLog) * plotWidth;
  const toY = (value: number) => plot.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const yLabelY = (tick: number) => toY(tick);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let v = Math.ceil(yMin / 20) * 20; v <= yMax; v += 20) {
    const y = yLabelY(v);
    ctx.moveTo(plot.left, y);
    ctx.lineTo(width - plot.right, y);
  }
  for (const freq of [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]) {
    if (freq < sweepMin || freq > sweepMax) continue;
    const x = toX(freq);
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plotHeight);
  }
  ctx.stroke();

  // Y labels
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '10px ui-monospace, monospace';
  for (let v = Math.ceil(yMin / 20) * 20; v <= yMax; v += 20) {
    const y = yLabelY(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + 6, y);
    ctx.stroke();
    ctx.fillText(`${v} dB`, 6, y);
  }

  // X labels
  for (const freq of [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]) {
    if (freq < sweepMin || freq > sweepMax) continue;
    const x = toX(freq);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, plot.top + plotHeight);
    ctx.lineTo(x, plot.top + plotHeight + 4);
    ctx.stroke();
    const label = freq >= 1e6 ? `${freq / 1e6} MHz` : freq >= 1e3 ? `${freq / 1e3} kHz` : `${freq} Hz`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, height - 8);
  }

  // Trace
  ctx.strokeStyle = '#7c6fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = toX(p.freq);
    const y = toY(p.gainDB);
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawPhaseChart(canvas: HTMLCanvasElement, points: Array<{ freq: number; phaseDeg: number }>, sweepMin: number, sweepMax: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = canvas.clientWidth || 400;
  const height = canvas.clientHeight || 120;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0d0d10';
  ctx.fillRect(0, 0, width, height);
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (points.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center';
    ctx.fillText('No frequency points', width / 2, height / 2);
    return;
  }

  const plot = {
    left: 52,
    right: 12,
    top: 12,
    bottom: 22,
  };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const yMin = -180;
  const yMax = 180;
  const xMinLog = Math.log10(sweepMin);
  const xRangeLog = Math.log10(sweepMax) - xMinLog;
  const toX = (freq: number) => plot.left + ((Math.log10(freq) - xMinLog) / xRangeLog) * plotWidth;
  const toY = (value: number) => plot.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const v of [-180, -90, 0, 90, 180]) {
    const y = toY(v);
    ctx.moveTo(plot.left, y);
    ctx.lineTo(width - plot.right, y);
  }
  for (const freq of [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]) {
    if (freq < sweepMin || freq > sweepMax) continue;
    const x = toX(freq);
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plotHeight);
  }
  ctx.stroke();

  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const v of [-180, -90, 0, 90, 180]) {
    const y = toY(v);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + 6, y);
    ctx.stroke();
    ctx.fillText(`${v}°`, 6, y);
  }

  for (const freq of [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000]) {
    if (freq < sweepMin || freq > sweepMax) continue;
    const x = toX(freq);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, plot.top + plotHeight);
    ctx.lineTo(x, plot.top + plotHeight + 4);
    ctx.stroke();
    const label = freq >= 1e6 ? `${freq / 1e6} MHz` : freq >= 1e3 ? `${freq / 1e3} kHz` : `${freq} Hz`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, height - 8);
  }

  ctx.strokeStyle = '#00b4d8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = toX(p.freq);
    const y = toY(p.phaseDeg);
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function formatRangeValue(min: number, max: number) {
  return `${min}|${max}`;
}

export default function BodePlot() {
  const {
    open,
    probeNetId,
    fMin,
    fMax,
    numPoints,
    result,
    isRunning,
    close,
    setProbeNetId,
    setFreqRange,
    setResult,
    setRunning,
  } = useBodeStore(
    useShallow((state) => ({
      open: state.open,
      probeNetId: state.probeNetId,
      fMin: state.fMin,
      fMax: state.fMax,
      numPoints: state.numPoints,
      result: state.result,
      isRunning: state.isRunning,
      close: state.close,
      setProbeNetId: state.setProbeNetId,
      setFreqRange: state.setFreqRange,
      setResult: state.setResult,
      setRunning: state.setRunning,
    }))
  );

  const { nodes, components, wires } = useCircuitStore(
    useShallow((state) => ({ nodes: state.nodes, components: state.components, wires: state.wires }))
  );

  const gainCanvasRef = useRef<HTMLCanvasElement>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement>(null);

  const netOptions = useMemo(() => {
    const unique = new Set<number>();
    for (const node of Object.values(nodes)) {
      if (node.netId != null && node.netId > 0) unique.add(node.netId);
    }
    return Array.from(unique).sort((a, b) => a - b);
  }, [nodes]);

  useEffect(() => {
    if (!open) return;
    if (netOptions.length === 0) {
      if (probeNetId != null) setProbeNetId(null);
      return;
    }
    if (probeNetId == null || !netOptions.includes(probeNetId)) {
      setProbeNetId(netOptions[0] ?? null);
    }
  }, [open, probeNetId, netOptions, setProbeNetId]);

  const runSweep = () => {
    if (probeNetId === null || isRunning) return;
    setRunning(true);
    const netlist = buildNetlist(nodes, components, wires);
    setTimeout(() => {
      try {
        const r = acSweep(netlist, probeNetId, fMin, fMax, numPoints);
        setResult(r);
      } finally {
        setRunning(false);
      }
    }, 0);
  };

  useEffect(() => {
    if (!gainCanvasRef.current) return;
    if (!result) {
      const ctx = gainCanvasRef.current.getContext('2d');
      if (!ctx) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = gainCanvasRef.current.clientWidth || 400;
      const height = gainCanvasRef.current.clientHeight || 140;
      gainCanvasRef.current.width = Math.floor(width * dpr);
      gainCanvasRef.current.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    drawGainChart(gainCanvasRef.current, result, fMin, fMax);
  }, [result, fMin, fMax]);

  useEffect(() => {
    if (!phaseCanvasRef.current) return;
    if (!result) {
      const ctx = phaseCanvasRef.current.getContext('2d');
      if (!ctx) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = phaseCanvasRef.current.clientWidth || 400;
      const height = phaseCanvasRef.current.clientHeight || 120;
      phaseCanvasRef.current.width = Math.floor(width * dpr);
      phaseCanvasRef.current.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0d0d10';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    drawPhaseChart(phaseCanvasRef.current, result, fMin, fMax);
  }, [result, fMin, fMax]);

  if (!open) return null;

  return (
    <div
      className="fixed z-30"
      style={{
        top: '48px',
        right: '12px',
        width: '420px',
        background: '#0d0d10',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '11px',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-white/80 text-xs">≈ Bode</div>
        <button
          type="button"
          onClick={close}
          className="text-[12px] text-white/50 hover:text-white/80"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="text-white/55 text-[10px] tabular-nums min-w-[45px]">Probe</label>
        <select
          value={probeNetId ?? ''}
          onChange={(event) => {
            const value = Number.parseInt(event.target.value, 10);
            setProbeNetId(Number.isFinite(value) ? value : null);
          }}
          className="h-7 rounded bg-black/35 border border-white/15 text-white px-2 text-[11px]"
        >
          {netOptions.map((id) => (
            <option key={id} value={id}>
              Net {id}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runSweep}
          disabled={probeNetId == null || isRunning}
          className="h-7 px-3 rounded bg-[#7c6fff] text-black disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {isRunning ? 'Running...' : 'Run Sweep'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="text-white/55 text-[10px] tabular-nums min-w-[45px]">Range</label>
        <select
          value={formatRangeValue(fMin, fMax)}
          onChange={(event) => {
            const [nextMin, nextMax] = event.target.value.split('|');
            const min = Number.parseFloat(nextMin);
            const max = Number.parseFloat(nextMax);
            if (Number.isFinite(min) && Number.isFinite(max)) {
              setFreqRange(min, max);
            }
          }}
          className="h-7 rounded bg-black/35 border border-white/15 text-white px-2 text-[11px]"
        >
          {RANGE_PRESETS.map((preset) => (
            <option key={`${preset.fMin}-${preset.fMax}`} value={`${preset.fMin}|${preset.fMax}`}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-white/65 text-[10px] mb-2">Gain (dB)</div>
      <div className="mb-3">
        <canvas ref={gainCanvasRef} width={400} height={140} style={{ width: '400px', height: '140px' }} />
      </div>
      <div className="text-white/65 text-[10px] mb-2">Phase (°)</div>
      <canvas ref={phaseCanvasRef} width={400} height={120} style={{ width: '400px', height: '120px' }} />
    </div>
  );
}
