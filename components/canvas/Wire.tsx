'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3, Wire as WireModel } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';
import { branchCurrents } from '@/simulation/SimBridge';

const WIRE_TUBES = {
  segments: 24,
  radius: 0.026,
  radialSegments: 8,
};

function buildWirePoints(fromPos: Vec3, toPos: Vec3): THREE.Vector3[] {
  const from = new THREE.Vector3(fromPos[0], fromPos[1], fromPos[2]);
  const to = new THREE.Vector3(toPos[0], toPos[1], toPos[2]);
  const flatDistance = from.distanceTo(new THREE.Vector3(to.x, from.y, to.z));
  const arcHeight = 0.3 + 0.05 * flatDistance;
  const mid = new THREE.Vector3(
    (from.x + to.x) / 2,
    Math.max(from.y, to.y) + arcHeight,
    (from.z + to.z) / 2,
  );

  return [from, mid, to];
}

interface WireProps {
  wire: WireModel;
  branchIndex?: number;
}

export default function Wire({ wire, branchIndex = 0 }: WireProps) {
  const removeWire = useCircuitStore((s) => s.removeWire);
  const fromPos = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.worldPos);
  const toPos = useCircuitStore((s) => s.nodes[wire.toNodeId]?.worldPos);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const geometry = useMemo(() => {
    if (!fromPos || !toPos) return null;
    const points = buildWirePoints(fromPos, toPos);
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(
      curve,
      WIRE_TUBES.segments,
      WIRE_TUBES.radius,
      WIRE_TUBES.radialSegments,
      false,
    );
  }, [fromPos, toPos]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const current = branchCurrents[branchIndex] ?? 0;
    const direction = current >= 0 ? 1 : -1;
    const speed = Math.max(0.6, Math.min(4, Math.abs(current) * 2 + 0.6));
    const phase = direction * speed;
    const pulse = 0.5 + 0.5 * Math.sin(phase * clock.getElapsedTime());
    matRef.current.emissiveIntensity = 0.06 + 0.14 * pulse;
  });

  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    removeWire(wire.id);
  };

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} onContextMenu={onContextMenu}>
      <meshStandardMaterial
        ref={matRef}
        color={wire.color}
        emissive={wire.color}
        roughness={0.6}
        metalness={0.1}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
}
