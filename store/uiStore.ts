'use client';

/**
 * Lightweight UI state that doesn't need undo/redo tracking.
 * Shared between canvas components and sidebar indicators.
 * Visualization preferences are persisted to localStorage.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ComponentType } from '@/types/circuit';

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
  wireValidationStatus: 'clean' | 'short' | null;
  wireValidationMessage: string | null;
  wireRoutingMode: 'curve' | 'orthogonal';
  simStatus: 'idle' | 'running' | 'error' | 'warn';
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
  showCurrentThickness: boolean;
  showVoltageHeatmap: boolean;
  sab: SharedArrayBuffer | null;
  showHelp: boolean;
  showSidebar: boolean;
  showDesignators: boolean;
  zoomToFit: boolean;
  arduinoTabRequested: number;
  zoomInRequested: number;
  zoomOutRequested: number;
  cameraPreset: 'default' | 'top' | null;
  serialOutput: string;
  contextMenu: {
    componentId: string;
    x: number;
    y: number;
  } | null;
  canvasMenu: {
    x: number;
    y: number;
  } | null;
  recentlyUsedTypes: string[];
  wireMenu: {
    wireId: string;
    x: number;
    y: number;
  } | null;
  boxSelect: BoxSelectState | null;
  boxSelectRect: DOMRect | null;
  circuitHealthWarning: string | null;
  clickToPlaceType: ComponentType | null;
  clickToPlaceRotation: number;
  snapTargetNodeIds: string[];
  zoomToComponentId: string | null;
  editingNoteId: string | null;

  setHoveredNode:      (id: string | null) => void;
  setMousePos:         (x: number, y: number) => void;
  setSimStatus:        (status: 'idle' | 'running' | 'error' | 'warn', error?: string | null) => void;
  setSimError:         (error: string | null) => void;
  dismissSimError:     () => void;
  setPower:            (power: number) => void;
  setSimSpeed:         (speed: number) => void;
  toggleSimPaused: () => void;
  setOverloadIds:      (ids: string[]) => void;
  toggleCurrentLabels: () => void;
  toggleCurrentThickness: () => void;
  toggleVoltageHeatmap: () => void;
  setShowPolarityLabels: (showPolarityLabels: boolean) => void;
  toggleWireVoltageColors: () => void;
  toggleWireRouting: () => void;
  setSAB:              (sab: SharedArrayBuffer) => void;
  toggleHelp:          () => void;
  toggleSidebar:       () => void;
  toggleDesignators:   () => void;
  toggleValueLabels:  () => void;
  openContextMenu:     (componentId: string, x: number, y: number) => void;
  closeContextMenu:    () => void;
  openCanvasMenu:     (x: number, y: number) => void;
  closeCanvasMenu:    () => void;
  addRecentlyUsedType: (type: string) => void;
  openWireMenu:       (wireId: string, x: number, y: number) => void;
  closeWireMenu:      () => void;
  requestZoomToFit:    () => void;
  requestArduinoTab:   () => void;
  clearZoomToFit:      () => void;
  requestZoomIn:       () => void;
  requestZoomOut:      () => void;
  requestCameraPreset: (preset: 'default' | 'top') => void;
  clearCameraPreset:   () => void;
  setCircuitHealthWarning: (warning: string | null) => void;
  setClickToPlace: (type: ComponentType | null) => void;
  rotateClickToPlace: () => void;
  setSnapTargetNodeIds: (ids: string[]) => void;
  requestZoomToComponent: (id: string) => void;
  clearZoomToComponent: () => void;
  appendSerialOutput:  (text: string) => void;
  clearSerialOutput:   () => void;
  startBoxSelect:      (startX: number, startY: number) => void;
  updateBoxSelect:     (endX: number, endY: number) => void;
  clearBoxSelect:      () => void;
  setWireValidationStatus: (status: 'clean' | 'short' | null, message?: string | null) => void;
  setEditingNoteId: (id: string | null) => void;
}

const makeBoxSelectRect = (state: BoxSelectState) => {
  const left = Math.min(state.startX, state.endX);
  const top = Math.min(state.startY, state.endY);
  return new DOMRect(left, top, Math.abs(state.endX - state.startX), Math.abs(state.endY - state.startY));
};

export const useUIStore = create<UIState>()(
  persist(
  (set) => ({
  hoveredNodeId: null,
  mouseX:       0,
  mouseY:       0,
  wireValidationStatus: null,
  wireValidationMessage: null,
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
  showCurrentThickness: false,
  wireRoutingMode: 'curve',
  showVoltageHeatmap: false,
  sab:           null,
  showHelp:      false,
  showSidebar:   true,
  showDesignators: true,
  zoomToFit:     false,
  arduinoTabRequested: 0,
  zoomInRequested: 0,
  zoomOutRequested: 0,
  cameraPreset:  null,
  serialOutput:  '',
  contextMenu:    null,
  canvasMenu:     null,
  wireMenu:       null,
  boxSelect:      null,
  boxSelectRect:  null,
  circuitHealthWarning: null,
  clickToPlaceType: null,
  clickToPlaceRotation: 0,
  snapTargetNodeIds: [],
  zoomToComponentId: null,
  editingNoteId: null,
  setWireValidationStatus: (status, message = null) => set({
    wireValidationStatus: status,
    wireValidationMessage: message,
  }),

  recentlyUsedTypes: [],
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setMousePos:    (x, y) => set({ mouseX: x, mouseY: y }),
  setSimStatus:   (status, error = undefined) => set({
    simStatus: status,
    ...(error !== undefined ? { simError: error ?? null } : {}),
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
  toggleSidebar:  () => set((s) => ({ showSidebar: !s.showSidebar })),
  toggleDesignators: () => set((state) => ({ showDesignators: !state.showDesignators })),
  toggleValueLabels: () => set((state) => ({ showValueLabels: !state.showValueLabels })),
  toggleWireRouting: () => set((state) => ({ wireRoutingMode: state.wireRoutingMode === 'curve' ? 'orthogonal' : 'curve' })),
  toggleCurrentThickness: () => set((state) => ({ showCurrentThickness: !state.showCurrentThickness })),
  toggleVoltageHeatmap: () => set((state) => ({ showVoltageHeatmap: !state.showVoltageHeatmap })),
  openContextMenu: (componentId, x, y) => set({ contextMenu: { componentId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openCanvasMenu: (x, y) => set({ canvasMenu: { x, y } }),
  closeCanvasMenu: () => set({ canvasMenu: null }),
  addRecentlyUsedType: (type) =>
    set((state) => {
      const filtered = state.recentlyUsedTypes.filter((t) => t !== type);
      return { recentlyUsedTypes: [type, ...filtered].slice(0, 5) };
    }),
  openWireMenu: (wireId, x, y) => set({ wireMenu: { wireId, x, y } }),
  closeWireMenu: () => set({ wireMenu: null }),
  requestZoomToFit:    () => set({ zoomToFit: true }),
  requestArduinoTab:   () => set((s) => ({ arduinoTabRequested: s.arduinoTabRequested + 1 })),
  clearZoomToFit:      () => set({ zoomToFit: false }),
  requestZoomIn:       () => set((s) => ({ zoomInRequested: s.zoomInRequested + 1 })),
  requestZoomOut:      () => set((s) => ({ zoomOutRequested: s.zoomOutRequested + 1 })),
  requestCameraPreset: (preset) => set({ cameraPreset: preset }),
  clearCameraPreset:   () => set({ cameraPreset: null }),
  setCircuitHealthWarning: (warning) => set({ circuitHealthWarning: warning }),
  setClickToPlace: (type) => set((s) => ({
    clickToPlaceType: type,
    clickToPlaceRotation: type == null ? 0 : s.clickToPlaceRotation,
  })),
  rotateClickToPlace: () => set((s) => ({
    clickToPlaceRotation: (s.clickToPlaceRotation + 90) % 360,
  })),
  setSnapTargetNodeIds: (ids) => set({ snapTargetNodeIds: ids }),
  requestZoomToComponent: (id) => set({ zoomToComponentId: id }),
  clearZoomToComponent: () => set({ zoomToComponentId: null }),
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
  setEditingNoteId: (id) => set({ editingNoteId: id }),
  }),
  {
    name: 'circuit-ui-prefs',
    partialize: (state) => ({
      showDesignators: state.showDesignators,
      showPolarityLabels: state.showPolarityLabels,
      showWireVoltageColors: state.showWireVoltageColors,
      showValueLabels: state.showValueLabels,
      showCurrentLabels: state.showCurrentLabels,
      showVoltageHeatmap: state.showVoltageHeatmap,
      wireRoutingMode: state.wireRoutingMode,
      recentlyUsedTypes: state.recentlyUsedTypes,
      showCurrentThickness: state.showCurrentThickness,
    }),
  },
));
