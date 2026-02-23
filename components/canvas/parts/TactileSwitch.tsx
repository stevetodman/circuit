'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';
import { PITCH } from '@/constants/breadboard';

interface TactileSwitchProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  closed?: number;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-PITCH, 0, 0],
  [PITCH, 0, 0],
];

const AUX_LEGS: Vec3[] = [
  [-0.09, 0, 0],
  [0.09, 0, 0],
];

function SwitchLeg({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#d5ffa0' : '#666'} roughness={0.45} />
    </mesh>
  );
}

function TactileSwitch({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
  closed = 0,
}: TactileSwitchProps) {
  const bodyOpacity = transparent ? 0.75 : 1;
  const isClosed = closed === 1;
  const domeColor = isClosed ? '#32ce68' : '#8d8d8d';

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      {/* 6 mm tact switch body at 1:1 scale */}
      <mesh position={[0, 0.175, 0]} castShadow>
        <boxGeometry args={[0.55, 0.30, 0.55]} />
        <meshStandardMaterial color="#151515" roughness={0.54} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {/* Dome button */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={domeColor} roughness={0.28} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <SwitchLeg
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {AUX_LEGS.map((offset, index) => (
        <mesh key={`${anchorPos.join('-')}-aux-${index}`} position={offset}>
          <cylinderGeometry args={[0.005, 0.005, 0.05, 8]} />
          <meshStandardMaterial color="#444" roughness={0.45} />
        </mesh>
      ))}

      {selected && (
        <mesh position={[0, 0.52, 0]}>
          <ringGeometry args={[0.35, 0.41, 16]} />
          <meshBasicMaterial color="#a8ffbf" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(TactileSwitch);
