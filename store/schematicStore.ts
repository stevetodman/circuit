import { create } from 'zustand';

interface SchematicState {
  open: boolean;
  toggle: () => void;
}

export const useSchematicStore = create<SchematicState>()((set) => ({
  open: false,
  toggle: () => set((state) => ({ open: !state.open })),
}));
