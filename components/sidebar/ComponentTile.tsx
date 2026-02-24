'use client';

import { useRef, type PointerEvent } from 'react';
import type { ComponentType } from '@/types/circuit';
import { useModuleStore } from '@/store/moduleStore';

interface Props {
  type: ComponentType | 'wire';
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  description?: string;
  highlightQuery?: string;
  onClick?: () => void;
  onAdd?: () => void;
  onClickToPlace?: () => void;
}

function HighlightLabel({ label, query }: { label: string; query: string }) {
  if (!query) return <>{label}</>;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{label}</>;

  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-amber-400/30 text-amber-200 rounded-sm px-0.5 not-italic">
        {label.slice(idx, idx + query.length)}
      </mark>
      {label.slice(idx + query.length)}
    </>
  );
}

export default function ComponentTile({
  type,
  label,
  icon,
  tooltip,
  description,
  highlightQuery,
  onClick,
  onAdd,
  onClickToPlace,
}: Props) {
  const highlightComponent = useModuleStore((s) => s.activeStep?.highlightComponent ?? null);
  const isHighlighted = highlightComponent !== null && highlightComponent === (type as string);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const dragStarted = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    dragStarted.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!pointerDownPos.current) return;
    const dx = event.clientX - pointerDownPos.current.x;
    const dy = event.clientY - pointerDownPos.current.y;
    if (Math.sqrt((dx * dx) + (dy * dy)) > 5) {
      moved.current = true;
      if (!dragStarted.current && onAdd) {
        dragStarted.current = true;
        onAdd();
      }
    }
  };

  const onPointerUp = () => {
    if (!pointerDownPos.current) return;

    if (!moved.current) {
      if (onClickToPlace) {
        onClickToPlace();
      } else if (onClick) {
        onClick();
      } else if (onAdd) {
        onAdd();
      }
    }

    pointerDownPos.current = null;
    moved.current = false;
    dragStarted.current = false;
  };

  const onPointerCancel = () => {
    pointerDownPos.current = null;
    moved.current = false;
    dragStarted.current = false;
  };

  return (
    <button
      title={tooltip ?? label}
      draggable={false}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`group flex items-center w-full px-3 py-2 rounded-md text-left
                 transition-colors duration-100
                 cursor-grab active:cursor-grabbing
                 hover:bg-white/[0.08] active:bg-white/[0.12]
                 focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none
                 ${isHighlighted ? 'ring-1 ring-[#7c6fff]/70 animate-pulse' : ''}`}
    >
      <div className="flex items-center gap-2.5 w-full min-w-0">
        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-sm">
          {icon}
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="leading-none text-[13px] text-[#c8c8d0] group-hover:text-white">
            <HighlightLabel label={label} query={highlightQuery ?? ''} />
          </span>
          {description && (
            <span className="text-[10px] text-white/28 leading-tight truncate mt-0.5">{description}</span>
          )}
        </div>
      </div>
    </button>
  );
}
