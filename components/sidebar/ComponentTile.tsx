'use client';

import type { ComponentType } from '@/types/circuit';
import { useModuleStore } from '@/store/moduleStore';

interface Props {
  type: ComponentType | 'wire';
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  description?: string;
  onAdd?: () => void;
}

export default function ComponentTile({ type, label, icon, tooltip, description, onAdd }: Props) {
  const highlightComponent = useModuleStore((s) => s.activeStep?.highlightComponent ?? null);
  const isHighlighted = highlightComponent !== null && highlightComponent === (type as string);

  return (
    <button
      title={tooltip ?? label}
      onClick={onAdd}
      draggable={false}
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
          <span className="leading-none text-[13px] text-[#c8c8d0] group-hover:text-white">{label}</span>
          {description && (
            <span className="text-[10px] text-white/28 leading-tight truncate mt-0.5">{description}</span>
          )}
        </div>
      </div>
    </button>
  );
}
