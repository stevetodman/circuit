'use client';

import { create } from 'zustand';
import type { ComponentType, Vec3, PinConnection, PinTemplate } from '@/types/circuit';
import { PIN_TEMPLATES } from '@/types/circuit';
import { BOARD_TOP_Y, SNAP_THRESHOLD } from '@/store/circuitStore';
import { useCircuitStore } from '@/store/circuitStore';

const BOARD_CENTER: Vec3 = [0, BOARD_TOP_Y, 0];

interface DragState {
  dragging: boolean;
  type: ComponentType | null;
  position: Vec3;
  startDrag: (type: ComponentType) => void;
  updatePos: (pos: Vec3) => void;
  commit: () => void;
  cancel: () => void;
}

const distanceTo = (left: Vec3, right: Vec3) => {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  const dz = left[2] - right[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const useDragStore = create<DragState>()((set, get) => ({
  dragging: false,
  type: null,
  position: BOARD_CENTER,

  startDrag(type) {
    set({
      dragging: true,
      type,
      position: BOARD_CENTER,
    });
  },

  updatePos(pos) {
    set({ position: pos });
  },

  commit() {
    const state = get();
    if (!state.type) {
      set({ dragging: false, type: null, position: BOARD_CENTER });
      return;
    }

    const nodes = useCircuitStore.getState().nodes;
    const pinTemplates: PinTemplate[] = PIN_TEMPLATES[state.type] ?? [];
    let snappedAnchor: Vec3 = [...state.position];
    const pins: PinConnection[] = [];

    for (const pinDef of pinTemplates) {
      const pinWorld: Vec3 = [
        snappedAnchor[0] + pinDef.offset[0],
        snappedAnchor[1] + pinDef.offset[1],
        snappedAnchor[2] + pinDef.offset[2],
      ];

      let bestNodeId: string | null = null;
      let bestWorldPos: Vec3 | null = null;
      let bestDist = Number.POSITIVE_INFINITY;

      for (const node of Object.values(nodes)) {
        const d = distanceTo(pinWorld, node.worldPos);
        if (d < bestDist) {
          bestDist = d;
          bestNodeId = node.id;
          bestWorldPos = node.worldPos;
        }
      }

      if (bestDist < SNAP_THRESHOLD && bestNodeId && bestWorldPos) {
        pins.push({ name: pinDef.name, nodeId: bestNodeId });
        snappedAnchor = [
          bestWorldPos[0] - pinDef.offset[0],
          bestWorldPos[1] - pinDef.offset[1],
          bestWorldPos[2] - pinDef.offset[2],
        ];
      }
    }

    useCircuitStore.getState().addComponent(state.type, snappedAnchor, pins);
    set({ dragging: false, type: null, position: BOARD_CENTER });
  },

  cancel() {
    set({ dragging: false, type: null, position: BOARD_CENTER });
  },
}));

