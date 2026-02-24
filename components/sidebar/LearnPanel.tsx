'use client';

import { useState } from 'react';
import { useModuleStore } from '@/store/moduleStore';
import { MODULES, isModuleUnlocked } from '@/features/modules/definitions';

const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
  battery: 'Battery',
  resistor: 'Resistor',
  led: 'LED',
  capacitor: 'Capacitor',
  diode: 'Diode',
  bjt: 'NPN BJT',
  pnp: 'PNP BJT',
  mosfet: 'MOSFET',
  switch: 'Switch',
  tactileSwitch: 'Tactile Switch',
  potentiometer: 'Potentiometer',
  motor: 'Motor',
  timer555: '555 Timer',
  inductor: 'Inductor',
  arduino: 'Arduino',
  schottky: 'Schottky Diode',
  zener: 'Zener Diode',
  opamp: 'Op-Amp',
};

export default function LearnPanel() {
  const completedModuleIds = useModuleStore((s) => s.completedModuleIds);
  const activeModuleId = useModuleStore((s) => s.activeModuleId);
  const startModule = useModuleStore((s) => s.startModule);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const totalModules = MODULES.length;
  const progressPercent = ((completedModuleIds.length / totalModules) * 100).toFixed(1);

  const toggleExpanded = (modId: string) => {
    setExpandedModuleId((prev) => (prev === modId ? null : modId));
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-2 px-1">
        Guided Modules
      </p>
      <div className="px-1 pb-2">
        <p className="text-[10px] text-white/40 mb-1">
          {completedModuleIds.length} / {totalModules} modules complete
        </p>
        <div className="w-full bg-white/8 rounded h-1.5 overflow-hidden">
          <div
            className="h-1.5 bg-violet-500 rounded transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      {MODULES.map((mod) => {
        const done = completedModuleIds.includes(mod.id);
        const active = activeModuleId === mod.id;
        const unlocked = isModuleUnlocked(mod.id, completedModuleIds);
        const expanded = expandedModuleId === mod.id;
        const actionLabel = active ? 'Continue →' : 'Start →';
        const usedComponents = [...new Set(
          mod.steps
            .map((s) => s.highlightComponent)
            .filter((c): c is NonNullable<typeof c> => Boolean(c)),
        )];
        const prerequisiteTitle = mod.prerequisiteId
          ? MODULES.find((m) => m.id === mod.prerequisiteId)?.title ?? mod.prerequisiteId
          : null;

        return (
          <div
            key={mod.id}
            className={`relative space-y-0.5 border-l-2 ${
              active ? 'border-violet-400' : 'border-transparent'
            }`}
          >
            {done && (
              <span className="absolute right-2 top-2 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center">
                ✓
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                toggleExpanded(mod.id);
              }}
              className={`
                flex items-start gap-2.5 w-full text-left px-2.5 py-2 rounded-md
                transition-colors text-xs
                ${active ? 'bg-[#7c6fff]/20 border border-[#7c6fff]/40' :
                  done ? 'bg-white/[0.04] border border-white/[0.06]' :
                    unlocked ? 'hover:bg-white/[0.06] border border-transparent' :
                      'opacity-40 hover:opacity-60 border border-transparent'}
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
                {(() => {
                  if (usedComponents.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] text-white/25 self-center">Uses:</span>
                      {usedComponents.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08]"
                        >
                          {COMPONENT_DISPLAY_NAMES[c] ?? c}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 text-[9px] text-white/25">
                  <span>{mod.steps.length} steps</span>
                  {mod.prerequisiteId && !isModuleUnlocked(mod.id, completedModuleIds) && (
                    <span>Requires: {prerequisiteTitle}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (unlocked && !active) {
                      startModule(mod.id);
                    }
                  }}
                  disabled={!unlocked}
                  className={`text-[11px] tracking-wide font-medium transition-colors ${
                    unlocked
                      ? 'text-[#8ea4ff] hover:text-[#aebcff]'
                      : 'text-white/20 cursor-not-allowed'
                  }`}
                >
                  {!unlocked ? '🔒 Complete previous module first' : actionLabel}
                </button>
              </div>
            )}
          </div>
        );
      })}
      {confirmingReset ? (
        <div className="flex items-center gap-2 px-1 py-1 mt-1">
          <span className="text-[10px] text-white/50 flex-1">Reset all progress?</span>
          <button
            type="button"
            onClick={() => {
              useModuleStore.getState().resetProgress();
              setConfirmingReset(false);
            }}
            className="text-[10px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 hover:bg-red-800/50"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmingReset(false)}
            className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/50 hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingReset(true)}
          className="text-[10px] text-white/20 hover:text-white/50 self-start px-1 mt-1"
        >
          Reset progress
        </button>
      )}
    </div>
  );
}
