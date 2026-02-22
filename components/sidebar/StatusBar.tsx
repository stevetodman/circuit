'use client';

import { useShallow } from 'zustand/react/shallow';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useDragStore } from '@/store/dragStore';

// ── Mode indicator ─────────────────────────────────────────────────────────────
function ModeChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded"
      style={{ background: color + '22', color }}
    >
      {label}
    </span>
  );
}

// ── Sim status dot ─────────────────────────────────────────────────────────────
const SIM_DOT: Record<'idle' | 'running' | 'error', { color: string; label: string }> = {
  idle:    { color: '#555', label: 'Idle' },
  running: { color: '#22cc66', label: 'Running' },
  error:   { color: '#dd3333', label: 'Error' },
};

function formatPower(power: number): string {
  const safePower = Number.isFinite(power) ? Math.abs(power) : 0;
  const mw = safePower * 1000;
  if (mw >= 1000) {
    return `${safePower.toFixed(1)} W`;
  }
  return `${mw.toFixed(1)} mW`;
}

export default function StatusBar() {
  const wiringMode = useCircuitStore((s) => s.wiringMode);
  const dragging   = useDragStore((s) => s.dragging);
  const selectedNodeId       = useCircuitStore((s) => s.selectedNodeId);
  const selectedComponentId  = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);

  const { simStatus, simError, hoveredNodeId, power } = useUIStore(useShallow((s) => ({
    simStatus: s.simStatus,
    simError: s.simError,
    hoveredNodeId: s.hoveredNodeId,
    power: s.power,
  })));

  // Count non-null distinct nets (for net count display)
  const netCount = useCircuitStore((s) => {
    const ids = new Set<number>();
    for (const n of Object.values(s.nodes)) {
      if (n.netId != null && n.netId !== 0) ids.add(n.netId);
    }
    return ids.size;
  });

  // Derive current mode label
  let modeLabel = 'Select';
  let modeColor = '#6677aa';
  if (dragging) { modeLabel = 'Place';  modeColor = '#cc9922'; }
  else if (selectedNodeId) { modeLabel = 'Wire';  modeColor = '#2299cc'; }
  else if (wiringMode)     { modeLabel = 'Wire';  modeColor = '#2299cc'; }
  else if (selectedComponentId) { modeLabel = 'Select'; modeColor = '#44bb88'; }

  const dot = SIM_DOT[simStatus];

  return (
    <div className="px-3 py-2 border-t border-white/[0.06] space-y-1.5">
      {/* Mode + Sim status row */}
      <div className="flex items-center justify-between">
        <ModeChip label={modeLabel} color={modeColor} />
        <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: dot.color }}>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: dot.color, boxShadow: simStatus === 'running' ? `0 0 4px ${dot.color}` : 'none' }}
          />
          {dot.label}
        </span>
      </div>
      <div className="text-[10px] font-mono text-white/70">⚡ {formatPower(power)}</div>
      {simStatus === 'error' && (
        <span className="text-[10px] text-red-400" title={simError ?? ''}>
          {simError ?? 'Sim error'}
        </span>
      )}

      {/* Net count + hovered pin */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
        <span>{netCount} net{netCount !== 1 ? 's' : ''}</span>
        {selectedComponentIds.length > 1 && (
          <span className="text-white/50">{selectedComponentIds.length} selected</span>
        )}
        {hoveredNodeId && !selectedComponentIds.length && (
          <span className="text-white/50">{hoveredNodeId}</span>
        )}
      </div>
    </div>
  );
}
