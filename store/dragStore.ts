'use client';

import { create } from 'zustand';
import type { ComponentType, Vec3, PinConnection, PinTemplate } from '@/types/circuit';
import { PIN_TEMPLATES } from '@/types/circuit';
import { BOARD_TOP_Y, SNAP_THRESHOLD } from '@/store/circuitStore';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

const BOARD_CENTER: Vec3 = [0, BOARD_TOP_Y, 0];

interface DragState {
  dragging: boolean;
  type: ComponentType | null;
  position: Vec3;
  rotationY: number;
  startDrag: (type: ComponentType) => void;
  updatePos: (pos: Vec3) => void;
  rotate: () => void;
  commit: () => void;
  cancel: () => void;
}

const distanceTo = (left: Vec3, right: Vec3) => {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  const dz = left[2] - right[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

function rotateOffset(offset: Vec3, rotationY: number): Vec3 {
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    cos * offset[0] + sin * offset[2],
    offset[1],
    -sin * offset[0] + cos * offset[2],
  ];
}

export const useDragStore = create<DragState>()((set, get) => ({
  dragging: false,
  type: null,
  position: BOARD_CENTER,
  rotationY: 0,

  startDrag(type) {
    useUIStore.getState().setClickToPlace(null);
    set({
      dragging: true,
      type,
      position: BOARD_CENTER,
      rotationY: 0,
    });
  },

  updatePos(pos) {
    set({ position: pos });
  },

  rotate() {
    set((state) => ({ rotationY: (state.rotationY + 90) % 360 }));
  },

  commit() {
    const state = get();
    if (!state.type) {
      set({ dragging: false, type: null, position: BOARD_CENTER, rotationY: 0 });
      return;
    }

    const nodes = useCircuitStore.getState().nodes;
    const pinTemplates: PinTemplate[] = PIN_TEMPLATES[state.type] ?? [];
    let snappedAnchor: Vec3 = [...state.position];
    const pins: PinConnection[] = [];

    for (const pinDef of pinTemplates) {
      const pinOffset = rotateOffset(pinDef.offset, state.rotationY);
      const pinWorld: Vec3 = [
        snappedAnchor[0] + pinOffset[0],
        snappedAnchor[1] + pinOffset[1],
        snappedAnchor[2] + pinOffset[2],
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

      if (bestNodeId) {
        pins.push({ name: pinDef.name, nodeId: bestNodeId });
      }

      if (bestDist < SNAP_THRESHOLD && bestWorldPos) {
        snappedAnchor = [
          bestWorldPos[0] - pinOffset[0],
          bestWorldPos[1] - pinOffset[1],
          bestWorldPos[2] - pinOffset[2],
        ];
      }
    }

    useCircuitStore.getState().addComponent(state.type, snappedAnchor, pins, state.rotationY);
    useUIStore.getState().addRecentlyUsedType(state.type);
    set({ dragging: false, type: null, position: BOARD_CENTER, rotationY: 0 });
  },

  cancel() {
    set({ dragging: false, type: null, position: BOARD_CENTER, rotationY: 0 });
  },
}));
