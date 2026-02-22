'use client';

import { useEffect, useRef } from 'react';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

const MENU_ITEMS = [
  { key: 'delete', label: 'Delete' },
  { key: 'rotate', label: 'Rotate 90°' },
  { key: 'duplicate', label: 'Duplicate' },
  { key: 'properties', label: 'Properties' },
] as const;

export default function ContextMenu() {
  const contextMenu = useUIStore((s) => s.contextMenu);
  const closeContextMenu = useUIStore((s) => s.closeContextMenu);

  const removeComponent = useCircuitStore((s) => s.removeComponent);
  const rotateComponent = useCircuitStore((s) => s.rotateComponent);
  const copySelected = useCircuitStore((s) => s.copySelected);
  const pasteClipboard = useCircuitStore((s) => s.pasteClipboard);
  const selectComponent = useCircuitStore((s) => s.selectComponent);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) return;
      closeContextMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const { componentId, x, y } = contextMenu;

  const run = (action: () => void) => {
    action();
    closeContextMenu();
  };

  const itemLabelToAction = (key: string) => {
    if (key === 'delete') {
      run(() => removeComponent(componentId));
      return;
    }
    if (key === 'rotate') {
      run(() => rotateComponent(componentId));
      return;
    }
    if (key === 'duplicate') {
      run(() => {
        selectComponent(componentId);
        copySelected();
        pasteClipboard();
      });
      return;
    }
    if (key === 'properties') {
      run(() => selectComponent(componentId));
      return;
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-40 min-w-[160px] rounded border border-white/15 bg-[#161616] shadow-2xl overflow-hidden"
      style={{ left: `${x}px`, top: `${y}px` }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {MENU_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className="w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
          onClick={() => itemLabelToAction(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
