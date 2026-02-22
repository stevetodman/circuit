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

  setHoveredNode: (id: string | null) => void;
  setSimStatus:   (status: 'idle' | 'running' | 'error', error?: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  hoveredNodeId: null,
  simStatus:     'idle',
  simError:      null,

  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setSimStatus:   (status, error = undefined) => set({ simStatus: status, simError: error ?? null }),
}));
