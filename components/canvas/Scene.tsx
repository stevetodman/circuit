'use client';

import { Component, type ReactNode, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import Breadboard from './Breadboard';
import BreadboardLabels from './BreadboardLabels';
import PinGrid from './Pin';
import WireLayer from './WireLayer';
import WirePreview from './WirePreview';
import DragManager from './DragManager';
import ComponentRenderer from './parts/ComponentRenderer';
import { useCircuitStore } from '@/store/circuitStore';
import { useUIStore } from '@/store/uiStore';
import { useDragStore } from '@/store/dragStore';
import { PIN_TEMPLATES, type Vec3 } from '@/types/circuit';

const CANVAS_BG = 'linear-gradient(155deg, #f9f7ff 0%, #ede8f8 55%, #e8ecf8 100%)';
const DEFAULT_CAMERA_POSITION: Vec3 = [8, 8, 8];
const TOP_DOWN_CAMERA_POSITION: Vec3 = [0, 12, 0.01];
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const BOX_SELECT_LINE_SIZE = 3;

interface PlacedComponentView {
  id: string;
  type: keyof typeof PIN_TEMPLATES;
  anchorPos: Vec3;
  rotationY: number;
  pins: Array<{ name: string; nodeId: string }>;
  props: Record<string, number | string>;
}

interface BoxSelectState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
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

function getComponentIdFromObject(object: THREE.Object3D | null): string | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const componentId = (current as THREE.Object3D & { userData?: { componentId?: string } }).userData?.componentId;
    if (typeof componentId === 'string') return componentId;
    current = current.parent;
  }
  return null;
}

function rectFromState(rect: BoxSelectState): DOMRect {
  const left = Math.min(rect.startX, rect.endX);
  const top = Math.min(rect.startY, rect.endY);
  return new DOMRect(left, top, Math.abs(rect.endX - rect.startX), Math.abs(rect.endY - rect.startY));
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
      TOP_DOWN_CAMERA_POSITION,
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
  const fitHeight = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  const fitWidth = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) * aspect / 2));
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

