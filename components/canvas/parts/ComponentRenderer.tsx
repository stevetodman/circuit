'use client';

import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { ComponentType, Vec3 } from '@/types/circuit';
import { useDragStore } from '@/store/dragStore';
import { useUIStore } from '@/store/uiStore';
import LED from './LED';
import Resistor from './Resistor';
import Battery from './Battery';

interface ComponentRendererProps {
  componentId:    string;
  designator:     string;
  type:           ComponentType;
  anchorPos:      Vec3;
  rotationY?:     number;   // degrees (0 | 90 | 180 | 270)
  pinOffsets?:    Vec3[];
  selected?:      boolean;
  transparent?:   boolean;
  onClick?:       (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
  anodeNetId?:    number | null;
  cathodeNetId?:  number | null;
}

const ZERO: Vec3 = [0, 0, 0];

function FallbackPart({ pinOffsets = [], selected, onClick }: {
  pinOffsets?: Vec3[];
  selected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const offsets: Vec3[] = pinOffsets.length
    ? pinOffsets
    : ([[-0.254, 0, 0] as Vec3, [0.254, 0, 0] as Vec3);

  return (
    <group onClick={onClick}>
      <mesh position={[0, 0.065, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.06]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.7} />
      </mesh>
      {offsets.map((offset, index) => (
        <mesh key={index} position={offset}>
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

/**
 * Wraps every part in a rotation group so rotationY is applied uniformly.
 * All part components receive anchorPos=[0,0,0] — position is handled here.
 */
export default function ComponentRenderer({
  componentId,
  designator,
  type,
  anchorPos,
  rotationY = 0,
  pinOffsets,
  selected,
  transparent,
  onClick,
  onContextMenu,
  anodeNetId,
  cathodeNetId,
}: ComponentRendererProps) {
  const rotYRad = (rotationY * Math.PI) / 180;
  const dragging = useDragStore((state) => state.dragging);
  const showDesignators = useUIStore((state) => state.showDesignators);

  let inner: React.ReactNode;
  switch (type) {
    case 'led':
      inner = (
        <LED
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
          anodeNetId={anodeNetId}
          cathodeNetId={cathodeNetId}
        />
      );
      break;
    case 'resistor':
      inner = (
        <Resistor
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
        />
      );
      break;
    case 'battery':
      inner = (
        <Battery
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={onClick}
        />
      );
      break;
    default:
      inner = (
        <FallbackPart
          pinOffsets={pinOffsets}
          selected={selected}
          onClick={onClick}
        />
      );
  }

  return (
    <group
      position={anchorPos}
      rotation={[0, rotYRad, 0]}
      userData={{ componentId }}
      onContextMenu={onContextMenu}
    >
      {inner}
      {showDesignators && !dragging && designator && (
        <Text
          position={[0, 0.22, 0]}
          fontSize={0.08}
          color="#ffffff"
          fillOpacity={0.55}
          anchorX="center"
          anchorY="middle"
          depthTest={false}
        >
          {designator}
        </Text>
      )}
    </group>
  );
}
