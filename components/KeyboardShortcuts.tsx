'use client';

import { useEffect } from 'react';
import { useCircuitStore, useCircuitHistory } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import { useScopeStore } from '@/store/scopeStore';
import { useSchematicStore } from '@/store/schematicStore';
import { useUIStore } from '@/store/uiStore';
import { useBodeStore } from '@/store/bodeStore';
import { useToastStore } from '@/store/toastStore';
import { PITCH } from '@/constants/breadboard';

/**
 * Global keyboard shortcuts — mount once in app/page.tsx.
 *
 *  Ctrl+Z / Cmd+Z            → undo
 *  Ctrl+Shift+Z / Cmd+Shift+Z → redo
 *  Delete / Backspace        → delete selected component/wire
 *  R                         → rotate selected component
 *  O                         → toggle oscilloscope
 *  P                         → toggle polarity labels
 *  T                         → toggle wire thickness by current
 *  D                         → toggle bode plot
 *  S                         → toggle schematic view
 *  F                         → zoom to fit
 *  1 / 2                     → camera presets
 *  Escape                    → cancel drag / deselect
 */
export default function KeyboardShortcuts() {
  const deleteSelected      = useCircuitStore((s) => s.deleteSelected);
  const rotateComponent     = useCircuitStore((s) => s.rotateComponent);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const components         = useCircuitStore((s) => s.components);
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
  const openCanvasSearch    = useUIStore((s) => s.openCanvasSearch);
  const openFindReplace     = useUIStore((s) => s.openFindReplace);
  const requestCameraPreset = useUIStore((s) => s.requestCameraPreset);
  const toggleDesignators   = useUIStore((s) => s.toggleDesignators);
  const toggleWireVoltageColors = useUIStore((s) => s.toggleWireVoltageColors);
  const toggleWireRouting = useUIStore((s) => s.toggleWireRouting);
  const toggleValueLabels = useUIStore((s) => s.toggleValueLabels);
  const closeContextMenu    = useUIStore((s) => s.closeContextMenu);
  const clearBoxSelect      = useUIStore((s) => s.clearBoxSelect);
  const toggleCurrentLabels = useUIStore((s) => s.toggleCurrentLabels);
  const showPolarityLabels  = useUIStore((s) => s.showPolarityLabels);
  const setShowPolarityLabels = useUIStore((s) => s.setShowPolarityLabels);
  const findReplaceOpen = useUIStore((s) => s.findReplaceOpen);
  const closeFindReplace = useUIStore((s) => s.closeFindReplace);
  const openCircuitAudit = useUIStore((s) => s.openCircuitAudit);
  const closeCircuitAudit = useUIStore((s) => s.closeCircuitAudit);
  const circuitAuditOpen = useUIStore((s) => s.circuitAuditOpen);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (isInputFocused()) return;
        openCanvasSearch();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'h') {
        e.preventDefault();
        e.stopPropagation();
        if (isInputFocused()) return;
        openFindReplace();
        return;
      }

      // P1-9: check input focus before all shortcuts (including undo/redo)
      // so browser-native text undo (Ctrl+Z in inputs) is not intercepted
      if (isInputFocused()) return;

      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        const selId = useCircuitStore.getState().selectedComponentId;
        const wiringActive = useCircuitStore.getState().selectedNodeId;
        if (selId && !wiringActive && !dragging) {
          e.preventDefault();
          const dx = key === 'arrowright' ? PITCH : key === 'arrowleft' ? -PITCH : 0;
          const dz = key === 'arrowdown' ? PITCH : key === 'arrowup' ? -PITCH : 0;
          useCircuitStore.getState().nudgeComponent(selId, dx, dz);
          return;
        }
      }

      if (key === 'tab') {
        e.preventDefault();
        const ids = Object.keys(components).sort();
        if (ids.length === 0) return;
        const current = useCircuitStore.getState().selectedComponentId;
        const idx = current ? ids.indexOf(current) : -1;
        const next = e.shiftKey
          ? ids[(idx - 1 + ids.length) % ids.length]
          : ids[(idx + 1) % ids.length];
        useCircuitStore.getState().selectComponent(next);
        return;
      }

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

      if (meta && key === 'n') {
        e.preventDefault();
        useCircuitStore.getState().newCircuit();
        useToastStore.getState().addToast('New circuit — Ctrl+Z to restore', 'info');
        return;
      }

      if (meta && e.shiftKey && key === 'a') {
        e.preventDefault();
        if (isInputFocused()) return;
        openCircuitAudit();
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
        const wireMenu = useUIStore.getState().wireMenu;
        if (wireMenu) {
          useCircuitStore.getState().removeWire(wireMenu.wireId);
          useUIStore.getState().closeWireMenu();
          return;
        }
        if (useCircuitStore.getState().selectedNodeId) {
          selectNode(null);
        } else {
          deleteSelected();
        }
        return;
      }

      // Zoom to fit (F) / Zoom to selected (Shift+F)
      if (key === 'f') {
        e.preventDefault();
        if (e.shiftKey) {
          const selId = useCircuitStore.getState().selectedComponentId;
          if (selId) {
            useUIStore.getState().requestZoomToComponent(selId);
          } else {
            requestZoomToFit();
          }
        } else {
          requestZoomToFit();
        }
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

      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
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
        if (useUIStore.getState().clickToPlaceType) {
          e.preventDefault();
          useUIStore.getState().rotateClickToPlace();
          return;
        }
        if (useUIStore.getState().clickToPlaceBlockId) {
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

      if (!meta && key === 'd') {
        e.preventDefault();
        useBodeStore.getState().toggle();
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

      if (key === 't') {
        e.preventDefault();
        useUIStore.getState().toggleCurrentThickness();
        return;
      }

      if (!meta && key === 'q') {
        e.preventDefault();
        toggleWireRouting();
        return;
      }

      if (key === 'h') {
        e.preventDefault();
        useUIStore.getState().toggleVoltageHeatmap();
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
        if (circuitAuditOpen) {
          e.preventDefault();
          closeCircuitAudit();
          return;
        }
        if (findReplaceOpen) {
          e.preventDefault();
          closeFindReplace();
          return;
        }
        useUIStore.getState().closeInlineEdit();
        closeContextMenu();
        clearBoxSelect();
        // Close wire menu first
        if (useUIStore.getState().wireMenu) {
          useUIStore.getState().closeWireMenu();
          return;
        }
        if (useUIStore.getState().clickToPlaceBlockId) {
          useUIStore.getState().setClickToPlaceBlock(null);
          return;
        }
        if (useUIStore.getState().clickToPlaceType) {
          useUIStore.getState().setClickToPlace(null);
          return;
        }
        if (dragging) { cancelDrag(); return; }
        // Close overlays (scope -> schematic -> help)
        if (useScopeStore.getState().open) { useScopeStore.getState().toggle(); return; }
        if (useSchematicStore.getState().open) { useSchematicStore.getState().toggle(); return; }
        if (useUIStore.getState().showHelp) { useUIStore.getState().toggleHelp(); return; }
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
    openCanvasSearch,
    openFindReplace,
    toggleDesignators, toggleWireVoltageColors,
    toggleValueLabels, closeContextMenu, clearBoxSelect, toggleCurrentLabels, showPolarityLabels, setShowPolarityLabels,
    copySelected, pasteClipboard, selectAll,
    components,
    toggleWireRouting,
    closeFindReplace,
    findReplaceOpen,
    openCircuitAudit,
    closeCircuitAudit,
    circuitAuditOpen,
  ]);

  return null;
}

function isInputFocused() {
  const tag = document.activeElement?.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}
