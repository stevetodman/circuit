'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3, Wire as WireModel } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
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

function formatCurrent(amps: number): string {
  const abs = Math.abs(amps);
  if (abs >= 1) return `${abs.toFixed(2)} A`;
  if (abs >= 0.001) return `${(abs * 1000).toFixed(1)} mA`;
  if (abs >= 0.000001) return `${(abs * 1_000_000).toFixed(0)} µA`;
  return '0';
}

export default function Wire({ wire, branchIndex }: WireProps) {
  const removeWire = useCircuitStore((s) => s.removeWire);
  const showCurrentLabels = useUIStore((s) => s.showCurrentLabels);
  const overloadIds = useUIStore((s) => s.overloadIds);
  const fromPos = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.worldPos);
  const toPos = useCircuitStore((s) => s.nodes[wire.toNodeId]?.worldPos);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const textRef = useRef<unknown>(null);
  const textValueRef = useRef('0');
  const safeBranchIndex = branchIndex ?? -1;

  const points = useMemo(() => {
    if (!fromPos || !toPos) return null;
    return buildWirePoints(fromPos, toPos);
  }, [fromPos, toPos]);

  const geometry = useMemo(() => {
    if (!points) return null;
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(
      curve,
      WIRE_TUBES.segments,
      WIRE_TUBES.radius,
      WIRE_TUBES.radialSegments,
      false,
    );
  }, [points]);

  const labelPosition = useMemo(() => {
    if (!fromPos || !toPos) return null;
    return [
      (fromPos[0] + toPos[0]) / 2,
      Math.max(fromPos[1], toPos[1]) + 0.22,
      (fromPos[2] + toPos[2]) / 2,
    ] as const;
  }, [fromPos, toPos]);

  const hasBranchIndex = safeBranchIndex >= 0;
  const isOverloaded = overloadIds.includes(wire.id);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!matRef.current) return;

    const current = hasBranchIndex ? (branchCurrents[safeBranchIndex] ?? 0) : 0;
    const textValue = formatCurrent(current);
    if (textRef.current) {
      const label = textRef.current as { text: string; visible: boolean };
      if (textValueRef.current !== textValue) {
        label.text = textValue;
        textValueRef.current = textValue;
      }
      label.visible = showCurrentLabels && hasBranchIndex;
    }

    const direction = current >= 0 ? 1 : -1;
    const speed = Math.max(0.6, Math.min(4, Math.abs(current) * 2 + 0.6));
    const phase = direction * speed;
    const pulse = 0.5 + 0.5 * Math.sin(phase * clock.getElapsedTime());

    if (isOverloaded) {
      const overloadPulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 8);
      matRef.current.color.set('#ff2200');
      matRef.current.emissive.set('#ff2200');
      matRef.current.emissiveIntensity = 0.35 + 0.45 * overloadPulse;
      return;
    }

    matRef.current.color.set(wire.color);
    matRef.current.emissive.set(wire.color);
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
      {labelPosition && (
      <Text
          ref={textRef as any}
          position={labelPosition}
          fontSize={0.06}
          color={wire.color}
          anchorX="center"
          anchorY="middle"
          visible={showCurrentLabels && hasBranchIndex}
        >
          {textValueRef.current}
        </Text>
      )}
    </mesh>
  );
}
