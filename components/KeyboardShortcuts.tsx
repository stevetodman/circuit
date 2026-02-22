'use client';

import { useEffect } from 'react';
import { useCircuitStore, useCircuitHistory } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useUIStore } from '@/store/uiStore';

/**
 * Global keyboard shortcuts — mount once in app/page.tsx.
 *
 *  Ctrl+Z / Cmd+Z            → undo
 *  Ctrl+Shift+Z / Cmd+Shift+Z → redo
 *  Delete / Backspace        → delete selected component/wire
 *  R                         → rotate selected component
 *  O                         → toggle oscilloscope
 *  P                         → toggle polarity labels
 *  S                         → toggle schematic view
 *  F                         → zoom to fit
 *  1 / 2                     → camera presets
 *  Escape                    → cancel drag / deselect
 */
export default function KeyboardShortcuts() {
  const deleteSelected      = useCircuitStore((s) => s.deleteSelected);
  const rotateComponent     = useCircuitStore((s) => s.rotateComponent);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectNode          = useCircuitStore((s) => s.selectNode);
  const selectComponent     = useCircuitStore((s) => s.selectComponent);
  const copySelected        = useCircuitStore((s) => s.copySelected);
  const pasteClipboard      = useCircuitStore((s) => s.pasteClipboard);
  const selectAll           = useCircuitStore((s) => s.selectAll);
  const dragging           = useDragStore((s) => s.dragging);
  const cancelDrag          = useDragStore((s) => s.cancel);
  const rotateDrag          = useDragStore((s) => s.rotate);
  const toggleSchematic     = useSchematicStore((s) => s.toggle);
  const requestZoomToFit    = useUIStore((s) => s.requestZoomToFit);
  const requestZoomIn       = useUIStore((s) => s.requestZoomIn);
  const requestZoomOut      = useUIStore((s) => s.requestZoomOut);
  const requestCameraPreset = useUIStore((s) => s.requestCameraPreset);
  const toggleDesignators   = useUIStore((s) => s.toggleDesignators);
  const toggleWireVoltageColors = useUIStore((s) => s.toggleWireVoltageColors);
  const toggleValueLabels = useUIStore((s) => s.toggleValueLabels);
  const closeContextMenu    = useUIStore((s) => s.closeContextMenu);
  const clearBoxSelect      = useUIStore((s) => s.clearBoxSelect);
  const toggleCurrentLabels = useUIStore((s) => s.toggleCurrentLabels);
  const showPolarityLabels  = useUIStore((s) => s.showPolarityLabels);
  const setShowPolarityLabels = useUIStore((s) => s.setShowPolarityLabels);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // P1-9: check input focus before all shortcuts (including undo/redo)
      // so browser-native text undo (Ctrl+Z in inputs) is not intercepted
      if (isInputFocused()) return;

      // Undo — P1-8: use lowercased `key` to handle Shift+Z consistently
      if (meta && !e.shiftKey && key === 'z') {
        e.preventDefault();
        useCircuitHistory().getState().undo();
        return;
      }

      // Redo — P1-8: use lowercased `key` so macOS Shift+Z (e.key='Z') works
      if (meta && (e.shiftKey && key === 'z' || key === 'y')) {
        e.preventDefault();
        useCircuitHistory().getState().redo();
        return;
      }

      // Copy / Paste / Select-all / Duplicate
      if (meta && key === 'c') { e.preventDefault(); copySelected(); return; }
      if (meta && key === 'v') { e.preventDefault(); pasteClipboard(); return; }
      if (meta && key === 'a') { e.preventDefault(); selectAll(); return; }
      if (meta && key === 'd') { e.preventDefault(); copySelected(); pasteClipboard(); return; }

      if (!meta && key === 'a') {
        e.preventDefault();
        useUIStore.getState().requestArduinoTab();
        return;
      }

      // Show help
      if (key === '?') {
        e.preventDefault();
        useUIStore.getState().toggleHelp();
        return;
      }

      // Delete selected — F9.5: if wiring (node selected), cancel wire instead of deleting component
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (useCircuitStore.getState().selectedNodeId) {
          selectNode(null);
        } else {
          deleteSelected();
        }
        return;
      }

      // Zoom to fit
      if (key === 'f') {
        e.preventDefault();
        requestZoomToFit();
        return;
      }

      // Zoom in / out
      if (key === '+' || key === '=') {
        e.preventDefault();
        requestZoomIn();
        return;
      }
      if (key === '-') {
        e.preventDefault();
        requestZoomOut();
        return;
      }

      if (key === ' ') {
        e.preventDefault();
        useUIStore.getState().toggleSimPaused();
        return;
      }

      // Toggle designator labels
      if (key === 'l') {
        e.preventDefault();
        toggleDesignators();
        return;
      }

      // Camera presets
      if (key === '1') { e.preventDefault(); requestCameraPreset('default'); return; }
      if (key === '2') { e.preventDefault(); requestCameraPreset('top');     return; }

      // Rotate selected component or dragged component
      if (key === 'r') {
        if (dragging) {
          e.preventDefault();
          rotateDrag();
          return;
        }
        if (selectedComponentId) {
          e.preventDefault();
          rotateComponent(selectedComponentId);
        }
        return;
      }

      // Toggle oscilloscope
      if (key === 'o') {
        e.preventDefault();
        useScopeStore.getState().toggle();
        return;
      }

      if (key === 'i') {
        e.preventDefault();
        toggleCurrentLabels();
        return;
      }

      // Toggle polarity labels
      if (key === 'p') {
        e.preventDefault();
        setShowPolarityLabels(!showPolarityLabels);
        return;
      }

      if (key === 'v') {
        e.preventDefault();
        toggleWireVoltageColors();
        return;
      }

      if (!meta && key === 'b') {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
        return;
      }

      if (key === 'w') {
        e.preventDefault();
        toggleValueLabels();
        return;
      }

      // Toggle schematic
      if (key === 's') {
        e.preventDefault();
        toggleSchematic();
        return;
      }

      // Escape — cancel drag / deselect
      // F3.5: if wiring, only cancel the wire — keep component selected
      if (e.key === 'Escape') {
        closeContextMenu();
        clearBoxSelect();
        if (dragging) { cancelDrag(); return; }
        const wiringActive = useCircuitStore.getState().selectedNodeId;
        selectNode(null);
        if (!wiringActive) selectComponent(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    deleteSelected, dragging, rotateComponent, rotateDrag, selectedComponentId,
    selectNode, selectComponent, cancelDrag, toggleSchematic,
    requestZoomToFit, requestZoomIn, requestZoomOut, requestCameraPreset,
    toggleDesignators, toggleWireVoltageColors,
    toggleValueLabels, closeContextMenu, clearBoxSelect, toggleCurrentLabels, showPolarityLabels, setShowPolarityLabels,
    copySelected, pasteClipboard, selectAll,
  ]);

  return null;
}

function isInputFocused() {
  const tag = document.activeElement?.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}
