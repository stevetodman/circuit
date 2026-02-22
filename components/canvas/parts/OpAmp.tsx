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
      {/* DIP-8 black plastic body — op-amps are physically identical to 555 timers */}
      <mesh position={[0, 0.175, 0]} castShadow>
        <boxGeometry args={[0.75, 0.30, 0.62]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.42} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Pin-1 notch / semicircle indent at left end */}
      <mesh position={[-0.375, 0.175, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.32, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.4} />
      </mesh>

      {/* Top label stripe — LM741 or similar */}
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[0.50, 0.02, 0.28]} />
        <meshStandardMaterial color="#a0a3bb" roughness={0.3} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <OpAmpLead key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.50, 0]}>
          <ringGeometry args={[0.52, 0.58, 20]} />
          <meshBasicMaterial color="#a7edff" transparent opacity={0.46} />
        </mesh>
      )}
    </group>
  );
}

export default memo(OpAmp);
