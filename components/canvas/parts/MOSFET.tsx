'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface MOSFETProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.381, 0, 0],
  [0, 0, 0],
  [0.381, 0, 0],
];

function MOSFETLead({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffa84f' : '#555'} roughness={0.45} />
    </mesh>
  );
}

function MOSFET({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: MOSFETProps) {
  const bodyOpacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      {/* TO-220 black plastic body — ~15 × 10 × 4.5 mm at 1:1 scale */}
      <mesh position={[0, 0.40, 0]} castShadow>
        <boxGeometry args={[1.10, 0.45, 0.85]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Metal heatsink tab — the defining TO-220 feature */}
      <mesh position={[0, 0.55, -0.50]}>
        <boxGeometry args={[1.10, 0.70, 0.08]} />
        <meshStandardMaterial color="#aaa" roughness={0.2} metalness={0.8} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Mounting hole on tab */}
      <mesh position={[0, 0.55, -0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.10, 12]} />
        <meshStandardMaterial color="#888" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Gate label stripe */}
      <mesh position={[0, 0.68, 0]}>
        <boxGeometry args={[0.85, 0.16, 0.65]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.4} transparent={transparent} opacity={Math.min(1, bodyOpacity + 0.04)} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <MOSFETLead key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.90, 0]}>
          <ringGeometry args={[0.62, 0.70, 16]} />
          <meshBasicMaterial color="#a7fff8" transparent opacity={0.42} />
        </mesh>
      )}
    </group>
  );
}

export default memo(MOSFET);
