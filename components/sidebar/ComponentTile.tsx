'use client';

import type { ComponentType } from '@/types/circuit';

interface Props {
  type: ComponentType | 'wire';
  label: string;
  icon: React.ReactNode;
  tooltip?: string;
  onAdd?: () => void;
}

export default function ComponentTile({ label, icon, tooltip, onAdd }: Props) {
  return (
    <button
      title={tooltip ?? label}
      onClick={onAdd}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left
                 transition-colors duration-100
                 hover:bg-white/[0.08] active:bg-white/[0.12]
                 text-[13px] text-[#c8c8d0] hover:text-white"
    >
      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-sm">
        {icon}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}
