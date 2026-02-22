'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface DiodeProps {
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

function DiodeLeg({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#fbd07d' : '#666'} roughness={0.45} />
    </mesh>
  );
}

function CathodeBand({ selected, selectedOffset = 0.06 }: { selected: boolean; selectedOffset?: number }) {
  return (
    <mesh position={[selectedOffset, 0.065, 0]}>
      <torusGeometry args={[0.024, 0.01, 12, 24, Math.PI]} />
      <meshStandardMaterial color={selected ? '#ffeec9' : '#333'} roughness={0.28} metalness={0.7} />
    </mesh>
  );
}

function Diode({ anchorPos, selected = false, transparent = false, pinOffsets = DEFAULT_PIN_OFFSETS, rotationY = 0, onClick }: DiodeProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.082, 14]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.45} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[-0.02, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.02, 8]} />
        <meshStandardMaterial color="#7f7f7f" roughness={0.4} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0.02, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.02, 8]} />
        <meshStandardMaterial color="#7f7f7f" roughness={0.4} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.073, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.022, 0.028, 16]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>

      <CathodeBand selected={selected} selectedOffset={0.08} />
      <mesh position={[0.08, 0.065, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.08, 16]} />
        <meshStandardMaterial color="#7d7d7d" />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <DiodeLeg key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.12, 0]}>
          <ringGeometry args={[0.078, 0.092, 20]} />
          <meshBasicMaterial color="#ffe4a7" transparent opacity={0.48} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Diode);
