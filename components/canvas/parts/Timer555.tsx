'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';

interface Timer555Props {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-0.254, 0, -0.254],
  [0.254, 0, -0.254],
  [-0.254, 0, 0.254],
  [0.254, 0, 0.254],
];

const DIP_LEGS: Vec3[] = [
  [-0.25, 0, -0.254],
  [-0.25, 0, -0.084],
  [-0.25, 0, 0.084],
  [-0.25, 0, 0.254],
  [0.25, 0, -0.254],
  [0.25, 0, -0.084],
  [0.25, 0, 0.084],
  [0.25, 0, 0.254],
];

function isFunctionalPin(position: Vec3, pins: Vec3[]) {
  return pins.some((pin) => Math.abs(pin[0] - position[0]) < 0.03 && Math.abs(pin[2] - position[2]) < 0.03);
}

function TimerPin({
  position,
  selected,
  functional,
}: {
  position: Vec3;
  selected: boolean;
  functional: boolean;
}) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.004, 0.004, functional ? 0.05 : 0.04, 8]} />
      <meshStandardMaterial
        color={selected ? (functional ? '#9ff7b9' : '#a9a9a9') : (functional ? '#7f7f7f' : '#4e4e4e')}
        roughness={0.45}
      />
    </mesh>
  );
}

function Timer555({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: Timer555Props) {
  const bodyOpacity = transparent ? 0.75 : 1;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.15, 0.04, 0.08]} />
        <meshStandardMaterial color="#111" roughness={0.45} transparent={transparent} opacity={bodyOpacity} />
      </mesh>

      <mesh position={[-0.08, 0.02, -0.055]}>
        <boxGeometry args={[0.02, 0.004, 0.02]} />
        <meshStandardMaterial color="#f8e08a" roughness={0.2} />
      </mesh>

      <mesh position={[-0.08, 0.025, -0.055]}>
        <sphereGeometry args={[0.004, 8, 8]} />
        <meshStandardMaterial color="#ffefbf" roughness={0.2} />
      </mesh>

      {DIP_LEGS.map((position, index) => (
        <TimerPin
          key={`${anchorPos.join('-')}-leg-${index}`}
          position={position}
          selected={selected}
          functional={isFunctionalPin(position, pinOffsets)}
        />
      ))}

      {selected && (
        <mesh position={[0, 0.08, 0]}>
          <ringGeometry args={[0.095, 0.11, 16]} />
          <meshBasicMaterial color="#9dffce" transparent opacity={0.45} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Timer555);
