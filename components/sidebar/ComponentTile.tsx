'use client';

import type { ComponentType } from '@/types/circuit';
import { useModuleStore } from '@/store/moduleStore';

interface Props {
  type: ComponentType | 'wire';
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  onAdd?: () => void;
}

export default function ComponentTile({ type, label, icon, tooltip, onAdd }: Props) {
  const highlightComponent = useModuleStore((s) => s.activeStep?.highlightComponent ?? null);
  const isHighlighted = highlightComponent !== null && highlightComponent === (type as string);

  return (
    <button
      title={tooltip ?? label}
      onClick={onAdd}
      draggable={false}
      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left
                 transition-colors duration-100
                 cursor-grab active:cursor-grabbing
                 hover:bg-white/[0.08] active:bg-white/[0.12]
                 text-[13px] text-[#c8c8d0] hover:text-white focus-visible:ring-2 focus-visible:ring-[#7c6fff] focus-visible:outline-none
                 ${isHighlighted ? 'ring-1 ring-[#7c6fff]/70 animate-pulse' : ''}`}
    >
      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-sm">
        {icon}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}
