'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface LEDProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  color?: string;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.254, 0, 0],
  [0.254, 0, 0],
];

const LEDPin = ({ position, selected }: { position: Vec3; selected: boolean }) => (
  <mesh position={position}>
    <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
    <meshStandardMaterial
      color={selected ? '#ff7a7a' : '#777'}
      roughness={0.3}
      metalness={0.15}
    />
  </mesh>
);

function LED({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  onClick,
  color = '#ff2020',
}: LEDProps) {
  const opacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} onClick={onClick}>
      <mesh position={[0, 0.085 / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.085, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.05}
          emissive={selected ? '#ff4040' : '#000000'}
          emissiveIntensity={selected ? 0.45 : 0}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      <mesh position={[0, 0.085, 0]}>
        <sphereGeometry args={[0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} transparent opacity={transparent ? 0.65 : 0.7} />
      </mesh>

      {pinOffsets.map((offset, index) => (
        <LEDPin key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.12, 0]}>
          <ringGeometry args={[0.065, 0.08, 24]} />
          <meshBasicMaterial color="#fff7a0" transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}

export default memo(LED);
