'use client';

import type { ThreeEvent } from '@react-three/fiber';
import type { ComponentType, Vec3 } from '@/types/circuit';
import LED from './LED';
import Resistor from './Resistor';
import Battery from './Battery';

interface ComponentRendererProps {
  type:          ComponentType;
  anchorPos:     Vec3;
  pinOffsets?:   Vec3[];
  selected?:     boolean;
  transparent?:  boolean;
  rotationY?:    number;
  onClick?:      (event: ThreeEvent<MouseEvent>) => void;
  // Voltage props forwarded to LED
  anodeNetId?:   number | null;
  cathodeNetId?: number | null;
}

function FallbackPart({ anchorPos, pinOffsets = [], selected, onClick, rotationY = 0 }: {
  anchorPos: Vec3;
  pinOffsets: Vec3[];
  selected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  rotationY?: number;
}) {
  const offsets: Vec3[] = pinOffsets.length
    ? pinOffsets
    : ([
        [-0.254, 0, 0] as Vec3,
        [0.254, 0, 0] as Vec3,
      ]);

  return (
    <group position={anchorPos} rotation={[0, rotationY * Math.PI / 180, 0]} onClick={onClick}>
      <mesh position={[0, 0.065, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.06]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.7} />
      </mesh>

      {offsets.map((offset, index) => (
        <mesh key={`${anchorPos.join('-')}-${index}-${offset[0]}`} position={offset}>
          <cylinderGeometry args={[0.006, 0.006, 0.05, 10]} />
          <meshStandardMaterial color={selected ? '#ffddaa' : '#777'} roughness={0.4} />
        </mesh>
      ))}

      {selected && (
        <mesh position={[0, 0.115, 0]}>
          <ringGeometry args={[0.08, 0.092, 16]} />
          <meshBasicMaterial color="#88ff88" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}

export default function ComponentRenderer({
  type,
  anchorPos,
  pinOffsets,
  selected,
  transparent,
  rotationY = 0,
  onClick,
  anodeNetId,
  cathodeNetId,
}: ComponentRendererProps) {
  switch (type) {
    case 'led':
      return (
        <LED
          rotationY={rotationY}
          anchorPos={anchorPos}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
          anodeNetId={anodeNetId}
          cathodeNetId={cathodeNetId}
        />
      );
    case 'resistor':
      return (
        <Resistor
          rotationY={rotationY}
          anchorPos={anchorPos}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
        />
      );
    case 'battery':
      return (
        <Battery
          rotationY={rotationY}
          anchorPos={anchorPos}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
        />
      );
    default:
      return (
        <FallbackPart
          anchorPos={anchorPos}
          pinOffsets={pinOffsets ?? []}
          selected={selected}
          onClick={onClick}
          rotationY={rotationY}
        />
      );
  }
}
