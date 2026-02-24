'use client';

import { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { ComponentType, PlacedComponent, Vec3 } from '@/types/circuit';
import { PITCH } from '@/constants/breadboard';
import { useCircuitStore } from '@/store/circuitStore';
import { useDragStore } from '@/store/dragStore';
import { useUIStore } from '@/store/uiStore';
import LED from './LED';
import Resistor from './Resistor';
import Battery from './Battery';
import Diode from './Diode';
import MOSFET from './MOSFET';
import OpAmp from './OpAmp';
import Inductor from './Inductor';
import Potentiometer from './Potentiometer';
import Capacitor from './Capacitor';
import TactileSwitch from './TactileSwitch';
import BJT from './BJT';
import Timer555 from './Timer555';
import ArduinoUno from './ArduinoUno';
import Motor from './Motor';
import VoltageRegulator from './VoltageRegulator';

interface ComponentRendererProps {
  componentId:    string;
  designator:     string;
  type:           ComponentType;
  anchorPos:      Vec3;
  rotationY?:     number;   // degrees (0 | 90 | 180 | 270)
  pinOffsets?:    Vec3[];
  selected?:      boolean;
  multiSelected?: boolean;
  transparent?:   boolean;
  onClick?:       (event: ThreeEvent<MouseEvent>) => void;
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  anodeNetId?:    number | null;
  cathodeNetId?:  number | null;
  componentProps?: Record<string, number | string>;
}

const ZERO: Vec3 = [0, 0, 0];

function formatComponentValue(comp: PlacedComponent): string {
  const p = comp.props as Record<string, unknown>;
  switch (comp.type) {
    case 'resistor': {
      const r = Number(p.resistance ?? 220);
      if (r >= 1_000_000) return `${(r / 1_000_000).toFixed(1)}MΩ`;
      if (r >= 1_000) return `${(r / 1_000).toFixed(r % 1000 === 0 ? 0 : 1)}kΩ`;
      return `${r}Ω`;
    }
    case 'capacitor': {
      const c = Number(p.capacitance ?? 0.0001);
      if (c >= 0.001) return `${(c * 1000).toFixed(0)}mF`;
      if (c >= 1e-6) return `${(c * 1e6).toFixed(0)}µF`;
      return `${(c * 1e9).toFixed(0)}nF`;
    }
    case 'battery': {
      const v = Number(p.voltage ?? 9);
      return `${v}V`;
    }
    case 'inductor': {
      const l = Number(p.inductance ?? 0.001);
      if (l >= 1) return `${l.toFixed(1)}H`;
      if (l >= 0.001) return `${(l * 1000).toFixed(0)}mH`;
      return `${(l * 1e6).toFixed(0)}µH`;
    }
    case 'voltageRegulator':
      return `${Number(p.voltage ?? 5)}V`;
    case 'led': return (p.color as string | undefined)?.replace(/^#/, '') ? '' : '';
    default: return '';
  }
}

const PRIMARY_VALUE_KEY: Partial<Record<ComponentType | 'dcVoltage', string>> = {
  resistor: 'resistance',
  capacitor: 'capacitance',
  inductor: 'inductance',
  battery: 'voltage',
  potentiometer: 'resistance',
  zener: 'voltage',
  timer555: 'r1',
  voltageRegulator: 'voltage',
  dcVoltage: 'voltage',
};

function FallbackPart({ pinOffsets = [], selected, onClick }: {
  pinOffsets?: Vec3[];
  selected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const offsets: Vec3[] = pinOffsets.length
    ? pinOffsets
    : ([[-PITCH, 0, 0] as Vec3, [PITCH, 0, 0] as Vec3]);

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
  multiSelected,
  transparent,
  onClick,
  onContextMenu,
  onPointerDown,
  anodeNetId,
  cathodeNetId,
  componentProps,
}: ComponentRendererProps) {
  const rotYRad = (rotationY * Math.PI) / 180;
  const dragging = useDragStore((state) => state.dragging);
  const showDesignators = useUIStore((state) => state.showDesignators);
  const showValueLabels = useUIStore((state) => state.showValueLabels);
  const overloadIds = useUIStore((state) => state.overloadIds);
  const componentValueLabel = formatComponentValue({
    type,
    props: componentProps ?? {},
  } as PlacedComponent);
  const isOverloaded = overloadIds.includes(componentId);
  const locked = useCircuitStore((state) => state.components[componentId]?.locked ?? false);
  const overloadMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const multiSelectRingRef = useRef<THREE.MeshStandardMaterial>(null);
  const selectedRingRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera, gl } = useThree();

  useFrame(({ clock }) => {
    if (overloadMaterialRef.current) {
      if (!isOverloaded) {
        overloadMaterialRef.current.emissiveIntensity = 0;
      } else {
        const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 8);
        overloadMaterialRef.current.emissiveIntensity = 0.2 + pulse * 0.6;
      }
    }

    if (multiSelectRingRef.current) {
      if (multiSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5);
        multiSelectRingRef.current.emissiveIntensity = 0.3 + pulse * 0.5;
        multiSelectRingRef.current.opacity = 0.25 + pulse * 0.25;
      } else {
        multiSelectRingRef.current.emissiveIntensity = 0;
        multiSelectRingRef.current.opacity = 0;
      }
    }

    if (selectedRingRef.current) {
      if (selected && !multiSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
        selectedRingRef.current.emissiveIntensity = 0.2 + pulse * 0.3;
        selectedRingRef.current.opacity = 0.18 + pulse * 0.18;
      } else {
        selectedRingRef.current.emissiveIntensity = 0;
        selectedRingRef.current.opacity = 0;
      }
    }
  });

  const toggleSelectedComponent = useCircuitStore((state) => state.toggleSelectedComponent);
  const setProperty             = useCircuitStore((state) => state.setProperty);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (event.nativeEvent.shiftKey) {
      toggleSelectedComponent(componentId);
      return;
    }

    // Tactile switch: toggle closed state on click (0 → 1 → 0)
    if (type === 'tactileSwitch') {
      const currentClosed = Number(componentProps?.closed ?? 0);
      setProperty(componentId, 'closed', currentClosed === 1 ? 0 : 1);
      return;
    }

    if (onClick) {
      onClick(event);
    }
  };

  const handleDoubleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const {
      contextMenu,
      canvasMenu,
      wireMenu,
      editingNoteId,
      showHelp,
    } = useUIStore.getState();

    if (contextMenu || canvasMenu || wireMenu || editingNoteId || showHelp) return;
    if (!PRIMARY_VALUE_KEY[type]) return;

    const vec = new THREE.Vector3(anchorPos[0], anchorPos[1], anchorPos[2]);
    vec.project(camera);

    if (!Number.isFinite(vec.x) || !Number.isFinite(vec.y) || !Number.isFinite(vec.z)) return;
    if (vec.z < -1 || vec.z > 1) return;

    const rect = gl.domElement.getBoundingClientRect();
    const sx = ((vec.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-vec.y + 1) / 2) * rect.height + rect.top;
    useUIStore.getState().openInlineEdit(componentId, sx, sy);
  };

  let inner: React.ReactNode;
  switch (type) {
    case 'led':
      inner = (
        <LED
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
          anodeNetId={anodeNetId}
          cathodeNetId={cathodeNetId}
        />
      );
      break;
    case 'capacitor':
      inner = (
        <Capacitor
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'tactileSwitch':
      inner = (
        <TactileSwitch
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
          closed={componentProps?.closed as number | undefined}
        />
      );
      break;
    case 'bjt':
    case 'pnp':
      inner = (
        <BJT
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'timer555':
      inner = (
        <Timer555
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'arduino':
      inner = (
        <ArduinoUno
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'motor':
      inner = (
        <Motor
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
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
          onClick={handleClick}
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
          onClick={handleClick}
        />
      );
      break;
    case 'diode':
    case 'zener':
    case 'schottky':
      inner = (
        <Diode
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'mosfet':
      inner = (
        <MOSFET
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'opamp':
      inner = (
        <OpAmp
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'inductor':
      inner = (
        <Inductor
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
        />
      );
      break;
    case 'voltageRegulator':
      inner = (
        <VoltageRegulator
          anchorPos={ZERO}
          transparent={transparent}
          onClick={handleClick}
          componentProps={{ voltage: Number(componentProps?.voltage ?? 5) }}
        />
      );
      break;
    case 'potentiometer':
      inner = (
        <Potentiometer
          anchorPos={ZERO}
          selected={selected}
          transparent={transparent}
          pinOffsets={pinOffsets}
          onClick={handleClick}
          wiper={Number(componentProps?.wiper ?? 0.5)}
          onWiperChange={(value) => setProperty(componentId, 'wiper', value)}
        />
      );
      break;
    default:
      inner = (
        <FallbackPart
          pinOffsets={pinOffsets}
          selected={selected}
          onClick={handleClick}
        />
      );
  }

  return (
    <group
      position={anchorPos}
      rotation={[0, rotYRad, 0]}
      userData={{ componentId }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onDoubleClick={handleDoubleClick}
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
        >
          {designator}
        </Text>
      )}
      {showValueLabels && !dragging && componentValueLabel && (
        <Text
          position={[0, 0.13, 0]}
          fontSize={0.065}
          color="#ffffff"
          fillOpacity={0.40}
          anchorX="center"
          anchorY="middle"
        >
          {componentValueLabel}
        </Text>
      )}
      {locked && (
        <Text
          position={[0, 0.30, 0]}
          fontSize={0.12}
          color="#ffcc44"
          anchorX="center"
          anchorY="middle"
          depthOffset={-1}
        >
          🔒
        </Text>
      )}
      {isOverloaded && (
        <mesh position={[0, 0.22, 0]}>
          <sphereGeometry args={[0.2, 20, 16]} />
          <meshStandardMaterial
            ref={overloadMaterialRef}
            color="#ff2200"
            emissive="#ff2200"
            emissiveIntensity={0}
            transparent
            opacity={0.35}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {multiSelected && (
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.8]} />
          <meshStandardMaterial
            ref={multiSelectRingRef}
            color="#7b5cf0"
            emissive="#7b5cf0"
            emissiveIntensity={0.5}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* Single-selection ring — always mounted, animated by useFrame */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.18, 28]} />
        <meshStandardMaterial
          ref={selectedRingRef}
          color="#7c6fff"
          emissive="#7c6fff"
          emissiveIntensity={0}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
