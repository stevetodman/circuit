import { create } from 'zustand';

export interface ACSweepPoint {
  freq: number;
  gainDB: number;
  phaseDeg: number;
}

interface BodeStore {
  open: boolean;
  probeNetId: number | null;
  fMin: number;
  fMax: number;
  numPoints: number;
  result: ACSweepPoint[] | null;
  isRunning: boolean;
  toggle: () => void;
  close: () => void;
  setProbeNetId: (id: number | null) => void;
  setFreqRange: (fMin: number, fMax: number) => void;
  setResult: (r: ACSweepPoint[] | null) => void;
  setRunning: (v: boolean) => void;
}

export const useBodeStore = create<BodeStore>((set) => ({
  open: false,
  probeNetId: null,
  fMin: 1,
  fMax: 1e6,
  numPoints: 100,
  result: null,
  isRunning: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  setProbeNetId: (id) => set({ probeNetId: id }),
  setFreqRange: (fMin, fMax) => set({ fMin, fMax }),
  setResult: (result) => set({ result }),
  setRunning: (isRunning) => set({ isRunning }),
}));
