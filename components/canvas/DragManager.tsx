'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useDragStore } from '@/store/dragStore';
import { BOARD_TOP_Y } from '@/store/circuitStore';
import { PIN_TEMPLATES } from '@/types/circuit';
import ComponentRenderer from './parts/ComponentRenderer';
import type { Vec3 } from '@/types/circuit';

const BOARD_CENTER: Vec3 = [0, BOARD_TOP_Y, 0];

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

    // F2.2: window-level move so the ghost follows cursor from sidebar → canvas
    const onPointerMove = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;
      const nextPos = clientToBoardPos(event.clientX, event.clientY);
      if (nextPos) dragState.updatePos(nextPos);
    };

    // Commit only when releasing over the canvas
    const onPointerUp = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const overCanvas =
        event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top  && event.clientY <= rect.bottom;
      if (!overCanvas) return;
      const nextPos = clientToBoardPos(event.clientX, event.clientY);
      if (nextPos) dragState.updatePos(nextPos);
      dragState.commit();
    };

    const onPointerCancel = () => {
      if (useDragStore.getState().dragging) useDragStore.getState().cancel();
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
