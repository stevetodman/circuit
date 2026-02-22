'use client';

/**
 * Lightweight UI state that doesn't need undo/redo tracking.
 * Shared between canvas components and sidebar indicators.
 */
import { create } from 'zustand';

interface BoxSelectState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface UIState {
  hoveredNodeId: string | null;
  mouseX: number;
  mouseY: number;
  simStatus: 'idle' | 'running' | 'error';
  simError: string | null;
  simErrorDismissed: boolean;
  power: number;
  showCurrentLabels: boolean;
  sab: SharedArrayBuffer | null;
  showHelp: boolean;
  showDesignators: boolean;
  zoomToFit: boolean;
  cameraPreset: 'default' | 'top' | null;
  contextMenu: {
    componentId: string;
    x: number;
    y: number;
  } | null;
  boxSelect: BoxSelectState | null;
  boxSelectRect: DOMRect | null;

  setHoveredNode:      (id: string | null) => void;
  setMousePos:         (x: number, y: number) => void;
  setSimStatus:        (status: 'idle' | 'running' | 'error', error?: string | null) => void;
  setSimError:         (error: string | null) => void;
  dismissSimError:     () => void;
  setPower:            (power: number) => void;
  toggleCurrentLabels: () => void;
  setSAB:              (sab: SharedArrayBuffer) => void;
  toggleHelp:          () => void;
  toggleDesignators:   () => void;
  openContextMenu:     (componentId: string, x: number, y: number) => void;
  closeContextMenu:    () => void;
  requestZoomToFit:    () => void;
  clearZoomToFit:      () => void;
  requestCameraPreset: (preset: 'default' | 'top') => void;
  clearCameraPreset:   () => void;
  startBoxSelect:      (startX: number, startY: number) => void;
  updateBoxSelect:     (endX: number, endY: number) => void;
  clearBoxSelect:      () => void;
}

const makeBoxSelectRect = (state: BoxSelectState) => {
  const left = Math.min(state.startX, state.endX);
  const top = Math.min(state.startY, state.endY);
  return new DOMRect(left, top, Math.abs(state.endX - state.startX), Math.abs(state.endY - state.startY));
};

export const useUIStore = create<UIState>()((set) => ({
  hoveredNodeId: null,
  mouseX:       0,
  mouseY:       0,
  simStatus:     'idle',
  simError:      null,
  simErrorDismissed: false,
  power:         0,
  showCurrentLabels: false,
  sab:           null,
  showHelp:      false,
  showDesignators: true,
  zoomToFit:     false,
  cameraPreset:  null,
  contextMenu:    null,
  boxSelect:      null,
  boxSelectRect:  null,

  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setMousePos:    (x, y) => set({ mouseX: x, mouseY: y }),
  setSimStatus:   (status, error = undefined) => set({
    simStatus: status,
    simError: error ?? null,
    ...(status === 'error' && error != null ? { simErrorDismissed: false } : {}),
  }),
  setSimError:    (error) => set({
    simError: error,
    ...(error != null ? { simErrorDismissed: false } : {}),
  }),
  dismissSimError: () => set({ simErrorDismissed: true }),
  setPower:      (power) => set({ power }),
  toggleCurrentLabels: () => set((state) => ({ showCurrentLabels: !state.showCurrentLabels })),
  setSAB:         (sab) => set({ sab }),
  toggleHelp:     () => set((state) => ({ showHelp: !state.showHelp })),
  toggleDesignators: () => set((state) => ({ showDesignators: !state.showDesignators })),
  openContextMenu: (componentId, x, y) => set({ contextMenu: { componentId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  requestZoomToFit:    () => set({ zoomToFit: true }),
  clearZoomToFit:      () => set({ zoomToFit: false }),
  requestCameraPreset: (preset) => set({ cameraPreset: preset }),
  clearCameraPreset:   () => set({ cameraPreset: null }),
  startBoxSelect: (startX, startY) => {
    const boxSelect = { startX, startY, endX: startX, endY: startY };
    set({ boxSelect, boxSelectRect: makeBoxSelectRect(boxSelect) });
  },
  updateBoxSelect: (endX, endY) =>
    set((state) => {
      if (!state.boxSelect) return state;
      const boxSelect = { ...state.boxSelect, endX, endY };
      return { boxSelect, boxSelectRect: makeBoxSelectRect(boxSelect) };
    }),
  clearBoxSelect: () => set({ boxSelect: null, boxSelectRect: null }),
}));
