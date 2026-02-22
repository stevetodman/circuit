'use client';

import { type ReactNode } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useCircuitHistory, useCircuitStore } from '@/store/circuitStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useUIStore } from '@/store/uiStore';

function ToolbarBtn({
  onClick,
  title,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
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
  } = useCircuitStore(
    useShallow((s) => ({
      deleteSelected: s.deleteSelected,
      copySelected: s.copySelected,
      pasteClipboard: s.pasteClipboard,
      selectedComponentId: s.selectedComponentId,
      selectedComponentIds: s.selectedComponentIds,
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
    }))
  );
  const showValueLabels = useUIStore((s) => s.showValueLabels);
  const toggleValueLabels = useUIStore((s) => s.toggleValueLabels);

  const { open: schematicOpen, toggle: toggleSchematic } = useSchematicStore(
    useShallow((s) => ({ open: s.open, toggle: s.toggle }))
  );

  const noSelection = !selectedComponentId && selectedComponentIds.length === 0;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-sm border-b border-white/[0.07] h-[36px]">
      <ToolbarBtn
        onClick={() => {
          useCircuitHistory().getState().undo();
        }}
        title={`Undo (Ctrl/Cmd+Z)${undoCount > 0 ? ` · ${undoCount} step${undoCount !== 1 ? 's' : ''}` : ''}`}
        disabled={!canUndo}
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
      >
        🗑 Delete
      </ToolbarBtn>
      <ToolbarBtn
        onClick={copySelected}
        title="Copy (Ctrl/Cmd+C)"
        disabled={noSelection}
      >
        ⎘ Copy
      </ToolbarBtn>
      <ToolbarBtn
        onClick={pasteClipboard}
        title="Paste (Ctrl/Cmd+V)"
      >
        ⎙ Paste
      </ToolbarBtn>
      <Sep />

      <ToolbarBtn
        onClick={toggleDesignators}
        title="Toggle designators (L)"
        active={showDesignators}
      >
        L Labels
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleCurrentLabels}
        title="Toggle current labels (I)"
        active={showCurrentLabels}
      >
        I Current
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => setShowPolarityLabels(!showPolarityLabels)}
        title="Toggle polarity labels (P)"
        active={showPolarityLabels}
      >
        P Polarity
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleWireVoltageColors}
        title="Toggle wire voltage colors (V)"
        active={showWireVoltageColors}
      >
        V Voltage
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleValueLabels}
        title="Values (W)"
        active={showValueLabels}
      >
        Ω
      </ToolbarBtn>
      <ToolbarBtn
        onClick={toggleSchematic}
        title="Toggle schematic (S)"
        active={schematicOpen}
      >
        S Schematic
      </ToolbarBtn>
    </div>
  );
}
