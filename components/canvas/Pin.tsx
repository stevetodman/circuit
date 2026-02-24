'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';

const COLOR_IDLE        = new THREE.Color('#5a6a7a');
const COLOR_HOVER       = new THREE.Color('#ffd700');   // hovered pin
const COLOR_SELECTED    = new THREE.Color('#ff6b2b');   // wiring start pin
const COLOR_NET_PEER    = new THREE.Color('#22ccee');   // same-net peers on hover
const COLOR_NET_ACTIVE  = new THREE.Color('#ffaa00');   // same-net as selected pin
const COLOR_SNAP_TARGET = new THREE.Color('#00ff88');   // drag snap preview

export default function PinGrid() {
  const nodes      = useCircuitStore((s) => s.nodes);
  const selectedId = useCircuitStore((s) => s.selectedNodeId);
  const addWire    = useCircuitStore((s) => s.addWire);
  const selectNode = useCircuitStore((s) => s.selectNode);
  const { gl }        = useThree();
  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const setHovered    = useUIStore((s) => s.setHoveredNode);
  const snapTargetNodeIds = useUIStore((s) => s.snapTargetNodeIds);
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
  const PIN_HIT_RADIUS = isTouchDevice ? 0.08 : 0.05;

  const meshRef    = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.InstancedMesh>(null);

  // Stable ordered list — only recomputes when topology changes
  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const count    = nodeList.length;

  // Derived: netId of the currently hovered pin (for net highlighting)
  const hoveredNetId = hoveredNodeId != null ? (nodes[hoveredNodeId]?.netId ?? null) : null;

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

  useEffect(() => {
    const mesh = hitMeshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    nodeList.forEach(({ worldPos }, i) => {
      dummy.position.set(worldPos[0], worldPos[1] + 0.012, worldPos[2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [nodeList]);

  // ── Per-instance colour — net highlighting + selection + snap preview ─────
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    nodeList.forEach((node, i) => {
      let col: THREE.Color;

      if (snapTargetNodeIds.includes(node.id)) {
        col = COLOR_SNAP_TARGET;
      } else if (node.id === hoveredNodeId) {
        col = COLOR_HOVER;
      } else if (node.id === selectedId) {
        col = COLOR_SELECTED;
      } else if (selectedNetId != null && node.netId === selectedNetId) {
        // Net peers of the wiring start pin glow amber
        col = COLOR_NET_ACTIVE;
      } else if (hoveredNetId != null && node.netId === hoveredNetId) {
        // Net peers of hovered pin glow cyan
        col = COLOR_NET_PEER;
      } else {
        col = COLOR_IDLE;
      }

      mesh.setColorAt(i, col);
    });

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [hoveredNodeId, hoveredNetId, selectedId, selectedNetId, nodeList, snapTargetNodeIds]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const onMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const idx = e.instanceId ?? null;
      setHovered(idx != null ? (nodeList[idx]?.id ?? null) : null);
      // Cursor: 'cell' = "click to complete wire", 'crosshair' = "click to start"
      gl.domElement.style.cursor = selectedId ? 'cell' : 'crosshair';
    },
    [selectedId, gl, nodeList, setHovered],
  );

  const onOut = useCallback(() => {
    setHovered(null);
    gl.domElement.style.cursor = 'default';
  }, [gl, setHovered]);

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

  if (count === 0) return null;

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]} renderOrder={2}>
        {/* Flat metallic disk — looks like the pin ring visible in Diode */}
        <cylinderGeometry args={[0.052, 0.052, 0.008, 10]} />
        <meshStandardMaterial roughness={0.25} metalness={0.7} />
      </instancedMesh>

      <instancedMesh
        ref={hitMeshRef}
        args={[undefined, undefined, count]}
        onPointerMove={onMove}
        onPointerOut={onOut}
        onClick={onClick}
        renderOrder={1}
      >
        <cylinderGeometry args={[PIN_HIT_RADIUS, PIN_HIT_RADIUS, 0.04, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </>
  );
}
