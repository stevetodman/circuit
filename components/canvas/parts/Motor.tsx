'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface MotorProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.254, 0, 0],
  [0.254, 0, 0],
];

function MotorLead({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffd87e' : '#7c7c7c'} roughness={0.45} />
    </mesh>
  );
}

function Motor({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: MotorProps) {
  const bodyOpacity = transparent ? 0.75 : 1;

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      {/* DC hobby motor can — ~20 mm dia × 25 mm long at 1:1 scale */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.56, 24]} />
        <meshStandardMaterial color="#505050" roughness={0.42} metalness={0.3} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Front end cap */}
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 24]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.3} metalness={0.4} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Output shaft */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 12]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.15} metalness={0.9} />
      </mesh>

      {/* Rear end cap with brush assembly */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.04, 24]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.3} metalness={0.4} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Terminal tabs */}
      <mesh position={[-0.15, 0, 0.30]} rotation={[0, 0, Math.PI / 5]}>
        <boxGeometry args={[0.16, 0.05, 0.02]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.25} metalness={0.5} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      <mesh position={[0.15, 0, 0.30]} rotation={[0, 0, -Math.PI / 5]}>
        <boxGeometry args={[0.16, 0.05, 0.02]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.25} metalness={0.5} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <MotorLead
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {selected && (
        <mesh position={[0, 0.70, 0]}>
          <ringGeometry args={[0.42, 0.48, 20]} />
          <meshBasicMaterial color="#f2ffe2" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Motor);
