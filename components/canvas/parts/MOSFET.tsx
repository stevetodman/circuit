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
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[0.19, 0.055, 0.11]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} transparent={transparent} opacity={bodyOpacity} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.11, 0.02, 0.08]} />
        <meshStandardMaterial color="#a8f4ff" roughness={0.25} transparent={transparent} opacity={Math.min(1, bodyOpacity + 0.04)} />
      </mesh>

      <mesh position={[-0.075, 0.07, -0.055]}>
        <boxGeometry args={[0.005, 0.08, 0.005]} />
        <meshStandardMaterial color="#444" roughness={0.2} />
      </mesh>

      <mesh position={[0, 0.07, -0.055]}>
        <boxGeometry args={[0.005, 0.08, 0.005]} />
        <meshStandardMaterial color="#444" roughness={0.2} />
      </mesh>

      <mesh position={[0.075, 0.07, -0.055]}>
        <boxGeometry args={[0.005, 0.08, 0.005]} />
        <meshStandardMaterial color="#444" roughness={0.2} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <MOSFETLead key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.14, 0]}>
          <ringGeometry args={[0.085, 0.1, 16]} />
          <meshBasicMaterial color="#a7fff8" transparent opacity={0.42} />
        </mesh>
      )}
    </group>
  );
}

export default memo(MOSFET);
