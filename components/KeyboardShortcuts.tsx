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
  const cancelDrag          = useDragStore((s) => s.cancel);
  const toggleSchematic     = useSchematicStore((s) => s.toggle);
  const requestZoomToFit    = useUIStore((s) => s.requestZoomToFit);
  const requestCameraPreset = useUIStore((s) => s.requestCameraPreset);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Undo
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useCircuitHistory().getState().undo();
        return;
      }

      // Redo
      if (meta && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        useCircuitHistory().getState().redo();
        return;
      }

      if (isInputFocused()) return;

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Zoom to fit
      if (key === 'f') {
        e.preventDefault();
        requestZoomToFit();
        return;
      }

      // Camera presets
      if (key === '1') { e.preventDefault(); requestCameraPreset('default'); return; }
      if (key === '2') { e.preventDefault(); requestCameraPreset('top');     return; }

      // Rotate selected component
      if (key === 'r' && selectedComponentId) {
        e.preventDefault();
        rotateComponent(selectedComponentId);
        return;
      }

      // Toggle oscilloscope
      if (key === 'o') {
        e.preventDefault();
        useScopeStore.getState().toggle();
        return;
      }

      // Toggle schematic
      if (key === 's') {
        e.preventDefault();
        toggleSchematic();
        return;
      }

      // Escape — cancel drag / deselect
      if (e.key === 'Escape') {
        cancelDrag();
        selectNode(null);
        selectComponent(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    deleteSelected,
    rotateComponent,
    selectedComponentId,
    selectNode,
    selectComponent,
    cancelDrag,
    toggleSchematic,
    requestZoomToFit,
    requestCameraPreset,
  ]);

  return null;
}

function isInputFocused() {
  const tag = document.activeElement?.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}
