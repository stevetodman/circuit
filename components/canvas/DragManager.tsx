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

    const eventToBoardPos = (event: PointerEvent): Vec3 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(pointer, camera);
      const worldPos = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(boardPlane, worldPos);

      if (!hit) return null;
      return [worldPos.x, worldPos.y, worldPos.z];
    };

    const onPointerMove = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;

      const nextPos = eventToBoardPos(event);
      if (nextPos) dragState.updatePos(nextPos);
    };

    const onPointerUp = (event: PointerEvent) => {
      const dragState = useDragStore.getState();
      if (!dragState.dragging) return;

      const nextPos = eventToBoardPos(event);
      if (nextPos) dragState.updatePos(nextPos);
      dragState.commit();
    };

    const onPointerCancel = () => {
      const dragState = useDragStore.getState();
      if (dragState.dragging) dragState.cancel();
    };

    gl.domElement.addEventListener('pointermove', onPointerMove);
    gl.domElement.addEventListener('pointerup', onPointerUp);
    gl.domElement.addEventListener('pointerleave', onPointerCancel);
    gl.domElement.addEventListener('pointercancel', onPointerCancel);

    return () => {
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerup', onPointerUp);
      gl.domElement.removeEventListener('pointerleave', onPointerCancel);
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
      onClick={(event) => event.stopPropagation()}
    />
  );
}
