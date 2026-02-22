'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3, Wire as WireModel } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';

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
}

export default function Wire({ wire }: WireProps) {
  const removeWire = useCircuitStore((s) => s.removeWire);
  const fromPos = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.worldPos);
  const toPos = useCircuitStore((s) => s.nodes[wire.toNodeId]?.worldPos);

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

  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    removeWire(wire.id);
  };

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} onContextMenu={onContextMenu}>
      <meshStandardMaterial color={wire.color} roughness={0.6} metalness={0.1} />
    </mesh>
  );
}
