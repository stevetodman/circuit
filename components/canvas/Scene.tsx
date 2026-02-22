'use client';

import { Component, type ReactNode, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import Breadboard from './Breadboard';
import PinGrid from './Pin';
import WireLayer from './WireLayer';
import WirePreview from './WirePreview';
import DragManager from './DragManager';
import ComponentRenderer from './parts/ComponentRenderer';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { PIN_TEMPLATES, type Vec3 } from '@/types/circuit';

const CANVAS_BG = 'linear-gradient(155deg, #f9f7ff 0%, #ede8f8 55%, #e8ecf8 100%)';
const DEFAULT_CAMERA_POSITION: Vec3 = [0, 13, 11];
const TOP_DOWN_CAMERA_POSITION: Vec3 = [0, 25, 0];
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

interface PlacedComponentView {
  id: string;
  type: keyof typeof PIN_TEMPLATES;
  anchorPos: Vec3;
  rotationY: number;
  pins: Array<{ name: string; nodeId: string }>;
}

// Error boundary catches silent Three.js / R3F init failures
class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center p-8" style={{ background: CANVAS_BG }}>
          <p className="text-red-500 font-mono text-sm font-bold">3D engine failed to start</p>
          <p className="text-gray-500 font-mono text-xs max-w-md">{this.state.error.message}</p>
          <p className="text-gray-400 text-xs">Check DevTools console for details. WebGL must be enabled.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function applyCameraPreset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl,
  position: Vec3,
  target: Vec3,
) {
  controls.target.set(target[0], target[1], target[2]);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(target[0], target[1], target[2]);
  controls.update();
}

function applyZoomToFit(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl,
  components: PlacedComponentView[],
  aspect: number,
) {
  if (components.length === 0) {
    applyCameraPreset(
      camera,
      controls,
      DEFAULT_CAMERA_POSITION,
      [DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z],
    );
    return;
  }

  const bounds = new THREE.Box3();
  for (const component of components) {
    bounds.expandByPoint(new THREE.Vector3(component.anchorPos[0], component.anchorPos[1], component.anchorPos[2]));
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.z, 0.4);
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const fitWidth = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * aspect / 2);
  const distance = Math.max(8, Math.max(fitHeight, fitWidth)) * 1.35;

  const direction = new THREE.Vector3()
    .subVectors(camera.position, controls.target)
    .normalize();

  if (!Number.isFinite(direction.lengthSq()) || direction.lengthSq() < 1e-6) {
    direction.set(0.45, 0.6, 0.65).normalize();
  }

  camera.position.copy(center).add(direction.multiplyScalar(distance));
  controls.target.copy(center);
  camera.lookAt(center);
  controls.update();
}

export default function Scene() {
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectComponent     = useCircuitStore((s) => s.selectComponent);
  const components          = useCircuitStore((s) => Object.values(s.components) as PlacedComponentView[]);
  const nodes               = useCircuitStore((s) => s.nodes);
  const doZoomToFit          = useUIStore((s) => s.zoomToFit);
  const clearZoomToFit        = useUIStore((s) => s.clearZoomToFit);
  const cameraPreset         = useUIStore((s) => s.cameraPreset);
  const clearCameraPreset    = useUIStore((s) => s.clearCameraPreset);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const camera = state.camera as THREE.PerspectiveCamera;

    if (doZoomToFit) {
      applyZoomToFit(camera, controls, components, camera.aspect);
      clearZoomToFit();
      return;
    }

    if (cameraPreset === 'default') {
      applyCameraPreset(camera, controls, DEFAULT_CAMERA_POSITION, [0, 0, 0]);
      clearCameraPreset();
      return;
    }

    if (cameraPreset === 'top') {
      applyCameraPreset(camera, controls, TOP_DOWN_CAMERA_POSITION, [0, 0, 0]);
      clearCameraPreset();
      return;
    }
  });

  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 38, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%', background: CANVAS_BG }}
      >
        {/* Three-point studio lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 16, 8]} intensity={1.8} />
        <directionalLight position={[-8, 10, -5]} intensity={0.5} color="#c0d0ff" />
        <directionalLight position={[0, 5, -12]} intensity={0.3} color="#ffe8c0" />

        {/* Scene geometry */}
        <Breadboard />
        <WireLayer />
        <WirePreview />
        <PinGrid />
        <DragManager />

        {/* Placed components */}
        {components.map((component) => {
          // Resolve pin netIds for simulation-driven visuals (LED glow, etc.)
          const pinNet = (name: string): number | null => {
            const pin = component.pins.find((p) => p.name === name);
            if (!pin) return null;
            return nodes[pin.nodeId]?.netId ?? null;
          };
          return (
            <ComponentRenderer
              key={component.id}
              type={component.type}
              anchorPos={component.anchorPos}
              rotationY={component.rotationY}
              pinOffsets={PIN_TEMPLATES[component.type].map((pin) => pin.offset)}
              selected={selectedComponentId === component.id}
              anodeNetId={pinNet('anode')}
              cathodeNetId={pinNet('cathode')}
              onClick={(event) => {
                event.stopPropagation();
                selectComponent(selectedComponentId === component.id ? null : component.id);
              }}
            />
          );
        })}

        {/* Orbit camera */}
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={3}
          maxDistance={35}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 0, 0]}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </SceneErrorBoundary>
  );
}
