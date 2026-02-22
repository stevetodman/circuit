'use client';

import { useModuleStore } from '@/store/moduleStore';
import { MODULES, isModuleUnlocked } from '@/features/modules/definitions';

export default function LearnPanel() {
  const { completedModuleIds, activeModuleId, startModule, exitModule } = useModuleStore((s) => ({
    completedModuleIds: s.completedModuleIds,
    activeModuleId: s.activeModuleId,
    startModule: s.startModule,
    exitModule: s.exitModule,
  }));

  return (
    <div className="flex flex-col gap-1 p-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2 px-1">
        Guided Modules
      </p>
      {MODULES.map((mod) => {
        const done = completedModuleIds.includes(mod.id);
        const active = activeModuleId === mod.id;
        const unlocked = isModuleUnlocked(mod.id, completedModuleIds);

        return (
          <button
            key={mod.id}
            type="button"
            disabled={!unlocked}
            onClick={() => (active ? exitModule() : startModule(mod.id))}
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
        );
      })}
    </div>
  );
}
