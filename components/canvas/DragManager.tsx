'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useDragStore } from '@/store/dragStore';
import { BOARD_TOP_Y, SNAP_THRESHOLD, useCircuitStore } from '@/store/circuitStore';
import { PIN_TEMPLATES } from '@/types/circuit';
import { useUIStore } from '@/store/uiStore';
import { useToastStore } from '@/store/toastStore';
import ComponentRenderer from './parts/ComponentRenderer';
import type { Vec3, ComponentType } from '@/types/circuit';

const BOARD_CENTER: Vec3 = [0, BOARD_TOP_Y, 0];

function distanceTo(a: Vec3, b: Vec3) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rotateOffset(offset: Vec3, rotationY: number): Vec3 {
  const rad = (rotationY * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos * offset[0] + sin * offset[2], offset[1], -sin * offset[0] + cos * offset[2]];
}

export default function DragManager() {
  const { camera, gl } = useThree();
  const dragging = useDragStore((state) => state.dragging);
  const type     = useDragStore((state) => state.type);
  const position = useDragStore((state) => state.position);
  const rotationY = useDragStore((state) => state.rotationY);

  // Cursor: 'grabbing' while dragging a component, restore after
  useEffect(() => {
    gl.domElement.style.cursor = dragging ? 'grabbing' : 'default';
  }, [dragging, gl]);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP_Y);

    // F2.2: accept raw client coords so we can project from anywhere on screen
    const clientToBoardPos = (clientX: number, clientY: number): Vec3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const worldPos = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(boardPlane, worldPos);
      if (!hit) return null;
      return [worldPos.x, worldPos.y, worldPos.z];
    };

    // Compute snap target node IDs for the current drag position
    const computeSnapTargets = (pos: Vec3, type: ComponentType | null, rotationY: number): string[] => {
      if (!type) return [];
      const nodes = useCircuitStore.getState().nodes;
      const pinTemplates = PIN_TEMPLATES[type] ?? [];
      const targets: string[] = [];
      for (const pinDef of pinTemplates) {
        const pinOffset = rotateOffset(pinDef.offset, rotationY);
        const pinWorld: Vec3 = [pos[0] + pinOffset[0], pos[1] + pinOffset[1], pos[2] + pinOffset[2]];
        let bestDist = Infinity;
        let bestId: string | null = null;
        for (const node of Object.values(nodes)) {
          const d = distanceTo(pinWorld, node.worldPos);
          if (d < bestDist) { bestDist = d; bestId = node.id; }
        }
        if (bestDist < SNAP_THRESHOLD && bestId) targets.push(bestId);
      }
      return targets;
    };

    // F2.2: window-level move so the ghost follows cursor from sidebar → canvas
    const onPointerMove = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;
      const nextPos = clientToBoardPos(event.clientX, event.clientY);
      if (nextPos) {
        dragState.updatePos(nextPos);
        const targets = computeSnapTargets(nextPos, dragState.type, dragState.rotationY);
        useUIStore.getState().setSnapTargetNodeIds(targets);
      }
    };

    // Commit only when releasing over the canvas; cancel with toast if outside
    const onPointerUp = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const overCanvas =
        event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top  && event.clientY <= rect.bottom;
      useUIStore.getState().setSnapTargetNodeIds([]);
      if (!overCanvas) {
        dragState.cancel();
        useToastStore.getState().addToast('Drop onto the breadboard to place', 'info');
        return;
      }
      const nextPos = clientToBoardPos(event.clientX, event.clientY);
      if (nextPos) dragState.updatePos(nextPos);
      dragState.commit();
    };

    const onPointerCancel = () => {
      if (useDragStore.getState().dragging) {
        useDragStore.getState().cancel();
        useUIStore.getState().setSnapTargetNodeIds([]);
      }
    };

    // pointermove on window — tracks cursor even when over sidebar
    window.addEventListener('pointermove', onPointerMove);
    // pointerup on window — but only commits when released over canvas
    window.addEventListener('pointerup', onPointerUp);
    // pointercancel is canvas-specific (touch cancel, etc.)
    gl.domElement.addEventListener('pointercancel', onPointerCancel);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      gl.domElement.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [gl, camera]);

  if (!dragging || !type) return null;

  const pinOffsets = PIN_TEMPLATES[type].map((pin) => pin.offset);

  return (
    <ComponentRenderer
      componentId={`preview:${type}`}
      designator=""
      type={type}
      anchorPos={position}
      rotationY={rotationY}
      pinOffsets={pinOffsets}
      transparent
      componentProps={{}}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
