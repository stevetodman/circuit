'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Wire as WireModel } from '@/types/circuit';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { branchCurrents, voltages } from '@/simulation/SimBridge';

const WIRE_TUBES = {
  segments: 24,
  radius: 0.018,
  radialSegments: 8,
};
const CURRENT_THICKNESS_MAX_RADIUS = 0.040;
const CURRENT_THICKNESS_GAIN = 0.022;

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
  const openWireMenu = useUIStore((s) => s.openWireMenu);
  const showCurrentLabels = useUIStore((s) => s.showCurrentLabels);
  const showWireVoltageColors = useUIStore((s) => s.showWireVoltageColors);
  const overloadIds = useUIStore((s) => s.overloadIds);
  const meshRef = useRef<THREE.Mesh>(null);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const currentThicknessRef = useRef(WIRE_TUBES.radius);
  const fromNetId = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.netId ?? -1);
  const netLabels = useCircuitStore((s) => s.netLabels);
  const wireRoutingMode = useUIStore((s) => s.wireRoutingMode);
  const hoveredNodeId = useUIStore((s) => s.hoveredNodeId);
  const hoveredNetId = useCircuitStore((s) =>
    hoveredNodeId ? (s.nodes[hoveredNodeId]?.netId ?? -1) : -1,
  );
  const fromPos = useCircuitStore((s) => s.nodes[wire.fromNodeId]?.worldPos);
  const toPos = useCircuitStore((s) => s.nodes[wire.toNodeId]?.worldPos);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const textRef = useRef<unknown>(null);
  const textValueRef = useRef('0');
  const safeBranchIndex = branchIndex ?? -1;

  const points = useMemo(() => {
    if (!fromPos || !toPos) return null;
    const from = new THREE.Vector3(fromPos[0], fromPos[1], fromPos[2]);
    const to = new THREE.Vector3(toPos[0], toPos[1], toPos[2]);
    return wireRoutingMode === 'orthogonal'
      ? getOrthogonalPoints(from, to)
      : buildCurvePoints(from, to);
  }, [fromPos, toPos, wireRoutingMode]);

  const curve = useMemo(() => {
    if (!points) return null;
    if (wireRoutingMode === 'orthogonal') {
      return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);
    }
    return new THREE.CatmullRomCurve3(points);
  }, [points, wireRoutingMode]);

  const geometry = useMemo(() => {
    if (!curve) return null;
    return new THREE.TubeGeometry(
      curve,
      WIRE_TUBES.segments,
      currentThicknessRef.current,
      WIRE_TUBES.radialSegments,
      false,
    );
  }, [curve]);

  const midpoint = useMemo(() => {
    if (!curve) return null;
    return curve.getPoint(0.5);
  }, [curve]);

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
    curveRef.current = curve;
  }, [curve]);

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose();
      const currentGeometry = meshRef.current?.geometry;
      if (currentGeometry && currentGeometry !== geometry) {
        currentGeometry.dispose();
      }
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return;

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
    const isNetHovered = hoveredNetId >= 0 && fromNetId === hoveredNetId;

    const showCurrentThickness = useUIStore.getState().showCurrentThickness;
    if (showCurrentThickness && curveRef.current) {
      const amp = Math.abs(current);
      const targetRadius = Math.min(CURRENT_THICKNESS_MAX_RADIUS, WIRE_TUBES.radius + amp * CURRENT_THICKNESS_GAIN);
      const lastRadius = currentThicknessRef.current;
      if (Math.abs(targetRadius - lastRadius) / lastRadius > 0.05) {
        currentThicknessRef.current = targetRadius;
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = new THREE.TubeGeometry(
          curveRef.current,
          WIRE_TUBES.segments,
          targetRadius,
          WIRE_TUBES.radialSegments,
          false,
        );
      }
    } else if (!showCurrentThickness && currentThicknessRef.current !== WIRE_TUBES.radius) {
      currentThicknessRef.current = WIRE_TUBES.radius;
      if (curveRef.current) {
        meshRef.current.geometry.dispose();
        meshRef.current.geometry = new THREE.TubeGeometry(
          curveRef.current,
          WIRE_TUBES.segments,
          WIRE_TUBES.radius,
          WIRE_TUBES.radialSegments,
          false,
        );
      }
    }

    if (isOverloaded) {
      const overloadPulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 8);
      matRef.current.color.set('#ff2200');
      matRef.current.emissive.set('#ff2200');
      matRef.current.emissiveIntensity = 0.35 + 0.45 * overloadPulse;
      return;
    }

    let wireColor = wire.color;
    if (showWireVoltageColors && fromNetId >= 0) {
      const v = voltages[fromNetId] ?? 0;
      if (v > 2.5) {
        wireColor = '#cc2200';
      } else if (v < 0.3) {
        wireColor = '#333344';
      }
    }

    matRef.current.color.set(wireColor);
    matRef.current.emissive.set(wireColor);
    matRef.current.emissiveIntensity = isNetHovered
      ? 0.35 + 0.2 * pulse
      : 0.06 + 0.14 * pulse;
  });

  const onContextMenu = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    openWireMenu(
      wire.id,
      e.clientX ?? e.nativeEvent.clientX,
      e.clientY ?? e.nativeEvent.clientY,
    );
  };

  if (!geometry) return null;

  return (
    <group onContextMenu={onContextMenu}>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          ref={matRef}
          color={wire.color}
          emissive={wire.color}
          roughness={0.6}
          metalness={0.1}
          emissiveIntensity={0.08}
        />
        {labelPosition && midpoint && (
          <Text
            ref={textRef as any}
            position={midpoint}
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
      {fromNetId >= 0 && netLabels[fromNetId] && midpoint && (
        <Text
          position={midpoint}
          fontSize={0.09}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.7}
          depthOffset={-2}
          renderOrder={3}
        >
          {netLabels[fromNetId]}
        </Text>
      )}
    </group>
  );
}
