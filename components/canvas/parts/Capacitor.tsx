'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface CapacitorProps {
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

function CapacitorLead({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffddaa' : '#7d7d7d'} roughness={0.45} />
    </mesh>
  );
}

function Capacitor({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: CapacitorProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#1f3f7a" roughness={0.3} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[-0.06, 0.06, 0]}>
        <boxGeometry args={[0.002, 0.04, 0.03]} />
        <meshStandardMaterial color="#e9f5ff" roughness={0.2} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <CapacitorLead
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {selected && (
        <mesh position={[0, 0.13, 0]}>
          <ringGeometry args={[0.07, 0.084, 20]} />
          <meshBasicMaterial color="#9ff5ff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Capacitor);
