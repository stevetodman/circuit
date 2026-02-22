'use client';

import { useRef, memo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { Vec3 } from '@/types/circuit';
import { MAX_NETS } from '@/types/circuit';
import { voltages } from '@/simulation/SimBridge';

interface LEDProps {
  anchorPos:     Vec3;
  selected?:     boolean;
  transparent?:  boolean;
  pinOffsets?:   Vec3[];
  rotationY?:    number;
  onClick?:      (e: ThreeEvent<MouseEvent>) => void;
  color?:        string;
  /** netId of the anode pin — supplied by Scene after BFS net analysis */
  anodeNetId?:   number | null;
  /** netId of the cathode pin */
  cathodeNetId?: number | null;
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
  selected       = false,
  transparent    = false,
  pinOffsets     = DEFAULT_PIN_OFFSETS,
  onClick,
  color          = '#ff2020',
  anodeNetId     = null,
  cathodeNetId   = null,
  rotationY      = 0,
}: LEDProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const domeRef = useRef<THREE.Mesh>(null);

  const opacity = transparent ? 0.75 : 1;
  const cathodeX = pinOffsets[1] ? pinOffsets[1][0] : 0.254;
  const cathodeSide = cathodeX >= 0 ? 1 : -1;
  const cathodeMarkerPos: Vec3 = [cathodeSide * 0.21, 0.295, 0];

  // ── Voltage-driven glow — runs every frame, no React re-renders ────────────
  useFrame(() => {
    if (!bodyRef.current || !domeRef.current) return;

    const bodyMat = bodyRef.current.material as THREE.MeshStandardMaterial;
    const domeMat = domeRef.current.material as THREE.MeshStandardMaterial;

    // Compute voltage across the LED (anode − cathode) — P1-20: bounds guard
    const va = anodeNetId   != null && anodeNetId   < MAX_NETS ? voltages[anodeNetId]   : 0;
    const vb = cathodeNetId != null && cathodeNetId < MAX_NETS ? voltages[cathodeNetId] : 0;
    const vd = va - vb;

    // Emit when forward biased above ~1.5 V, saturate at 2.5 V+
    const rawIntensity = vd > 1.5 ? Math.min(2.5, (vd - 1.5) / 0.6) : 0;

    // Selection tint overrides sim glow when selected
    if (selected) {
      bodyMat.emissive.set('#ff4040');
      bodyMat.emissiveIntensity = 0.45;
      domeMat.emissive.set('#ff4040');
      domeMat.emissiveIntensity = 0.3;
    } else {
      bodyMat.emissive.set(color);
      bodyMat.emissiveIntensity = rawIntensity;
      domeMat.emissive.set(color);
      domeMat.emissiveIntensity = rawIntensity * 0.7;
    }
  });

  return (
    <group
      position={anchorPos}
      rotation={[0, rotationY * Math.PI / 180, 0]}
      onClick={onClick}
    >
      {/* Body cylinder — 5mm LED at correct 1:1 scale (1 TU = 10 mm) */}
      <mesh ref={bodyRef} position={[0, 0.295, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.59, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.05}
          transparent={transparent}
          opacity={opacity}
        />
      </mesh>

      {/* Dome */}
      <mesh ref={domeRef} position={[0, 0.59, 0]}>
        <sphereGeometry args={[0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={transparent ? 0.65 : 0.7}
        />
      </mesh>

      {/* Cathode flat-side marker */}
      <mesh position={cathodeMarkerPos}>
        <boxGeometry args={[0.006, 0.13, 0.26]} />
        <meshStandardMaterial color="#1e1e1e" roughness={0.95} />
      </mesh>

      {/* Leads */}
      {pinOffsets.map((offset, index) => (
        <LEDPin
          key={`${anchorPos.join('-')}-${index}-${offset[0]}`}
          position={offset}
          selected={selected}
        />
      ))}

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0.65, 0]}>
          <ringGeometry args={[0.25, 0.30, 24]} />
          <meshBasicMaterial color="#fff7a0" transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}

export default memo(LED);
