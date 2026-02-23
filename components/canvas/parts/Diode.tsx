'use client';

import { memo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';
import { PITCH } from '@/constants/breadboard';
import { Text } from '@react-three/drei';
import { useUIStore } from '@/store/uiStore';

interface DiodeProps {
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

function DiodeLeg({ position, selected }: { position: Vec3; selected: boolean }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.006, 0.006, 0.05, 8]} />
      <meshStandardMaterial color={selected ? '#fbd07d' : '#666'} roughness={0.45} />
    </mesh>
  );
}

function CathodeBand({ selected, selectedOffset = 0.06 }: { selected: boolean; selectedOffset?: number }) {
  return (
    <mesh position={[selectedOffset, 0.32, 0]}>
      <torusGeometry args={[0.12, 0.05, 12, 24, Math.PI]} />
      <meshStandardMaterial color={selected ? '#ffeec9' : '#333'} roughness={0.28} metalness={0.7} />
    </mesh>
  );
}

function Diode({ anchorPos, selected = false, transparent = false, pinOffsets = DEFAULT_PIN_OFFSETS, rotationY = 0, onClick }: DiodeProps) {
  const opacity = transparent ? 0.75 : 1;
  const showPolarityLabels = useUIStore((state) => state.showPolarityLabels);
  const anodeX = pinOffsets[0] ? pinOffsets[0][0] : -PITCH;
  const cathodeX = pinOffsets[1] ? pinOffsets[1][0] : PITCH;

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      {/* Glass body — ~2 mm dia × 4 mm long at 1:1 scale, standing upright */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.41, 14]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.45} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Lead caps at top and bottom of glass body */}
      <mesh position={[-0.09, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.10, 8]} />
        <meshStandardMaterial color="#7f7f7f" roughness={0.4} transparent={transparent} opacity={opacity} />
      </mesh>

      <mesh position={[0.09, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.10, 8]} />
        <meshStandardMaterial color="#7f7f7f" roughness={0.4} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Direction indicator dot */}
      <mesh position={[0, 0.365, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.11, 0.14, 16]} />
        <meshStandardMaterial color="#444" roughness={0.5} />
      </mesh>

      {/* Cathode band */}
      <CathodeBand selected={selected} selectedOffset={0.18} />
      <mesh position={[0.18, 0.32, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.41, 16]} />
        <meshStandardMaterial color="#7d7d7d" />
      </mesh>

      {showPolarityLabels && (
        <>
          <Text
            position={[anodeX, 0.12, pinOffsets[0] ? pinOffsets[0][2] : 0]}
            fontSize={0.08}
            color="#ff6b6b"
            anchorX="center"
            anchorY="middle"
            renderOrder={10}
          >
            +
          </Text>
          <Text
            position={[cathodeX, 0.12, pinOffsets[1] ? pinOffsets[1][2] : 0]}
            fontSize={0.08}
            color="#6b9fff"
            anchorX="center"
            anchorY="middle"
            renderOrder={10}
          >
            −
          </Text>
        </>
      )}

      {pinOffsets.map((offset, index) => (
        <DiodeLeg key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset} selected={selected} />
      ))}

      {selected && (
        <mesh position={[0, 0.55, 0]}>
          <ringGeometry args={[0.17, 0.22, 20]} />
          <meshBasicMaterial color="#ffe4a7" transparent opacity={0.48} />
        </mesh>
      )}
    </group>
  );
}

export default memo(Diode);
