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
  const toggleComponentLock = useCircuitStore((s) => s.toggleComponentLock);
  const components = useCircuitStore((s) => s.components);
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
  const isLocked = components[componentId]?.locked ?? false;

  // F10.5: clamp so menu never overflows viewport
  const MENU_W = 160;
  const MENU_H = (MENU_ITEMS.length + 1) * 33 + 4;
  const PAD = 8;
  const cx = Math.min(x, window.innerWidth  - MENU_W - PAD);
  const cy = Math.min(y, window.innerHeight - MENU_H - PAD);

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
      style={{ left: `${cx}px`, top: `${cy}px` }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"
        onClick={() => {
          toggleComponentLock(componentId);
          closeContextMenu();
        }}
      >
        {isLocked ? '🔓 Unlock' : '🔒 Lock'}
      </button>
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

export function WireContextMenu() {
  const wireMenu = useUIStore((s) => s.wireMenu);
  const closeWireMenu = useUIStore((s) => s.closeWireMenu);
  const updateWireColor = useCircuitStore((s) => s.updateWireColor);
  const removeWire = useCircuitStore((s) => s.removeWire);

  if (!wireMenu) return null;

  const WIRE_COLORS = ['#cc3333', '#3399ff', '#33cc66', '#ffaa00', '#cc66ff', '#ffffff', '#aaaaaa'];

  return (
    <div
      className="fixed z-50 bg-[#18181c] border border-white/[0.12] rounded-lg shadow-2xl py-1.5 min-w-[160px]"
      style={{ left: wireMenu.x, top: wireMenu.y }}
      onMouseLeave={closeWireMenu}
    >
      <div className="px-3 py-1 flex flex-wrap gap-1.5">
        {WIRE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { updateWireColor(wireMenu.wireId, c); closeWireMenu(); }}
            className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
      <div className="h-px bg-white/[0.08] mx-2 my-1" />
      <button
        onClick={() => { removeWire(wireMenu.wireId); closeWireMenu(); }}
        className="w-full px-3 py-1.5 text-left text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
      >
        Delete wire
      </button>
    </div>
  );
}
