'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface BJTProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [0, 0, -0.254],
  [-0.254, 0, 0],
  [0.254, 0, 0],
];

function BJTLeg({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#f1c96b' : '#6f6f6f'} roughness={0.45} />
    </mesh>
  );
}

function BJT({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: BJTProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.1, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#2e2f2f" roughness={0.35} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.11, 0.036]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <boxGeometry args={[0.028, 0.01, 0.01]} />
        <meshStandardMaterial color="#111" roughness={0.2} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <BJTLeg
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {selected && (
        <mesh position={[0, 0.13, 0]}>
          <ringGeometry args={[0.07, 0.086, 20]} />
          <meshBasicMaterial color="#f5ffa8" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(BJT);
