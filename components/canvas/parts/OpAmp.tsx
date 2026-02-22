'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface OpAmpProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.381, 0, -0.127],
  [-0.381, 0, 0.127],
  [0.381, 0, 0],
  [0, 0, -0.254],
  [0, 0, 0.254],
];

function OpAmpLead({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#90e3ff' : '#666'} roughness={0.48} />
    </mesh>
  );
}

function OpAmp({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: OpAmpProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.07, -0.004]} castShadow>
        <boxGeometry args={[0.18, 0.07, 0.14]} />
        <meshStandardMaterial color="#4a4d62" roughness={0.42} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.07, 0]}>
        <coneGeometry args={[0.065, 0.07, 3]} />
        <meshStandardMaterial color="#a0a3bb" roughness={0.45} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.004, 0.03, 0.004]} />
        <meshStandardMaterial color="#555" />
      </mesh>

      <mesh position={[0.095, 0.07, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.08, 10]} />
        <meshStandardMaterial color="#3e3e3e" />
      </mesh>

      <mesh position={[-0.09, 0.07, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.018, 0.01, 0.012]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <OpAmpLead key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.14, 0]}>
          <ringGeometry args={[0.1, 0.118, 20]} />
          <meshBasicMaterial color="#a7edff" transparent opacity={0.46} />
        </mesh>
      )}
    </group>
  );
}

export default memo(OpAmp);
