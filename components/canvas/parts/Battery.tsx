'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';
import { Text } from '@react-three/drei';
import { PITCH } from '@/constants/breadboard';
import { useUIStore } from '@/store/uiStore';

interface BatteryProps {
  anchorPos: Vec3;
  selected?: boolean;
  transparent?: boolean;
  pinOffsets?: Vec3[];
  rotationY?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const DEFAULT_PIN_OFFSETS: Vec3[] = [
  [-PITCH, 0, 0],
  [PITCH, 0, 0],
];

function Terminal({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.045, 8]} />
      <meshStandardMaterial color={selected ? '#ffdf88' : '#999'} roughness={0.5} />
    </mesh>
  );
}

function Battery({
  anchorPos,
  selected = false,
  transparent = false,
  pinOffsets = DEFAULT_PIN_OFFSETS,
  rotationY = 0,
  onClick,
}: BatteryProps) {
  const opacity = transparent ? 0.75 : 1;
  const showPolarityLabels = useUIStore((state) => state.showPolarityLabels);
  const negativePos = pinOffsets[0] ?? DEFAULT_PIN_OFFSETS[0];
  const positivePos = pinOffsets[1] ?? DEFAULT_PIN_OFFSETS[1];

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      {/* 9 V battery block body */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.42, 0.46, 0.22]} />
        <meshStandardMaterial color="#222" roughness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Label area */}
      <mesh position={[0, 0.28, 0.115]}>
        <boxGeometry args={[0.40, 0.42, 0.004]} />
        <meshStandardMaterial color="#c00" roughness={0.5} />
      </mesh>

      {/* Negative terminal cap */}
      <mesh position={[-0.12, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#888" roughness={0.25} metalness={0.6} />
      </mesh>
      <mesh position={[-0.12, 0.56, 0]}>
        <boxGeometry args={[0.008, 0.04, 0.10]} />
        <meshStandardMaterial color="#fff" roughness={0.2} />
      </mesh>

      {/* Positive terminal cap */}
      <mesh position={[0.12, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
        <meshStandardMaterial color="#888" roughness={0.25} metalness={0.6} />
      </mesh>
      <mesh position={[0.12, 0.56, 0]}>
        <boxGeometry args={[0.008, 0.04, 0.10]} />
        <meshStandardMaterial color="#fff" roughness={0.2} />
      </mesh>
      <mesh position={[0.12, 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.008, 0.04, 0.10]} />
        <meshStandardMaterial color="#fff" roughness={0.2} />
      </mesh>

      {showPolarityLabels && (
        <>
          <Text
            position={[negativePos[0], 0.12, negativePos[2]]}
            fontSize={0.08}
            color="#6b9fff"
            anchorX="center"
            anchorY="middle"
            renderOrder={10}
          >
            −
          </Text>
          <Text
            position={[positivePos[0], 0.12, positivePos[2]]}
            fontSize={0.08}
            color="#ff6b6b"
            anchorX="center"
            anchorY="middle"
            renderOrder={10}
          >
            +
          </Text>
        </>
      )}

      {pinOffsets.map((offset, index) => (
        <Terminal key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.60, 0]}>
          <ringGeometry args={[0.26, 0.30, 20]} />
          <meshBasicMaterial color="#a8edff" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Battery);
