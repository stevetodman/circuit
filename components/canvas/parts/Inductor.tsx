'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface InductorProps {
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

function InductorWire({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#f0d28f' : '#7a7a7a'} roughness={0.45} />
    </mesh>
  );
}

function Inductor({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: InductorProps) {
  const bodyOpacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 14]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.48} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {[-0.06, -0.02, 0.02, 0.06].map((x) => (
        <mesh key={`${anchorPos.join('-')}-loop-${x}`} position={[x, 0.07, 0]}>
          <torusGeometry args={[0.016, 0.008, 8, 16]} />
          <meshStandardMaterial color="#4b4b4b" roughness={0.35} transparent={transparent} opacity={bodyOpacity} />
        </mesh>
      ))}

      {pinOffsets.map((offset, index) => (
        <InductorWire key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.122, 0]}>
          <ringGeometry args={[0.09, 0.104, 18]} />
          <meshBasicMaterial color="#ffd9a5" transparent opacity={0.42} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Inductor);
