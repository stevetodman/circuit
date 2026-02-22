'use client';

import { useShallow } from 'zustand/react/shallow';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useDragStore } from '@/store/dragStore';
import { useScopeStore } from '@/store/scopeStore';
import { voltages } from '@/simulation/SimBridge';

// ── Mode indicator ─────────────────────────────────────────────────────────────
function ModeChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded"
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
  const dragging = useDragStore((s) => s.dragging);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);

  const {
    simStatus,
    simError,
    hoveredNodeId,
    power,
    simErrorDismissed,
    dismissSimError,
    showDesignators,
    showCurrentLabels,
    requestZoomToFit,
    toggleDesignators,
    toggleCurrentLabels,
    toggleHelp,
    showHelp,
    circuitHealthWarning,
  } = useUIStore(useShallow((s) => ({
    simStatus: s.simStatus,
    simError: s.simError,
    hoveredNodeId: s.hoveredNodeId,
    power: s.power,
    simErrorDismissed: s.simErrorDismissed,
    dismissSimError: s.dismissSimError,
    showDesignators: s.showDesignators,
    showCurrentLabels: s.showCurrentLabels,
    requestZoomToFit: s.requestZoomToFit,
    toggleDesignators: s.toggleDesignators,
    toggleCurrentLabels: s.toggleCurrentLabels,
    toggleHelp: s.toggleHelp,
    showHelp: s.showHelp,
    circuitHealthWarning: s.circuitHealthWarning,
  })));

  const { open: schematicOpen, toggle: toggleSchematic } = useSchematicStore(
    useShallow((s) => ({ open: s.open, toggle: s.toggle })),
  );
  const { open: scopeOpen, toggle: toggleScope } = useScopeStore(
    useShallow((s) => ({ open: s.open, toggle: s.toggle })),
  );

  const toolbarBtnClass = (active: boolean) =>
    `w-7 h-7 rounded flex items-center justify-center text-[11px] transition-colors ${
      active ? 'text-white/90 bg-white/10' : 'text-white/40 hover:text-white/80 hover:bg-white/10'
    }`;

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
  else if (wiringMode) { modeLabel = 'Wire';  modeColor = '#2299cc'; }
  else if (selectedComponentId) { modeLabel = 'Select'; modeColor = '#44bb88'; }

  const dot = SIM_DOT[simStatus];

  let contextText = '';
  let contextTextClass = 'text-[10px]';
  if (dragging) {
    contextText = 'Esc to cancel';
    contextTextClass = 'text-[10px] text-white/35 font-mono';
  } else if (wiringMode || selectedNodeId) {
    contextText = 'Click to connect';
  } else if (selectedComponentIds.length > 1) {
    contextText = `${selectedComponentIds.length} selected`;
  } else if (hoveredNodeId) {
    const hoveredNode = useCircuitStore.getState().nodes[hoveredNodeId];
    const netId = hoveredNode?.netId;
    if (netId != null && Number.isFinite(voltages[netId])) {
      const v = voltages[netId];
      const vStr = Math.abs(v) < 0.001 ? '0 V' : `${v.toFixed(2)} V`;
      contextText = `${hoveredNodeId} · ${vStr}`;
    } else {
      contextText = hoveredNodeId;
    }
  } else {
    contextText = `${netCount} net${netCount !== 1 ? 's' : ''}`;
  }

  return (
    <div className="border-t border-white/[0.06]">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${simStatus === 'running' ? 'animate-pulse' : ''}`}
            style={{ background: dot.color, boxShadow: simStatus === 'running' ? `0 0 6px ${dot.color}` : 'none' }}
          />
          <span className="font-medium text-white">{dot.label}</span>
        </span>
        <span className="text-[10px] font-mono text-white/50">⚡ {formatPower(power)}</span>
      </div>

      <div className="flex items-center gap-1 px-3 pb-1">
        <button
          type="button"
          onClick={requestZoomToFit}
          title="Zoom to fit (F)"
          className={toolbarBtnClass(false)}
        >
          ⊡
        </button>
        <button
          type="button"
          onClick={toggleDesignators}
          title="Labels (L)"
          aria-pressed={showDesignators}
          className={toolbarBtnClass(showDesignators)}
        >
          🏷
        </button>
        <button
          type="button"
          onClick={toggleCurrentLabels}
          title="Current (I)"
          aria-pressed={showCurrentLabels}
          className={toolbarBtnClass(showCurrentLabels)}
        >
          ⚡
        </button>
        <button
          type="button"
          onClick={toggleSchematic}
          title="Schematic (S)"
          aria-pressed={schematicOpen}
          className={toolbarBtnClass(schematicOpen)}
        >
          📐
        </button>
        <button
          type="button"
          onClick={toggleScope}
          title="Scope (O)"
          aria-pressed={scopeOpen}
          className={toolbarBtnClass(scopeOpen)}
        >
          📊
        </button>
        <button
          type="button"
          onClick={toggleHelp}
          title="Help (?)"
          aria-pressed={showHelp}
          className={toolbarBtnClass(showHelp)}
        >
          ?
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2 min-h-[20px]">
        <ModeChip label={modeLabel} color={modeColor} />
        <span className={contextTextClass}>{contextText}</span>
      </div>

      {circuitHealthWarning && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded border border-amber-500/35 bg-amber-900/25 px-2 py-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-[11px] leading-tight text-amber-200/90 font-mono">{circuitHealthWarning}</span>
        </div>
      )}

      {simStatus === 'error' && !simErrorDismissed && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded border border-red-500/25 bg-red-950/40 px-2 py-1.5">
          <span className="text-[9px] text-red-400 flex-1 leading-tight font-mono">{simError ?? 'Sim error'}</span>
          <button
            onClick={dismissSimError}
            type="button"
            className="text-red-400/40 hover:text-red-300 text-[11px] leading-none flex-shrink-0"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
