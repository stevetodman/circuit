'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useCircuitStore } from '@/store/circuitStore';

const COLOR_IDLE     = new THREE.Color('#5a6a7a');
const COLOR_HOVER    = new THREE.Color('#ffd700');
const COLOR_SELECTED = new THREE.Color('#ff6b2b');

export default function PinGrid() {
  const nodes      = useCircuitStore((s) => s.nodes);
  const selectedId = useCircuitStore((s) => s.selectedNodeId);
  const addWire = useCircuitStore((s) => s.addWire);
  const selectNode = useCircuitStore((s) => s.selectNode);

  const meshRef    = useRef<THREE.InstancedMesh>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Stable ordered list — only recomputes when topology changes
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const count    = nodeList.length;

  // Set instance matrices after mount / topology change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    nodeList.forEach(({ worldPos }, i) => {
      dummy.position.set(worldPos[0], worldPos[1] + 0.012, worldPos[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodeList]);

  // Update per-instance colour on hover / selection change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    nodeList.forEach((node, i) => {
      if (i === hoveredIdx) {
        mesh.setColorAt(i, COLOR_HOVER);
      } else if (node.id === selectedId) {
        mesh.setColorAt(i, COLOR_SELECTED);
      } else {
        mesh.setColorAt(i, COLOR_IDLE);
      }
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hoveredIdx, selectedId, nodeList]);

  const onMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredIdx(e.instanceId ?? null);
  }, []);

  const onOut = useCallback(() => setHoveredIdx(null), []);

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId == null) return;
      const node = nodeList[e.instanceId];
      if (!node) return;
      if (!selectedId) {
        selectNode(node.id);
      } else if (selectedId !== node.id) {
        addWire(selectedId, node.id);
        selectNode(null);
      }
    },
    [nodeList, selectedId, addWire, selectNode],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
      renderOrder={2}
    >
      {/* Flat metallic disk — looks like the pin ring visible in Diode */}
      <cylinderGeometry args={[0.052, 0.052, 0.008, 10]} />
      <meshStandardMaterial roughness={0.25} metalness={0.7} />
    </instancedMesh>
  );
}
