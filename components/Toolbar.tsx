'use client';

import { type ReactNode, useMemo } from 'react';
import { type CSSProperties } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useCircuitHistory, useCircuitStore } from '@/store/circuitStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useUIStore } from '@/store/uiStore';
import { useBodeStore } from '@/store/bodeStore';
import { runAudit } from '@/features/audit/circuitAudit';

function ToolbarBtn({
  onClick,
  title,
  disabled,
  active,
  children,
  kbd,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  kbd?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/[0.1] cursor-pointer'}
        ${active ? 'bg-white/[0.1] text-white/90' : 'text-white/55 hover:text-white/80'}
      focus-visible:ring-1 focus-visible:ring-[#7c6fff] focus-visible:outline-none`}
    >
      {children}
      {kbd && (
        <kbd className="ml-0.5 px-0.5 py-px rounded text-[8px] font-mono bg-white/[0.08] border border-white/[0.15] text-white/40 leading-none">
          {kbd}
        </kbd>
      )}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-4 bg-white/[0.1] mx-1 flex-shrink-0" />;
}

export default function Toolbar() {
  const undoCount = useStore(useCircuitHistory(), (s) => s.pastStates.length);
  const redoCount = useStore(useCircuitHistory(), (s) => s.futureStates.length);
  const canUndo = undoCount > 0;
  const canRedo = redoCount > 0;

  const {
    deleteSelected,
    copySelected,
    pasteClipboard,
    selectedComponentId,
    selectedComponentIds,
    clipboardLength,
    components,
    nodes,
    getDesignator,
  } = useCircuitStore(
    useShallow((s) => ({
      deleteSelected: s.deleteSelected,
      copySelected: s.copySelected,
      pasteClipboard: s.pasteClipboard,
      selectedComponentId: s.selectedComponentId,
      selectedComponentIds: s.selectedComponentIds,
      clipboardLength: s.clipboardLength,
      components: s.components,
      nodes: s.nodes,
      getDesignator: s.getDesignator,
    }))
  );

    const {
    showDesignators,
    toggleDesignators,
    showCurrentLabels,
    toggleCurrentLabels,
    showPolarityLabels,
    setShowPolarityLabels,
    showWireVoltageColors,
    toggleWireVoltageColors,
    showCurrentThickness,
    toggleCurrentThickness,
    wireRoutingMode,
    toggleWireRouting,
  } = useUIStore(
    useShallow((s) => ({
      showDesignators: s.showDesignators,
      toggleDesignators: s.toggleDesignators,
      showCurrentLabels: s.showCurrentLabels,
      toggleCurrentLabels: s.toggleCurrentLabels,
      showPolarityLabels: s.showPolarityLabels,
      setShowPolarityLabels: s.setShowPolarityLabels,
      showWireVoltageColors: s.showWireVoltageColors,
      toggleWireVoltageColors: s.toggleWireVoltageColors,
      showCurrentThickness: s.showCurrentThickness,
      toggleCurrentThickness: s.toggleCurrentThickness,
      wireRoutingMode: s.wireRoutingMode,
      toggleWireRouting: s.toggleWireRouting,
    }))
  );
  const showVoltageHeatmap = useUIStore((s) => s.showVoltageHeatmap);
  const toggleVoltageHeatmap = useUIStore((s) => s.toggleVoltageHeatmap);
  const showValueLabels = useUIStore((s) => s.showValueLabels);
  const toggleValueLabels = useUIStore((s) => s.toggleValueLabels);
  const openCircuitAudit = useUIStore((s) => s.openCircuitAudit);

  const { open: schematicOpen, toggle: toggleSchematic } = useSchematicStore(
    useShallow((s) => ({ open: s.open, toggle: s.toggle }))
  );
  const bodeOpen = useBodeStore((s) => s.open);
  const toggleBode = useBodeStore((s) => s.toggle);
  const auditIssueCount = useMemo(
    () => runAudit(components, nodes, getDesignator).length,
    [components, nodes, getDesignator]
  );

  const noSelection = !selectedComponentId && selectedComponentIds.length === 0;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07] h-[36px] overflow-x-auto"
      style={{ scrollbarWidth: 'none' } as CSSProperties}
    >
      <ToolbarBtn
        onClick={() => {
          useCircuitHistory().getState().undo();
        }}
        title={`Undo (Ctrl/Cmd+Z)${undoCount > 0 ? ` · ${undoCount} step${undoCount !== 1 ? 's' : ''}` : ''}`}
        disabled={!canUndo}
        kbd="⌘Z"
      >
        ↩ Undo{canUndo && (
          <span className="ml-0.5 text-[9px] tabular-nums opacity-50">{undoCount}</span>
        )}
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => {
          useCircuitHistory().getState().redo();
        }}
        title={`Redo (Ctrl/Cmd+Shift+Z)${redoCount > 0 ? ` · ${redoCount} step${redoCount !== 1 ? 's' : ''}` : ''}`}
        disabled={!canRedo}
        kbd="⌘⇧Z"
      >
        ↪ Redo{canRedo && (
          <span className="ml-0.5 text-[9px] tabular-nums opacity-50">{redoCount}</span>
        )}
      </ToolbarBtn>
      <Sep />

      <ToolbarBtn
        onClick={deleteSelected}
        title="Delete"
        disabled={noSelection}
        kbd="Del"
      >
        🗑 Delete
      </ToolbarBtn>
      <ToolbarBtn
        onClick={copySelected}
        title="Copy (Ctrl/Cmd+C)"
        disabled={noSelection}
        kbd="⌘C"
      >
        ⎘ Copy
      </ToolbarBtn>
      <ToolbarBtn
        onClick={pasteClipboard}
        title="Paste (Ctrl/Cmd+V)"
        disabled={clipboardLength === 0}
        kbd="⌘V"
      >
        ⎙ Paste
      </ToolbarBtn>
      <Sep />

      <ToolbarBtn
        onClick={toggleDesignators}
        title="Toggle designators (L)"
        active={showDesignators}
        kbd="L"
      >
        L Labels
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleCurrentLabels}
        title="Toggle current labels (I)"
        active={showCurrentLabels}
        kbd="I"
      >
        I Current
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => setShowPolarityLabels(!showPolarityLabels)}
        title="Toggle polarity labels (P)"
        active={showPolarityLabels}
        kbd="P"
      >
        P Polarity
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleWireVoltageColors}
        title="Toggle wire voltage colors (V)"
        active={showWireVoltageColors}
        kbd="V"
      >
        V Voltage
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleCurrentThickness}
        title="Toggle wire thickness by current (T)"
        active={showCurrentThickness}
        kbd="T"
      >
        ~ Width
      </ToolbarBtn>
      <button
        onClick={toggleWireRouting}
        title={`Wire routing: ${wireRoutingMode} (Q)`}
        className={`px-2 py-1 rounded text-[11px] transition-colors ${
          wireRoutingMode === 'orthogonal'
            ? 'bg-white/15 text-white'
            : 'text-white/50 hover:text-white/75'
        }`}
      >
        {wireRoutingMode === 'orthogonal' ? '⌐ Ortho' : '⌒ Curve'}
      </button>
      <ToolbarBtn
        onClick={toggleVoltageHeatmap}
        title="Toggle voltage heatmap (H)"
        active={showVoltageHeatmap}
        kbd="H"
      >
        H
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleValueLabels}
        title="Values (W)"
        active={showValueLabels}
        kbd="W"
      >
        Ω
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleSchematic}
        title="Toggle schematic (S)"
        active={schematicOpen}
        kbd="S"
      >
        S Schematic
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleBode}
        title="Bode Plot (D)"
        active={bodeOpen}
        kbd="D"
      >
        ≈ Bode
      </ToolbarBtn>
      <button
        onClick={openCircuitAudit}
        title={`Circuit Audit (Ctrl/Cmd+Shift+A)${auditIssueCount > 0 ? ` · ${auditIssueCount} issue${auditIssueCount === 1 ? '' : 's'}` : ''}`}
        className={`h-7 px-2.5 rounded text-[11px] transition-colors flex items-center gap-1.5 relative
          ${auditIssueCount > 0 ? 'text-white/90' : 'text-white/55 hover:text-white/80'}
          ${auditIssueCount > 0 ? 'bg-[#7c6fff]/12' : 'hover:bg-white/[0.1]'}
          focus-visible:ring-1 focus-visible:ring-[#7c6fff] focus-visible:outline-none`}
      >
        🛡 Audit
        {auditIssueCount > 0 && (
          <span className="ml-0.5 px-1 rounded-full text-[8px] leading-none bg-[#ff3e5b] text-white min-w-[16px] text-center font-medium">
            {auditIssueCount}
          </span>
        )}
      </button>
    </div>
  );
}
