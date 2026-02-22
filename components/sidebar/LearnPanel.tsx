'use client';

import { useState } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, isModuleUnlocked } from '@/features/modules/definitions';

export default function LearnPanel() {
  const completedModuleIds = useModuleStore((s) => s.completedModuleIds);
  const activeModuleId = useModuleStore((s) => s.activeModuleId);
  const startModule = useModuleStore((s) => s.startModule);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const toggleExpanded = (modId: string) => {
    setExpandedModuleId((prev) => (prev === modId ? null : modId));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2 px-1">
        Guided Modules
      </p>
      {MODULES.map((mod) => {
        const done = completedModuleIds.includes(mod.id);
        const active = activeModuleId === mod.id;
        const unlocked = isModuleUnlocked(mod.id, completedModuleIds);
        const expanded = expandedModuleId === mod.id;
        const actionLabel = active ? 'Continue →' : 'Start →';

        return (
          <div key={mod.id} className="space-y-0.5">
            <button
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return;
                toggleExpanded(mod.id);
              }}
              className={`
                flex items-start gap-2.5 w-full text-left px-2.5 py-2 rounded-md
                transition-colors text-xs
                ${active ? 'bg-[#7c6fff]/20 border border-[#7c6fff]/40' :
                  done ? 'bg-white/[0.04] border border-white/[0.06]' :
                    unlocked ? 'hover:bg-white/[0.06] border border-transparent' :
                      'opacity-30 cursor-not-allowed border border-transparent'}
              `}
            >
              <span className="mt-0.5 shrink-0 text-[11px]">
                {done ? '✓' : active ? '▶' : unlocked ? '○' : '🔒'}
              </span>
              <div>
                <p className={`font-medium ${done ? 'text-white/50' : 'text-white/80'}`}>
                  {mod.title}
                </p>
                <p className="text-white/30 text-[10px] mt-0.5">{mod.subtitle}</p>
              </div>
            </button>
            {expanded && (
              <div className="px-2.5 pb-2 pt-1 space-y-2">
                <p className="text-white/45 text-[10px] leading-relaxed">{mod.concept}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!active) {
                      startModule(mod.id);
                    }
                  }}
                  className="text-[11px] tracking-wide text-[#8ea4ff] hover:text-[#aebcff] font-medium"
                >
                  {actionLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
