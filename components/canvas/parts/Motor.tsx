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
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 24]} />
        <meshStandardMaterial color="#505050" roughness={0.42} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      <mesh position={[-0.03, 0.06, 0.062]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.032, 0.01, 0.004]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.25} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      <mesh position={[0, 0.06, 0.062]}>
        <boxGeometry args={[0.008, 0.016, 0.004]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.25} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      <mesh position={[0.03, 0.06, 0.062]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.032, 0.01, 0.004]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.25} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <MotorLead
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {selected && (
        <mesh position={[0, 0.125, 0]}>
          <ringGeometry args={[0.078, 0.096, 20]} />
          <meshBasicMaterial color="#f2ffe2" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Motor);
