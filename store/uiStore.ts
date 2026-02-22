'use client';

/**
 * Lightweight UI state that doesn't need undo/redo tracking.
 * Shared between canvas components and sidebar indicators.
 */
import { create } from 'zustand';

interface UIState {
  hoveredNodeId: string | null;
  simStatus: 'idle' | 'running' | 'error';
  simError: string | null;
  power: number;
  showCurrentLabels: boolean;
  sab: SharedArrayBuffer | null;
  showHelp: boolean;
  zoomToFit: boolean;
  cameraPreset: 'default' | 'top' | null;

  setHoveredNode:      (id: string | null) => void;
  setSimStatus:        (status: 'idle' | 'running' | 'error', error?: string | null) => void;
  setPower:            (power: number) => void;
  toggleCurrentLabels: () => void;
  setSAB:              (sab: SharedArrayBuffer) => void;
  toggleHelp:          () => void;
  requestZoomToFit:    () => void;
  clearZoomToFit:      () => void;
  requestCameraPreset: (preset: 'default' | 'top') => void;
  clearCameraPreset:   () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  hoveredNodeId: null,
  simStatus:     'idle',
  simError:      null,
  power:         0,
  showCurrentLabels: false,
  sab:           null,
  showHelp:      false,
  zoomToFit:     false,
  cameraPreset:  null,

  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setSimStatus:   (status, error = undefined) => set({ simStatus: status, simError: error ?? null }),
  setPower:      (power) => set({ power }),
  toggleCurrentLabels: () => set((state) => ({ showCurrentLabels: !state.showCurrentLabels })),
  setSAB:         (sab) => set({ sab }),
  toggleHelp:     () => set((state) => ({ showHelp: !state.showHelp })),
  requestZoomToFit:    () => set({ zoomToFit: true }),
  clearZoomToFit:      () => set({ zoomToFit: false }),
  requestCameraPreset: (preset) => set({ cameraPreset: preset }),
  clearCameraPreset:   () => set({ cameraPreset: null }),
}));
