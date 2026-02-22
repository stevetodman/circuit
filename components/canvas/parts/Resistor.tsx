'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface ResistorProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.508, 0, 0],
  [0.508, 0, 0],
];

function ResistorLeg({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffddaa' : '#8a8a8a'} roughness={0.45} />
    </mesh>
  );
}

function Resistor({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  onClick,
}: ResistorProps) {
  const bodyOpacity = transparent ? 0.75 : 1;
  const bandPositions = [-0.022, 0, 0.022];
  const bandColors = ['#555', '#f8a03c', '#202020'];

  return (
    <group position={anchorPos} rotation={[0, 0, Math.PI / 2]} onClick={onClick}>
      <mesh position={[0, 0.065, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.09, 12]} />
        <meshStandardMaterial color="#c8a060" roughness={0.7} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      {bandPositions.map((bandPos, index) => (
        <mesh key={`${anchorPos.join('-')}-${index}`} position={[bandPos, 0.065, 0]}>
          <torusGeometry args={[0.025, 0.009, 8, 18]} />
          <meshStandardMaterial color={bandColors[index]} roughness={0.45} />
        </mesh>
      ))}

      {pinOffsets.map((offset, index) => (
        <ResistorLeg key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.125, 0]}>
          <ringGeometry args={[0.07, 0.082, 20]} />
          <meshBasicMaterial color="#7dffbe" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Resistor);
