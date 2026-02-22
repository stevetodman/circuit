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
  simSpeed: number;
  simPaused: boolean;
  overloadIds: string[];
  showCurrentLabels: boolean;
  showPolarityLabels: boolean;
  showWireVoltageColors: boolean;
  showValueLabels: boolean;
  sab: SharedArrayBuffer | null;
  showHelp: boolean;
  showDesignators: boolean;
  zoomToFit: boolean;
  arduinoTabRequested: number;
  zoomInRequested: number;
  zoomOutRequested: number;
  arduinoTabRequested: number;
  cameraPreset: 'default' | 'top' | null;
  serialOutput: string;
  contextMenu: {
    componentId: string;
    x: number;
    y: number;
  } | null;
  wireMenu: {
    wireId: string;
    x: number;
    y: number;
  } | null;
  boxSelect: BoxSelectState | null;
  boxSelectRect: DOMRect | null;
  circuitHealthWarning: string | null;

  setHoveredNode:      (id: string | null) => void;
  setMousePos:         (x: number, y: number) => void;
  setSimStatus:        (status: 'idle' | 'running' | 'error', error?: string | null) => void;
  setSimError:         (error: string | null) => void;
  dismissSimError:     () => void;
  setPower:            (power: number) => void;
  setSimSpeed:         (speed: number) => void;
  toggleSimPaused: () => void;
  setOverloadIds:      (ids: string[]) => void;
  toggleCurrentLabels: () => void;
  setShowPolarityLabels: (showPolarityLabels: boolean) => void;
  toggleWireVoltageColors: () => void;
  setSAB:              (sab: SharedArrayBuffer) => void;
  toggleHelp:          () => void;
  toggleDesignators:   () => void;
  toggleValueLabels:  () => void;
  openContextMenu:     (componentId: string, x: number, y: number) => void;
  closeContextMenu:    () => void;
  openWireMenu:       (wireId: string, x: number, y: number) => void;
  closeWireMenu:      () => void;
  requestZoomToFit:    () => void;
  requestArduinoTab:   () => void;
  clearZoomToFit:      () => void;
  requestZoomIn:       () => void;
  requestZoomOut:      () => void;
  requestArduinoTab:   () => void;
  requestCameraPreset: (preset: 'default' | 'top') => void;
  clearCameraPreset:   () => void;
  setCircuitHealthWarning: (warning: string | null) => void;
  appendSerialOutput:  (text: string) => void;
  clearSerialOutput:   () => void;
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
  simSpeed:      1,
  simPaused:     false,
  overloadIds:   [],
  showCurrentLabels: false,
  showPolarityLabels: true,
  showWireVoltageColors: true,
  showValueLabels: true,
  sab:           null,
  showHelp:      false,
  showDesignators: true,
  zoomToFit:     false,
  arduinoTabRequested: 0,
  zoomInRequested: 0,
  zoomOutRequested: 0,
  arduinoTabRequested: 0,
  cameraPreset:  null,
  serialOutput:  '',
  contextMenu:    null,
  wireMenu:       null,
  boxSelect:      null,
  boxSelectRect:  null,
  circuitHealthWarning: null,

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
  setSimSpeed:  (speed) => set({ simSpeed: speed }),
  toggleSimPaused: () => set((s) => ({ simPaused: !s.simPaused })),
  setOverloadIds: (ids) => set({ overloadIds: ids }),
  toggleCurrentLabels: () => set((state) => ({ showCurrentLabels: !state.showCurrentLabels })),
  setShowPolarityLabels: (showPolarityLabels) => set({ showPolarityLabels }),
  toggleWireVoltageColors: () => set((state) => ({ showWireVoltageColors: !state.showWireVoltageColors })),
  setSAB:         (sab) => set({ sab }),
  toggleHelp:     () => set((state) => ({ showHelp: !state.showHelp })),
  toggleDesignators: () => set((state) => ({ showDesignators: !state.showDesignators })),
  toggleValueLabels: () => set((state) => ({ showValueLabels: !state.showValueLabels })),
  openContextMenu: (componentId, x, y) => set({ contextMenu: { componentId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openWireMenu: (wireId, x, y) => set({ wireMenu: { wireId, x, y } }),
  closeWireMenu: () => set({ wireMenu: null }),
  requestZoomToFit:    () => set({ zoomToFit: true }),
  requestArduinoTab:   () => set((s) => ({ arduinoTabRequested: s.arduinoTabRequested + 1 })),
  clearZoomToFit:      () => set({ zoomToFit: false }),
  requestZoomIn:       () => set((s) => ({ zoomInRequested: s.zoomInRequested + 1 })),
  requestZoomOut:      () => set((s) => ({ zoomOutRequested: s.zoomOutRequested + 1 })),
  requestArduinoTab:   () => set((s) => ({ arduinoTabRequested: s.arduinoTabRequested + 1 })),
  requestCameraPreset: (preset) => set({ cameraPreset: preset }),
  clearCameraPreset:   () => set({ cameraPreset: null }),
  setCircuitHealthWarning: (warning) => set({ circuitHealthWarning: warning }),
  appendSerialOutput: (text) => set((state) => {
    const next = `${state.serialOutput}${text}`;
    return { serialOutput: next.length > 10_000 ? next.slice(-10_000) : next };
  }),
  clearSerialOutput: () => set({ serialOutput: '' }),
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
