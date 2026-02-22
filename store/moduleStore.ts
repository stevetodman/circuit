import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Module } from '@/features/modules/types';
import { MODULES } from '@/features/modules/definitions';

interface ModuleStore {
  activeModuleId: string | null;
  activeStepIndex: number;
  completedModuleIds: string[];
  justCompleted: boolean;

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
    (set, get) => {
      let completionTimer: ReturnType<typeof setTimeout> | null = null;

      const clearCompletionTimer = () => {
        if (completionTimer) {
          clearTimeout(completionTimer);
          completionTimer = null;
        }
      };

      return {
      activeModuleId: null,
      activeStepIndex: 0,
      completedModuleIds: [],
      justCompleted: false,

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
        if (get().activeModuleId === id) return;
        clearCompletionTimer();
        set({ activeModuleId: id, activeStepIndex: 0 });
      },
      advanceStep() {
        const mod = get().activeModule;
        if (!mod) return;
        const nextIdx = get().activeStepIndex + 1;
        if (nextIdx >= mod.steps.length) {
          clearCompletionTimer();
          set((s) => ({
            justCompleted: true,
            activeStepIndex: get().activeStepIndex,
            completedModuleIds: s.completedModuleIds.includes(mod.id)
              ? s.completedModuleIds
              : [...s.completedModuleIds, mod.id],
          }));
          completionTimer = setTimeout(() => {
            get().exitModule();
            set({ justCompleted: false });
          }, 2500);
        } else {
          set({ activeStepIndex: nextIdx });
        }
      },
      exitModule() {
        clearCompletionTimer();
        set({ activeModuleId: null, activeStepIndex: 0, justCompleted: false });
      },
      resetProgress() {
        clearCompletionTimer();
        set({ activeModuleId: null, activeStepIndex: 0, completedModuleIds: [], justCompleted: false });
      },
      };
    },
    { name: 'circuit-modules' },
  ),
);
