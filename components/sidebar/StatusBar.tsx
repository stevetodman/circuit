'use client';

import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useDragStore } from '@/store/dragStore';
import { useScopeStore } from '@/store/scopeStore';
import { simTimestamp, voltages } from '@/simulation/SimBridge';
import type { PlacedComponent } from '@/types/circuit';

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
const SIM_DOT: Record<'idle' | 'running' | 'error' | 'warn', { color: string; label: string }> = {
  idle:    { color: '#555', label: 'Idle' },
  running: { color: '#22cc66', label: 'Running' },
  error:   { color: '#dd3333', label: 'Error' },
  warn:    { color: '#ffaa00', label: 'Not converged' },
};

function formatPower(power: number): string {
  const safePower = Number.isFinite(power) ? Math.abs(power) : 0;
  const mw = safePower * 1000;
  if (mw >= 1000) {
    return `${safePower.toFixed(1)} W`;
  }
  return `${mw.toFixed(1)} mW`;
}

function formatSimTime(seconds: number): string {
  if (seconds < 0.001) return '0ms';
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
}

function computePowerBreakdown(
  components: Record<string, PlacedComponent>,
  nodes: Record<string, { netId: number | null }>,
): Array<{ id: string; power: number }> {
  const breakdown: Array<{ id: string; power: number }> = [];
  for (const [id, component] of Object.entries(components)) {
    const pin0 = component.pins[0];
    const pin1 = component.pins[1];
    if (!pin0 || !pin1) continue;

    const netId0 = nodes[pin0.nodeId]?.netId ?? null;
    const netId1 = nodes[pin1.nodeId]?.netId ?? null;
    if (netId0 == null && netId1 == null) continue;

    const p = component.props as Record<string, number | string>;
    const v0 = voltages[netId0 ?? -1] ?? 0;
    const v1 = voltages[netId1 ?? -1] ?? 0;
    const dv = v0 - v1;

    let power = 0;
    switch (component.type) {
      case 'resistor':
        power = (dv * dv) / (typeof p.resistance === 'number' ? p.resistance : 1000);
        break;
      case 'motor':
        power = (dv * dv) / (typeof p.resistance === 'number' ? p.resistance : 10);
        break;
      case 'led':
      {
        const vf = typeof p.forwardVoltage === 'number' ? p.forwardVoltage : 2.0;
        const current = Math.max(0, (Math.abs(dv) - vf) / 100);
        power = Math.abs(dv) * current;
        break;
      }
      case 'battery':
        continue;
      default:
        continue;
    }

    if (power < 0.0001) continue;
    breakdown.push({ id, power });
  }
  breakdown.sort((a, b) => b.power - a.power);
  return breakdown;
}

export default function StatusBar() {
  const wiringMode = useCircuitStore((s) => s.wiringMode);
  const dragging = useDragStore((s) => s.dragging);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const componentsMap = useCircuitStore((s) => s.components);
  const nodes = useCircuitStore((s) => s.nodes);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const getDesignator = useCircuitStore((s) => s.getDesignator);

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
  const simSpeed = useUIStore((s) => s.simSpeed);
  const setSimSpeed = useUIStore((s) => s.setSimSpeed);
  const simPaused = useUIStore((s) => s.simPaused);
  const toggleSimPaused = useUIStore((s) => s.toggleSimPaused);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [simTimeS, setSimTimeS] = useState(0);
  const [healthWarningDismissed, setHealthWarningDismissed] = useState(false);

  useEffect(() => {
    setHealthWarningDismissed(false);
  }, [circuitHealthWarning]);

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
  const componentCount = Object.keys(componentsMap).length;
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
  const breakdown = useMemo(() => {
    if (!showBreakdown) return [];
    return computePowerBreakdown(componentsMap, nodes);
  }, [componentsMap, nodes, showBreakdown]);
  const totalPower = power;

  useEffect(() => {
    const id = setInterval(() => {
      setSimTimeS(simTimestamp ? simTimestamp[0] ?? 0 : 0);
    }, 200);

    return () => clearInterval(id);
  }, []);

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
    <div className="border-t border-white/[0.06] flex-shrink-0">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${simStatus === 'running' ? 'animate-pulse' : ''}`}
            style={{ background: dot.color, boxShadow: simStatus === 'running' ? `0 0 6px ${dot.color}` : 'none' }}
          />
          <span className="font-medium text-white">{dot.label}</span>
        </span>
        <span className="flex items-center">
          <span className="text-[10px] font-mono text-white/50">⚡ {formatPower(power)}</span>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="text-[10px] text-white/30 hover:text-white/60 font-mono px-1 ml-1"
            title="Toggle power breakdown"
          >
            {showBreakdown ? '▲' : '▼'}
          </button>
        </span>
      </div>

      {showBreakdown && (
        <div className="mt-1 flex flex-col gap-0.5 max-h-28 overflow-y-auto w-full px-1">
          {breakdown.length === 0 && (
            <span className="text-[9px] text-white/20 font-mono">No power data</span>
          )}
          {breakdown.map(({ id, power }) => {
            const designator = getDesignator(id);
            const fraction = totalPower > 0 ? power / totalPower : 0;
            return (
              <div
                key={id}
                className="flex items-center gap-1 cursor-pointer group"
                onClick={() => selectComponent(id)}
                title={`${designator}: ${formatPower(power)}`}
              >
                <span className="text-[9px] font-mono text-white/50 w-6 shrink-0 text-right">{designator}</span>
                <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full group-hover:bg-orange-300 transition-all"
                    style={{ width: `${Math.round(fraction * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-white/40 w-8 text-right shrink-0">
                  {formatPower(power)}
                </span>
              </div>
            );
          })}
        </div>
      )}

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
        <button
          type="button"
          onClick={toggleSimPaused}
          title={simPaused ? 'Resume simulation (Space)' : 'Pause simulation (Space)'}
          className={`w-6 h-5 flex items-center justify-center rounded text-[11px] transition-colors ${
            simPaused
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          }`}
        >
          {simPaused ? '▶' : '⏸'}
        </button>
        {[1, 2, 5, 10].map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setSimSpeed(speed)}
            className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
              simSpeed === speed
                ? 'bg-violet-500/25 text-violet-300'
                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
            }`}
            title={`Simulation speed: ${speed}×`}
          >
            {speed}×
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 px-3 pb-1 text-[9px] font-mono text-white/25">
        <span title="Component count">{componentCount} parts</span>
        <span title="Net count">{netCount} nets</span>
        {simTimeS > 0 && (
          <span title="Simulated time elapsed">⏱ {formatSimTime(simTimeS)}</span>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 pb-2 min-h-[20px]">
        <ModeChip label={modeLabel} color={modeColor} />
        <span className={contextTextClass}>{contextText}</span>
      </div>

      {circuitHealthWarning && !healthWarningDismissed && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded border border-amber-500/35 bg-amber-900/25 px-2 py-1.5 min-h-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-[11px] leading-tight text-amber-200/90 font-mono min-w-0 break-words flex-1">
            {circuitHealthWarning}
          </span>
          <button
            type="button"
            onClick={() => setHealthWarningDismissed(true)}
            className="text-amber-200/65 hover:text-amber-100 text-[11px] leading-none flex-shrink-0"
            title="Dismiss health warning"
          >
            ✕
          </button>
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
