'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useCircuitStore } from '@/store/circuitStore';

const COLOR_IDLE       = new THREE.Color('#5a6a7a');
const COLOR_HOVER      = new THREE.Color('#ffd700');   // hovered pin
const COLOR_SELECTED   = new THREE.Color('#ff6b2b');   // wiring start pin
const COLOR_NET_PEER   = new THREE.Color('#3a9fff');   // same-net peers on hover
const COLOR_NET_ACTIVE = new THREE.Color('#22ddaa');   // same-net as selected pin

export default function PinGrid() {
  const nodes      = useCircuitStore((s) => s.nodes);
  const selectedId = useCircuitStore((s) => s.selectedNodeId);
  const addWire    = useCircuitStore((s) => s.addWire);
  const selectNode = useCircuitStore((s) => s.selectNode);
  const { gl }     = useThree();

  const meshRef    = useRef<THREE.InstancedMesh>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Stable ordered list — only recomputes when topology changes
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const count    = nodeList.length;

  // Derived: netId of the currently hovered pin (for net highlighting)
  const hoveredNetId = hoveredIdx != null ? (nodeList[hoveredIdx]?.netId ?? null) : null;

  // Derived: netId of the selected start pin (highlight its net peers)
  const selectedNode = selectedId ? nodes[selectedId] : null;
  const selectedNetId = selectedNode?.netId ?? null;

  // ── Instance matrices — set once per topology change ─────────────────────
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

  // ── Per-instance colour — net highlighting + selection ────────────────────
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodeList.forEach((node, i) => {
      let col: THREE.Color;

      if (i === hoveredIdx) {
        col = COLOR_HOVER;
      } else if (node.id === selectedId) {
        col = COLOR_SELECTED;
      } else if (hoveredNetId != null && node.netId === hoveredNetId) {
        // Net peers of hovered pin glow blue
        col = COLOR_NET_PEER;
      } else if (selectedNetId != null && node.netId === selectedNetId) {
        // Net peers of the wiring start pin glow teal
        col = COLOR_NET_ACTIVE;
      } else {
        col = COLOR_IDLE;
      }

      mesh.setColorAt(i, col);
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hoveredIdx, hoveredNetId, selectedId, selectedNetId, nodeList]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const onMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHoveredIdx(e.instanceId ?? null);
      // Cursor: 'cell' = "click to complete wire", 'crosshair' = "click to start"
      gl.domElement.style.cursor = selectedId ? 'cell' : 'crosshair';
    },
    [selectedId, gl],
  );

  const onOut = useCallback(() => {
    setHoveredIdx(null);
    gl.domElement.style.cursor = 'default';
  }, [gl]);

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
        gl.domElement.style.cursor = 'crosshair';
      }
    },
    [nodeList, selectedId, addWire, selectNode, gl],
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
