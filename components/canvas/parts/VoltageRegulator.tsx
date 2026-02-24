'use client';
import * as THREE from 'three';
import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { PITCH } from '@/constants/breadboard';
import type { Vec3 } from '@/types/circuit';

interface Props {
  anchorPos: Vec3;
  transparent?: boolean;
  componentProps: { voltage?: number };
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}

export default function VoltageRegulator({ anchorPos, transparent, componentProps, onClick }: Props) {
  const voltage = componentProps.voltage ?? 5;
  const opacity = transparent ? 0.45 : 1;
  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.8, transparent, opacity }),
    [transparent, opacity],
  );
  const pinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.2, transparent, opacity }),
    [transparent, opacity],
  );
  const [ax, ay, az] = anchorPos;
  const label = `78${String(voltage).padStart(2, '0')}`;

  return (
    <group position={[ax, ay, az]} onClick={onClick}>
      {/* Body */}
      <mesh material={bodyMat} position={[0, PITCH * 0.5, 0]}>
        <boxGeometry args={[PITCH * 2.2, PITCH * 1.8, PITCH * 0.9]} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, PITCH * 0.5, PITCH * 0.46]}
        fontSize={PITCH * 0.42}
        color="#00ccff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      {/* Pins: in (left), gnd (bottom-center), out (right) */}
      {([[-PITCH, 0, 0], [0, 0, PITCH], [PITCH, 0, 0]] as Vec3[]).map(([px, py, pz], i) => (
        <mesh key={i} material={pinMat} position={[px, py + PITCH * 0.15, pz]}>
          <cylinderGeometry args={[0.025, 0.025, PITCH * 0.4, 6]} />
        </mesh>
      ))}
    </group>
  );
}
