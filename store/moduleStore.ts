'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ModuleStep {
  id: string;
  instruction: string;
  hint?: string;
  spotlightTarget?: string;
  highlightComponent?: string;
  validate: (state: unknown) => boolean;
}

export interface Module {
  id: string;
  title: string;
  subtitle: string;
  concept: string;
  prerequisiteId?: string;
  steps: ModuleStep[];
}

interface ModuleStore {
  activeModuleId: string | null;
  activeStepIndex: number;
  completedModuleIds: string[];
  startModule: (id: string) => void;
  advanceStep: () => void;
  exitModule: () => void;
  resetProgress: () => void;
}

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set) => ({
      activeModuleId: null,
      activeStepIndex: 0,
      completedModuleIds: [],
      startModule: (id) => set({ activeModuleId: id, activeStepIndex: 0 }),
      advanceStep: () => {
        set((s) => ({ activeStepIndex: s.activeStepIndex + 1 }));
      },
      exitModule: () => set({ activeModuleId: null, activeStepIndex: 0 }),
      resetProgress: () => set({ activeModuleId: null, activeStepIndex: 0, completedModuleIds: [] }),
    }),
    { name: 'circuit-modules' },
  ),
);
