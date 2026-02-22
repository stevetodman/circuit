'use client';

import { useEffect } from 'react';
import { useCircuitStore, useCircuitHistory } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import { useScopeStore } from '@/store/scopeStore';

/**
 * Global keyboard shortcuts — mount once in app/page.tsx.
 *
 *  Ctrl+Z / Cmd+Z        → undo
 *  Ctrl+Shift+Z / Cmd+Shift+Z → redo
 *  Delete / Backspace    → delete selected component/wire
 *  Escape                → cancel drag / deselect
 */
export default function KeyboardShortcuts() {
  const deleteSelected = useCircuitStore((s) => s.deleteSelected);
  const selectNode = useCircuitStore((s) => s.selectNode);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const cancelDrag = useDragStore((s) => s.cancel);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

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

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused()) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if (e.key.toLowerCase() === 'o' && !isInputFocused()) {
        e.preventDefault();
        useScopeStore.getState().toggle();
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
  }, [deleteSelected, selectNode, selectComponent, cancelDrag]);

  return null;
}

function isInputFocused() {
  const tag = document.activeElement?.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}
