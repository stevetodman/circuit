'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCircuitStore } from '@/store/circuitStore';
import { BOARD_TOP_Y } from '@/constants/breadboard';

// Horizontal plane at board surface — cursor is always projected here
const BOARD_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP_Y);

/**
 * Live preview wire drawn from the selected (start) pin to the cursor.
 * Rendered only while a node is selected (wiring mode started).
 * Uses useFrame + manual raycasting so it never causes React re-renders.
 */
export default function WirePreview() {
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const nodes          = useCircuitStore((s) => s.nodes);
  const { raycaster, pointer, camera } = useThree();

  const meshRef    = useRef<THREE.Mesh>(null);
  const geomRef    = useRef<THREE.TubeGeometry | null>(null);
  const cursorVec  = useRef(new THREE.Vector3());

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Hide immediately when no wiring in progress
    if (!selectedNodeId) {
      mesh.visible = false;
      return;
    }

    const startNode = nodes[selectedNodeId];
    if (!startNode) { mesh.visible = false; return; }

    // Project cursor onto board plane
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(BOARD_PLANE, cursorVec.current);
    if (!hit) { mesh.visible = false; return; }

    // Build arc geometry (same formula as Wire.tsx)
    const from = new THREE.Vector3(...startNode.worldPos);
    const to   = cursorVec.current.clone();
    to.y = BOARD_TOP_Y; // keep on board surface

    const flatDist  = from.distanceTo(new THREE.Vector3(to.x, from.y, to.z));
    const arcHeight = 0.15 + 0.04 * flatDist;
    const mid = new THREE.Vector3(
      (from.x + to.x) / 2,
      Math.max(from.y, to.y) + arcHeight,
      (from.z + to.z) / 2,
    );

    const curve   = new THREE.CatmullRomCurve3([from, mid, to]);
    const newGeom = new THREE.TubeGeometry(curve, 20, 0.018, 6, false);

    // P1-17: assign before dispose so the mesh never holds a disposed geometry reference
    const oldGeom   = geomRef.current;
    geomRef.current = newGeom;
    mesh.geometry   = newGeom;
    if (oldGeom) oldGeom.dispose();
    mesh.visible    = true;
  });

  useEffect(() => {
    return () => {
      geomRef.current?.dispose();
    };
  }, []);

  // Always mount the mesh so ref is stable; visibility is driven by useFrame
  return (
    <mesh ref={meshRef} visible={false}>
      {/* placeholder geometry — replaced every frame by useFrame */}
      <bufferGeometry />
      <meshStandardMaterial
        color="#ffd700"
        transparent
        opacity={0.55}
        roughness={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}