function BoxSelectOverlay() {
  const boxSelectRect = useUIStore((state) => state.boxSelectRect);
  if (!boxSelectRect) return null;

  const width = Math.max(boxSelectRect.width, BOX_SELECT_LINE_SIZE);
  const height = Math.max(boxSelectRect.height, BOX_SELECT_LINE_SIZE);

  return (
    <div
      className="fixed pointer-events-none z-20"
      style={{
        left: `${boxSelectRect.left}px`,
        top: `${boxSelectRect.top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: '1px dashed rgba(90, 150, 255, 0.85)',
        background: 'rgba(90, 150, 255, 0.15)',
      }}
    />
  );
}

function SceneInteractions() {
  const { scene, camera, gl } = useThree();
  const startBoxSelect = useUIStore((state) => state.startBoxSelect);
  const updateBoxSelect = useUIStore((state) => state.updateBoxSelect);
  const clearBoxSelect = useUIStore((state) => state.clearBoxSelect);
  const setMousePos     = useUIStore((state) => state.setMousePos);
  const setSelectedComponentIds = useCircuitStore((state) => state.setSelectedComponentIds);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const point = new THREE.Vector3();

    const projectPointer = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const findComponentAtPointer = (clientX: number, clientY: number): string | null => {
      projectPointer(clientX, clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        const componentId = getComponentIdFromObject(hit.object);
        if (componentId) return componentId;
      }
      return null;
    };

    const screenContains = (worldPosition: Vec3, bounds: DOMRect, selectionRect: DOMRect): boolean => {
      point.set(worldPosition[0], worldPosition[1], worldPosition[2]).project(camera);
      if (point.z < -1 || point.z > 1) return false;
      const x = (point.x * 0.5 + 0.5) * bounds.width + bounds.left;
      const y = (-point.y * 0.5 + 0.5) * bounds.height + bounds.top;
      return x >= selectionRect.left
        && x <= selectionRect.right
        && y >= selectionRect.top
        && y <= selectionRect.bottom;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (useDragStore.getState().dragging) return;
      if (useCircuitStore.getState().wiringMode) return;
      if (event.target !== gl.domElement) return;
      if (findComponentAtPointer(event.clientX, event.clientY)) return;

      startBoxSelect(event.clientX, event.clientY);
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      setMousePos(event.clientX, event.clientY);
      if (!useUIStore.getState().boxSelect) return;
      updateBoxSelect(event.clientX, event.clientY);
      event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      const active = useUIStore.getState().boxSelect;
      if (!active) return;

      updateBoxSelect(event.clientX, event.clientY);
      const rect = rectFromState({ ...active, endX: event.clientX, endY: event.clientY });
      const canvasRect = gl.domElement.getBoundingClientRect();
      const candidates = useCircuitStore.getState().components;
      const selected: string[] = [];

      for (const [id, component] of Object.entries(candidates)) {
        if (!screenContains(component.anchorPos, canvasRect, rect)) continue;
        if (rect.width < BOX_SELECT_LINE_SIZE && rect.height < BOX_SELECT_LINE_SIZE) continue;
        selected.push(id);
      }

      // "screen-space bounding check" for marquee select
      if (selected.length > 0) {
        setSelectedComponentIds(selected);
      } else {
        setSelectedComponentIds([]);
      }
      clearBoxSelect();
    };

    gl.domElement.addEventListener('pointerdown', onPointerDown, true);
    gl.domElement.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointermove', onPointerMove);
    gl.domElement.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);
    gl.domElement.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      gl.domElement.removeEventListener('pointerdown', onPointerDown, true);
      gl.domElement.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointermove', onPointerMove);
      gl.domElement.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerup', onPointerUp);
      gl.domElement.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [camera, gl, scene, startBoxSelect, updateBoxSelect, clearBoxSelect, setMousePos, setSelectedComponentIds]);

  return null;
}

// CameraController must live inside <Canvas> so useFrame has access to the R3F context
function CameraController() {
  const doZoomToFit    = useUIStore((s) => s.zoomToFit);
  const zoomInRequested  = useUIStore((s) => s.zoomInRequested);
  const zoomOutRequested = useUIStore((s) => s.zoomOutRequested);
  const clearZoomToFit = useUIStore((s) => s.clearZoomToFit);
  const cameraPreset   = useUIStore((s) => s.cameraPreset);
  const clearCameraPreset = useUIStore((s) => s.clearCameraPreset);
  const componentsMap  = useCircuitStore((s) => s.components);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const cam = controlsRef.current.object as THREE.PerspectiveCamera;
    cam.position.lerp(controlsRef.current.target, 0.2);
    cam.updateProjectionMatrix();
  }, [zoomInRequested]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const cam = controlsRef.current.object as THREE.PerspectiveCamera;
    const dir = cam.position.clone().sub(controlsRef.current.target);
    cam.position.copy(controlsRef.current.target).addScaledVector(dir, 1.25);
    cam.updateProjectionMatrix();
  }, [zoomOutRequested]);

  useFrame((state) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const camera = state.camera as THREE.PerspectiveCamera;

    if (doZoomToFit) {
      const comps = Object.values(componentsMap) as PlacedComponentView[];
      applyZoomToFit(camera, controls, comps, camera.aspect);
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
  );
}

export default function Scene() {
  const selectedComponentId  = useCircuitStore((s) => s.selectedComponentId);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const getDesignator       = useCircuitStore((s) => s.getDesignator);
  const selectComponent     = useCircuitStore((s) => s.selectComponent);
  const setProperty         = useCircuitStore((s) => s.setProperty);
  const openContextMenu     = useUIStore((s) => s.openContextMenu);
  const toggleSelectedComponent = useCircuitStore((s) => s.toggleSelectedComponent);
  const componentsMap        = useCircuitStore((s) => s.components);
  const nodes               = useCircuitStore((s) => s.nodes);

  const components = Object.values(componentsMap) as PlacedComponentView[];

  return (
    <SceneErrorBoundary>
      <div
        className="relative h-full w-full"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Canvas
          camera={{ position: TOP_DOWN_CAMERA_POSITION, fov: 38, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          style={{ width: '100%', height: '100%', background: CANVAS_BG }}
          onCreated={({ gl }) => {
            // Allow the browser to restore a lost WebGL context rather than staying blank
            gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
          }}
        >
          <SceneInteractions />
          <CameraController />

          {/* Three-point studio lighting */}
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 16, 8]} intensity={1.8} />
          <directionalLight position={[-8, 10, -5]} intensity={0.5} color="#c0d0ff" />
          <directionalLight position={[0, 5, -12]} intensity={0.3} color="#ffe8c0" />

          {/* Scene geometry */}
          <Breadboard />
          <BreadboardLabels />
          <WireLayer />
          <WirePreview />
          <PinGrid />
          <DragManager />

          {/* Placed components */}
          {components.map((component) => {
            const pinNet = (name: string): number | null => {
              const pin = component.pins.find((p) => p.name === name);
              if (!pin) return null;
              return nodes[pin.nodeId]?.netId ?? null;
            };
            return (
              <ComponentRenderer
                key={component.id}
                componentId={component.id}
                designator={getDesignator(component.id)}
                type={component.type}
                anchorPos={component.anchorPos}
                rotationY={component.rotationY}
                pinOffsets={PIN_TEMPLATES[component.type].map((pin) => pin.offset)}
                selected={selectedComponentId === component.id || selectedComponentIds.includes(component.id)}
                anodeNetId={pinNet('anode')}
                cathodeNetId={pinNet('cathode')}
                onContextMenu={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.preventDefault();
                  event.nativeEvent.stopImmediatePropagation();
                  openContextMenu(component.id, event.nativeEvent.clientX, event.nativeEvent.clientY);
                }}
                componentProps={component.props}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.shiftKey) {
                    toggleSelectedComponent(component.id);
                    return;
                  }
                  if (component.type === 'tactileSwitch') {
                    const current = (component.props as { closed?: number }).closed ?? 0;
                    setProperty(component.id, 'closed', current === 1 ? 0 : 1);
                    selectComponent(component.id);
                    return;
                  }
                  selectComponent(selectedComponentId === component.id ? null : component.id);
                }}
              />
            );
          })}
        </Canvas>
        <BoxSelectOverlay />
      </div>
    </SceneErrorBoundary>
  );
}
