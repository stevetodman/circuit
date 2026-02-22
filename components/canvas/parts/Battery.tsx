'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface BatteryProps {
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

function Terminal({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.045, 8]} />
      <meshStandardMaterial color={selected ? '#ffdf88' : '#999'} roughness={0.5} />
    </mesh>
  );
}

function Battery({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: BatteryProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      <mesh position={[0, 0.075, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.06, 16]} />
        <meshStandardMaterial color="#444" roughness={0.33} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[-0.06, 0.1, 0]}>
        <boxGeometry args={[0.045, 0.012, 0.03]} />
        <meshStandardMaterial color="#c00" roughness={0.5} />
      </mesh>

      <mesh position={[0.06, 0.1, 0]}>
        <boxGeometry args={[0.045, 0.012, 0.03]} />
        <meshStandardMaterial color="#333" roughness={0.5} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <Terminal key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.13, 0]}>
          <ringGeometry args={[0.08, 0.092, 20]} />
          <meshBasicMaterial color="#a8edff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Battery);
