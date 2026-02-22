import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Module } from '@/features/modules/types';
import { MODULES } from '@/features/modules/definitions';

interface ModuleStore {
  activeModuleId: string | null;
  activeStepIndex: number;
  completedModuleIds: string[];

  activeModule: Module | null;
  activeStep: Module['steps'][number] | null;
  isModuleActive: boolean;

  startModule: (id: string) => void;
  advanceStep: () => void;
  exitModule: () => void;
  resetProgress: () => void;
}

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set, get) => ({
      activeModuleId: null,
      activeStepIndex: 0,
      completedModuleIds: [],

      get activeModule() {
        return MODULES.find((m) => m.id === get().activeModuleId) ?? null;
      },
      get activeStep() {
        const mod = get().activeModule;
        return mod?.steps[get().activeStepIndex] ?? null;
      },
      get isModuleActive() {
        return get().activeModuleId !== null;
      },

      startModule(id: string) {
        set({ activeModuleId: id, activeStepIndex: 0 });
      },
      advanceStep() {
        const mod = get().activeModule;
        if (!mod) return;
        const nextIdx = get().activeStepIndex + 1;
        if (nextIdx >= mod.steps.length) {
          set((s) => ({
            activeModuleId: null,
            activeStepIndex: 0,
            completedModuleIds: s.completedModuleIds.includes(mod.id)
              ? s.completedModuleIds
              : [...s.completedModuleIds, mod.id],
          }));
        } else {
          set({ activeStepIndex: nextIdx });
        }
      },
      exitModule() {
        set({ activeModuleId: null, activeStepIndex: 0 });
      },
      resetProgress() {
        set({ activeModuleId: null, activeStepIndex: 0, completedModuleIds: [] });
      },
    }),
    { name: 'circuit-modules' },
  ),
);
