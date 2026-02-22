import { create } from 'zustand';

interface SchematicState {
  open: boolean;
  toggle: () => void;
  manualPositions: Record<string, { x: number; y: number }>;
  setManualPosition: (id: string, x: number, y: number) => void;
  clearManualPositions: () => void;
}

export const useSchematicStore = create<SchematicState>()((set) => ({
  open: false,
  toggle: () => set((state) => ({ open: !state.open })),
  manualPositions: {},
  setManualPosition: (id, x, y) =>
    set((state) => ({
      manualPositions: {
        ...state.manualPositions,
        [id]: { x, y },
      },
    })),
  clearManualPositions: () => set({ manualPositions: {} }),
}));
