'use client';

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';

// ── constants ─────────────────────────────────────────────────────────────────
export const PITCH = 0.254;       // 2.54 mm → Three.js units (1 unit = 10 mm)
export const CENTER_GAP = 0.508;  // gap between rows e and f
export const COLS = 63;
export const ROWS = 5;            // per side (a–e  and  f–j)
export const RAIL_HOLES = 25;
export const RAIL_GAP = PITCH * 2;
export const BOARD_TOP_Y = 0.15; // board is 0.30 thick, top surface at y = 0.15

// ── geometry helpers ──────────────────────────────────────────────────────────
export function rowZTop(rowIndex: number): number {
  // row 0 = a (farthest from center), row 4 = e (closest)
  return -(CENTER_GAP / 2 + (ROWS - 1 - rowIndex) * PITCH);
}
export function rowZBot(rowIndex: number): number {
  // row 0 = f (closest to center), row 4 = j (farthest)
  return CENTER_GAP / 2 + rowIndex * PITCH;
}

interface HolePos { x: number; z: number }

function buildMainHoles(): HolePos[] {
  const out: HolePos[] = [];
  for (let col = 0; col < COLS; col++) {
    const x = (col - (COLS - 1) / 2) * PITCH;
    for (let row = 0; row < ROWS; row++) {
      out.push({ x, z: rowZTop(row) }); // a-e
      out.push({ x, z: rowZBot(row) }); // f-j
    }
  }
  return out;
}

function buildRailHoles(): HolePos[] {
  const out: HolePos[] = [];
  const topAZ = rowZTop(0);
  const botJZ = rowZBot(4);
  for (let i = 0; i < RAIL_HOLES; i++) {
    const x = (i * 2 - (RAIL_HOLES - 1)) * PITCH;
    out.push({ x, z: topAZ - RAIL_GAP });           // top +
    out.push({ x, z: topAZ - RAIL_GAP - PITCH });   // top -
    out.push({ x, z: botJZ + RAIL_GAP });            // bot +
    out.push({ x, z: botJZ + RAIL_GAP + PITCH });   // bot -
  }
  return out;
}

// ── board dimensions ──────────────────────────────────────────────────────────
const BOARD_W = (COLS - 1) * PITCH + PITCH * 3;
const topAZ   = rowZTop(0);
const botJZ   = rowZBot(4);
const BOARD_D = 2 * (Math.abs(topAZ) + RAIL_GAP + PITCH + PITCH * 1.2);

// Power rail strip z-centres
const TOP_POS_Z  = topAZ - RAIL_GAP;
const TOP_NEG_Z  = topAZ - RAIL_GAP - PITCH;
const BOT_POS_Z  = botJZ + RAIL_GAP;
const BOT_NEG_Z  = botJZ + RAIL_GAP + PITCH;
const RAIL_STRIP_W = RAIL_HOLES * 2 * PITCH + PITCH * 0.5;

// ── InstancedMesh helper ──────────────────────────────────────────────────────
function applyHoleMatrices(mesh: THREE.InstancedMesh, holes: HolePos[]) {
  const dummy = new THREE.Object3D();
  dummy.rotation.x = -Math.PI / 2; // lay circle flat
  holes.forEach(({ x, z }, i) => {
    dummy.position.set(x, BOARD_TOP_Y + 0.001, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Breadboard() {
  const mainHoleRef = useRef<THREE.InstancedMesh>(null);
  const railHoleRef = useRef<THREE.InstancedMesh>(null);

  const mainHoles = useMemo(buildMainHoles, []);
  const railHoles = useMemo(buildRailHoles, []);

  useEffect(() => {
    if (mainHoleRef.current) applyHoleMatrices(mainHoleRef.current, mainHoles);
  }, [mainHoles]);

  useEffect(() => {
    if (railHoleRef.current) applyHoleMatrices(railHoleRef.current, railHoles);
  }, [railHoles]);

  return (
    <group>
      {/* ── Main board body ────────────────────────────────────────────────── */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[BOARD_W, 0.30, BOARD_D]} />
        <meshStandardMaterial color="#f2efe8" roughness={0.6} metalness={0.0} />
      </mesh>

      {/* ── Center channel groove ──────────────────────────────────────────── */}
      <mesh position={[0, BOARD_TOP_Y - 0.002, 0]}>
        <boxGeometry args={[BOARD_W - 0.3, 0.008, CENTER_GAP - 0.04]} />
        <meshStandardMaterial color="#dbd8d0" roughness={0.8} />
      </mesh>

      {/* ── Centre divider line (thin label strip on real boards) ──────────── */}
      <mesh position={[0, BOARD_TOP_Y + 0.0015, 0]}>
        <boxGeometry args={[BOARD_W - 0.4, 0.002, 0.03]} />
        <meshStandardMaterial color="#c0bcb4" roughness={0.9} />
      </mesh>

      {/* ── Power rail colour strips ────────────────────────────────────────── */}
      {(
        [
          { z: TOP_POS_Z, color: '#c41a1a' },
          { z: TOP_NEG_Z, color: '#1a3acc' },
          { z: BOT_POS_Z, color: '#c41a1a' },
          { z: BOT_NEG_Z, color: '#1a3acc' },
        ] as const
      ).map(({ z, color }) => (
        <mesh key={z} position={[0, BOARD_TOP_Y + 0.001, z]}>
          <boxGeometry args={[RAIL_STRIP_W, 0.002, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.55} />
        </mesh>
      ))}

      {/* ── Main grid holes  (630 flat circles) ────────────────────────────── */}
      <instancedMesh
        ref={mainHoleRef}
        args={[undefined, undefined, mainHoles.length]}
        renderOrder={1}
      >
        <circleGeometry args={[0.058, 10]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.4} depthWrite={false} />
      </instancedMesh>

      {/* ── Rail holes  (100 flat circles) ────────────────────────────────── */}
      <instancedMesh
        ref={railHoleRef}
        args={[undefined, undefined, railHoles.length]}
        renderOrder={1}
      >
        <circleGeometry args={[0.055, 10]} />
        <meshStandardMaterial color="#1c1c1c" roughness={0.4} depthWrite={false} />
      </instancedMesh>

      {/* ── Board edge trim ────────────────────────────────────────────────── */}
      <mesh position={[0, -0.149, 0]}>
        <boxGeometry args={[BOARD_W + 0.05, 0.004, BOARD_D + 0.05]} />
        <meshStandardMaterial color="#c8c4bc" roughness={0.8} />
      </mesh>
    </group>
  );
}
