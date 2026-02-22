'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface PotentiometerProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.254, 0, 0],
  [0, 0, 0],
  [0.254, 0, 0],
];

function PotLead({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffdf80' : '#777'} roughness={0.45} />
    </mesh>
  );
}

function Potentiometer({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: PotentiometerProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      {/* Rotary pot body — ~10 mm dia at 1:1 scale */}
      <mesh position={[0, 0.30, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.22, 24]} />
        <meshStandardMaterial color="#333" roughness={0.5} metalness={0.06} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Base mounting flange */}
      <mesh position={[0, 0.30, 0.175]}>
        <boxGeometry args={[0.55, 0.05, 0.10]} />
        <meshStandardMaterial color="#666" />
      </mesh>

      {/* Shaft housing */}
      <mesh position={[0, 0.42, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.09, 0.20]} />
        <meshStandardMaterial color="#8d8d8d" />
      </mesh>

      {/* Shaft */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.225, 14]} />
        <meshStandardMaterial color="#111" transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Side bearing screws */}
      <mesh position={[-0.40, 0.31, 0.175]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.075, 12]} />
        <meshStandardMaterial color="#888" />
      </mesh>

      <mesh position={[0.40, 0.31, 0.175]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.075, 12]} />
        <meshStandardMaterial color="#888" />
      </mesh>

      {/* Wiper indicator */}
      <mesh position={[0, 0.48, 0.30]} rotation={[Math.PI, Math.PI / 2, 0]}>
        <coneGeometry args={[0.05, 0.10, 8]} />
        <meshStandardMaterial color="#bbb" roughness={0.2} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <PotLead key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.60, 0]}>
          <ringGeometry args={[0.22, 0.27, 16]} />
          <meshBasicMaterial color="#aef2ff" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Potentiometer);
