'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { BOARD_TOP_Y } from '@/constants/breadboard';

// Horizontal plane at board surface — cursor is always projected here
const BOARD_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP_Y);

function getOrthogonalPoints(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  if (dx >= dz) {
    const corner = new THREE.Vector3(to.x, from.y + 0.03, from.z);
    return [from, corner, to];
  }
  const corner = new THREE.Vector3(from.x, from.y + 0.03, to.z);
  return [from, corner, to];
}

function buildCurvePoints(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const flatDist = from.distanceTo(new THREE.Vector3(to.x, from.y, to.z));
  const arcHeight = 0.15 + 0.04 * flatDist;
  const mid = new THREE.Vector3(
    (from.x + to.x) / 2,
    Math.max(from.y, to.y) + arcHeight,
    (from.z + to.z) / 2,
  );

  return [from, mid, to];
}

/**
 * Live preview wire drawn from the selected (start) pin to the cursor.
 * Rendered only while a node is selected (wiring mode started).
 * Uses useFrame + manual raycasting so it never causes React re-renders.
 */
export default function WirePreview() {
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);
  const nodes = useCircuitStore((s) => s.nodes);
  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const wireRoutingMode = useUIStore((s) => s.wireRoutingMode);
  const wireValidationStatus = useUIStore((s) => s.wireValidationStatus);
  const setWireValidationStatus = useUIStore((s) => s.setWireValidationStatus);
  const { raycaster, pointer, camera } = useThree();

  const meshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<THREE.TubeGeometry | null>(null);
  const cursorVec = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!hoveredNodeId || !selectedNodeId || hoveredNodeId === selectedNodeId) {
      setWireValidationStatus(null);
      return;
    }

    const fromNet = nodes[selectedNodeId]?.netId ?? null;
    const toNet = nodes[hoveredNodeId]?.netId ?? null;

    if (fromNet != null && toNet != null && fromNet !== toNet) {
      setWireValidationStatus('short', `Short! Net ${fromNet} ↔ Net ${toNet}`);
    } else if (toNet != null) {
      setWireValidationStatus('clean', `Connect to Net ${toNet}`);
    } else {
      setWireValidationStatus('clean', null);
    }

    return () => setWireValidationStatus(null);
  }, [hoveredNodeId, selectedNodeId, nodes, setWireValidationStatus]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Hide immediately when no wiring in progress
    if (!selectedNodeId) {
      mesh.visible = false;
      return;
    }

    const startNode = nodes[selectedNodeId];
    if (!startNode) {
      mesh.visible = false;
      return;
    }

    // F2.5: snap endpoint to hovered pin when available, otherwise follow cursor
    const snapNode = hoveredNodeId && hoveredNodeId !== selectedNodeId
      ? useCircuitStore.getState().nodes[hoveredNodeId]
      : null;

    let to: THREE.Vector3;
    if (snapNode) {
      to = new THREE.Vector3(...snapNode.worldPos);
    } else {
      // Project cursor onto board plane
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.ray.intersectPlane(BOARD_PLANE, cursorVec.current);
      if (!hit) {
        mesh.visible = false;
        return;
      }
      to = cursorVec.current.clone();
      to.y = BOARD_TOP_Y; // keep on board surface
    }

    const from = new THREE.Vector3(...startNode.worldPos);
    const points = wireRoutingMode === 'orthogonal'
      ? getOrthogonalPoints(from, to)
      : buildCurvePoints(from, to);
    const curve = wireRoutingMode === 'orthogonal'
      ? new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0)
      : new THREE.CatmullRomCurve3(points);
    const newGeom = new THREE.TubeGeometry(curve, 20, 0.018, 6, false);

    // P1-17: assign before dispose so the mesh never holds a disposed geometry reference
    const oldGeom = geomRef.current;
    geomRef.current = newGeom;
    mesh.geometry = newGeom;
    if (oldGeom) oldGeom.dispose();
    mesh.visible = true;
  });

  useEffect(() => {
    return () => {
      geomRef.current?.dispose();
    };
  }, []);

  const previewColor =
    wireValidationStatus === 'short'
      ? '#ff2222'
      : wireValidationStatus === 'clean'
        ? '#22cc88'
        : '#ffd700';

  // Always mount the mesh so ref is stable; visibility is driven by useFrame
  return (
    <mesh ref={meshRef} visible={false}>
      {/* placeholder geometry — replaced every frame by useFrame */}
      <bufferGeometry />
      <meshStandardMaterial
        color={previewColor}
        transparent
        opacity={0.55}
        roughness={0.35}
        depthWrite={false}
      />
    </mesh>
  );
}

export function WireValidationTooltip() {
  const wireValidationStatus = useUIStore((s) => s.wireValidationStatus);
  const wireValidationMessage = useUIStore((s) => s.wireValidationMessage);
  const mouseX = useUIStore((s) => s.mouseX);
  const mouseY = useUIStore((s) => s.mouseY);
  const selectedNodeId = useCircuitStore((s) => s.selectedNodeId);

  if (!wireValidationMessage || !selectedNodeId) return null;

  const isShort = wireValidationStatus === 'short';
  const tooltipText = `${isShort ? '⚠ ' : '✓ '}${wireValidationMessage}`;

  return (
    <div
      style={{ left: mouseX + 14, top: mouseY - 36 }}
      className={`fixed z-50 pointer-events-none px-2.5 py-1 rounded-md text-xs font-medium shadow-lg
        ${isShort
          ? 'bg-red-900/80 border border-red-500/40 text-red-200'
          : 'bg-emerald-900/80 border border-emerald-500/40 text-emerald-200'
        }`}
    >
      {tooltipText}
    </div>
  );
}
