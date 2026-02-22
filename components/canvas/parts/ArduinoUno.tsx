'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { PIN_TEMPLATES, type Vec3 } from '@/types/circuit';

interface ArduinoUnoProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = PIN_TEMPLATES.arduino.map((pin) => pin.offset);
const BOARD_HALF_WIDTH = 0.2;

function HeaderPin({
  position,
  selected,
}: {
  position: Vec3;
  selected: boolean;
}) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#ffd6a0' : '#777'} roughness={0.45} />
    </mesh>
  );
}

function ArduinoUno({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: ArduinoUnoProps) {
  const opacity = transparent ? 0.75 : 1;

  const zValues = pinOffsets.map((pin) => pin[2]);
  const hasPins = zValues.length > 0;
  const zMin = hasPins ? Math.min(...zValues) : -0.125;
  const zMax = hasPins ? Math.max(...zValues) : 0.125;
  const centerZ = hasPins ? (zMin + zMax) / 2 : 0;
  const boardDepth = Math.max(0.25, zMax - zMin + 0.2);
  const splitIndex = Math.ceil(pinOffsets.length / 2);
  const usbZ = (hasPins ? zMax : 0) + 0.11;

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.01, centerZ]} castShadow>
        <boxGeometry args={[0.4, 0.02, boardDepth]} />
        <meshStandardMaterial color="#2db39a" roughness={0.65} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0, 0.022, centerZ - boardDepth / 2 + 0.06]}>
        <boxGeometry args={[0.4, 0.003, 0.03]} />
        <meshStandardMaterial color="#0f6252" roughness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[-BOARD_HALF_WIDTH, 0.03, centerZ]}>
        <boxGeometry args={[0.002, 0.004, boardDepth]} />
        <meshStandardMaterial color="#163d37" />
      </mesh>

      <mesh position={[BOARD_HALF_WIDTH, 0.03, centerZ]}>
        <boxGeometry args={[0.002, 0.004, boardDepth]} />
        <meshStandardMaterial color="#163d37" />
      </mesh>

      <mesh position={[0, 0.0175, usbZ]}>
        <boxGeometry args={[0.14, 0.015, 0.055]} />
        <meshStandardMaterial color="#333" roughness={0.3} transparent={transparent} opacity={opacity} />
      </mesh>

      {pinOffsets.map((pin, index) => {
        const side = index < splitIndex ? -1 : 1;
        return (
          <HeaderPin
            key={`${anchorPos.join('-')}-${index}-${pin[2]}`}
            position={[side * BOARD_HALF_WIDTH, 0.03, pin[2]]}
            selected={selected}
          />
        );
      })}

      {selected && (
        <mesh position={[0, 0.14, centerZ]}>
          <ringGeometry args={[0.2, 0.23, 16]} />
          <meshBasicMaterial color="#9cf2ff" transparent opacity={0.44} />
        </mesh>
      )}
    </group>
  );
}

export default memo(ArduinoUno);
